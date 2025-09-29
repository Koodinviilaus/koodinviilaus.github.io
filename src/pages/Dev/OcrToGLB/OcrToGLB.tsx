import { useCallback, useRef, useState } from "react";
import * as THREE from "three";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import type {
  Bbox,
  LoggerMessage,
  PSM,
  RecognizeResult,
  Worker,
} from "tesseract.js";

import Page from "../../../components/Page.tsx";
import { loadDefaultFont } from "../../../features/resume3d/fonts/defaultFont.ts";
import {
  averageColor,
  hexToRgb,
  mixRgb,
  rgbToHex,
  type RGB,
} from "../../../features/resume3d/pipeline/colorSampler.ts";
import { buildLineMesh } from "../../../features/resume3d/pipeline/buildLineMesh.ts";
import {
  createOrientedBitmap,
  readOrientation,
} from "../../../features/resume3d/pipeline/orientation.ts";
import {
  exportLinesToGLB,
  type LineMeshInput,
} from "../../../features/resume3d/pipeline/GLBExporter.ts";
import { RESUME_PIPELINE_CONFIG } from "../../../features/resume3d/config.ts";

type RecognizedLine = {
  text: string;
  bbox: Bbox;
  confidence: number;
};

type PipelineStage =
  | { stage: "idle" }
  | { stage: "loading"; detail: string }
  | { stage: "ocr"; progress: number }
  | { stage: "building" }
  | { stage: "export" }
  | { stage: "done"; blob: Blob };

type DevWindow = Window & {
  __DEV_RESUME_GLB_URL?: string;
  __DEV_RESUME_GLB_BLOB?: Blob;
};

type ProgressCb = (progress: number) => void;
type TesseractModule = typeof import("tesseract.js");

const DEFAULT_IMAGE_PATH = "/.local/dev-resume.png";
const OCR_LANG = "eng";
const ROTATE_AUTO = true;
type LifecycleWorker = Worker & {
  loadLanguage?: (langs: string | string[]) => Promise<unknown>;
  initialize?: (langs: string | string[], oem?: unknown) => Promise<unknown>;
};

async function recognizeLines(
  canvas: HTMLCanvasElement,
  onProgress: ProgressCb,
): Promise<RecognizedLine[]> {
  const tesseract: TesseractModule = await import("tesseract.js");
  const worker = (await tesseract.createWorker(
    undefined,
    undefined,
    {
      logger: ({ status, progress }: LoggerMessage) => {
        if (status === "recognizing text") onProgress(progress);
      },
    },
  )) as LifecycleWorker;

  const fallbackSegMode = "3" as unknown as PSM;
  const pageSegMode: PSM =
    tesseract.PSM?.AUTO_OSD ??
    tesseract.PSM?.AUTO ??
    tesseract.PSM?.AUTO_ONLY ??
    fallbackSegMode;

  try {
    await worker.load();
    if (typeof worker.loadLanguage === "function") {
      await worker.loadLanguage(OCR_LANG);
    }
    if (typeof worker.initialize === "function") {
      await worker.initialize(OCR_LANG, tesseract.OEM?.LSTM_ONLY);
    } else {
      await worker.reinitialize?.(OCR_LANG, tesseract.OEM?.LSTM_ONLY);
    }
    await worker.setParameters({
      tessedit_pageseg_mode: pageSegMode,
      preserve_interword_spaces: "1",
      tessedit_char_whitelist:
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-:/,.()&' \n",
    });

    const { data }: RecognizeResult = await worker.recognize(canvas, {
      rotateAuto: ROTATE_AUTO,
    });

    return (data.lines ?? [])
      .filter((line) => line.text.trim().length > 0)
      .map((line) => ({
        text: line.text,
        bbox: line.bbox as Bbox,
        confidence: Math.round(line.confidence ?? 0),
      }));
  } finally {
    await worker.terminate();
  }
}

function createPaper(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const pixelToWorld = RESUME_PIPELINE_CONFIG.planeWidth / Math.max(1, width);
  const planeHeight = height * pixelToWorld;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true;
  texture.anisotropy = 4;

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    metalness: 0.08,
    roughness: 0.92,
  });
  material.name = "ResumePaperMaterial";

  const geometry = new THREE.PlaneGeometry(
    RESUME_PIPELINE_CONFIG.planeWidth * RESUME_PIPELINE_CONFIG.planePaddingRatio,
    planeHeight * RESUME_PIPELINE_CONFIG.planePaddingRatio,
  );

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "ResumePaper";
  mesh.userData.paperTexture = true;

  return { mesh, pixelToWorld };
}

function buildLineMeshes(
  lines: RecognizedLine[],
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  font: Font,
  pixelToWorld: number,
): LineMeshInput[] {
  const lowConfidence = RESUME_PIPELINE_CONFIG.lowConfidence;
  const fallbackRgb = hexToRgb(lowConfidence.fallbackColor);
  return lines.map((line) => {
    const rect = {
      x: line.bbox.x0,
      y: line.bbox.y0,
      width: line.bbox.x1 - line.bbox.x0,
      height: line.bbox.y1 - line.bbox.y0,
    };

    let color = averageColor(ctx, rect) as RGB;
    const mesh = buildLineMesh(
      {
        text: line.text,
        bounds: {
          left: rect.x,
          right: rect.x + rect.width,
          top: rect.y,
          bottom: rect.y + rect.height,
        },
      },
      {
        font,
        imageWidth,
        imageHeight,
        scale: pixelToWorld,
        fontSize: RESUME_PIPELINE_CONFIG.fontSize,
        depth: RESUME_PIPELINE_CONFIG.lineExtrudeDepth,
        curveSegments: RESUME_PIPELINE_CONFIG.curveSegments,
        zOffset: RESUME_PIPELINE_CONFIG.lineLift,
        depthScaleMultiplier: RESUME_PIPELINE_CONFIG.depthScaleMultiplier,
      },
    );

    mesh.userData.confidence = line.confidence;

    if (line.confidence < lowConfidence.threshold) {
      color = mixRgb(color, fallbackRgb, lowConfidence.colorBlend);
      mesh.scale.z *= lowConfidence.depthBoost;
      mesh.userData.lowConfidence = true;
    }

    mesh.position.z = RESUME_PIPELINE_CONFIG.lineLift;

    return { mesh, color } satisfies LineMeshInput;
  });
}

function revokeIfPresent(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}

export default function OcrToGLB() {
  const [lines, setLines] = useState<RecognizedLine[]>([]);
  const [stage, setStage] = useState<PipelineStage>({ stage: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const downloadUrlRef = useRef<string | null>(null);

  const resetDownloadUrl = useCallback(() => {
    if (!downloadUrlRef.current) return;

    if (import.meta.env.DEV) {
      const devWindow = window as DevWindow;
      if (devWindow.__DEV_RESUME_GLB_URL === downloadUrlRef.current) {
        delete devWindow.__DEV_RESUME_GLB_URL;
        delete devWindow.__DEV_RESUME_GLB_BLOB;
      }
    }

    revokeIfPresent(downloadUrlRef.current);
    downloadUrlRef.current = null;
    setDownloadUrl(null);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      resetDownloadUrl();
      setError(null);
      setLines([]);
      setStage({ stage: "loading", detail: file.name });

      try {
        const orientation = await readOrientation(file);
        const { canvas, width, height } = await createOrientedBitmap(
          file,
          orientation,
        );
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("2D context unavailable");

        setStage({ stage: "ocr", progress: 0 });
        const recognisedLines = await recognizeLines(canvas, (progress) =>
          setStage({ stage: "ocr", progress }),
        );
        setLines(recognisedLines);

        setStage({ stage: "building" });
        const font = await loadDefaultFont();
        const { mesh: paper, pixelToWorld } = createPaper(
          canvas,
          width,
          height,
        );

        const backgroundRGB = averageColor(ctx, {
          x: 0,
          y: 0,
          width,
          height,
        });

        const lineMeshes = buildLineMeshes(
          recognisedLines,
          ctx,
          width,
          height,
          font,
          pixelToWorld,
        );

        const meshInputs: LineMeshInput[] = [
          { mesh: paper, preserveMaterial: true },
          ...lineMeshes,
        ];

        setStage({ stage: "export" });
        const blob = await exportLinesToGLB(meshInputs, {
          binary: true,
          backgroundColor: rgbToHex(backgroundRGB),
        });

        const objectUrl = URL.createObjectURL(blob);
        downloadUrlRef.current = objectUrl;
        setDownloadUrl(objectUrl);

        if (import.meta.env.DEV) {
          const devWindow = window as DevWindow;
          revokeIfPresent(devWindow.__DEV_RESUME_GLB_URL ?? null);
          devWindow.__DEV_RESUME_GLB_BLOB = blob;
          devWindow.__DEV_RESUME_GLB_URL = objectUrl;
        }

        setStage({ stage: "done", blob });
      } catch (err) {
        resetDownloadUrl();
        console.error(err);
        setError(err instanceof Error ? err.message : String(err));
        setStage({ stage: "idle" });
      }
    },
    [resetDownloadUrl],
  );

  const triggerDefault = useCallback(async () => {
    try {
      setStage({ stage: "loading", detail: "default" });
      const response = await fetch(DEFAULT_IMAGE_PATH);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${DEFAULT_IMAGE_PATH}`);
      }
      const blob = await response.blob();
      await handleFile(new File([blob], "dev-resume.png", { type: blob.type }));
    } catch (err) {
      resetDownloadUrl();
      setError(err instanceof Error ? err.message : String(err));
      setStage({ stage: "idle" });
    }
  }, [handleFile, resetDownloadUrl]);

  const openInViewer = useCallback(() => {
    if (!downloadUrl) return;
    window.location.hash = "#/resume";
  }, [downloadUrl]);

  return (
    <Page>
      <h1>Image → OCR → 3D text → GLB</h1>
      <p>This dev-only workflow turns a résumé snapshot into geometry.</p>
      <div
        style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span>Select PNG/JPG</span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file).catch(console.error);
            }}
          />
        </label>
        <button type="button" onClick={() => triggerDefault().catch(console.error)}>
          Use /.local/dev-resume.png
        </button>
        {downloadUrl && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a href={downloadUrl} download="resume.glb">
              Download GLB
            </a>
            <button type="button" onClick={openInViewer}>
              Open in resume view
            </button>
          </div>
        )}
      </div>

      {error && <p style={{ color: "#c33" }}>Error: {error}</p>}

      <StageInfo stage={stage} />

      {lines.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2>Recognized lines ({lines.length})</h2>
          <ol>
            {lines.map((line, index) => (
              <li key={`${index}-${line.bbox.x0}-${line.bbox.y0}`}>
                <code>{line.text}</code> (confidence {line.confidence}%)
              </li>
            ))}
          </ol>
        </section>
      )}
    </Page>
  );
}

function StageInfo({ stage }: { stage: PipelineStage }) {
  if (stage.stage === "idle") return <p>Waiting for an image…</p>;
  if (stage.stage === "loading") return <p>Loading {stage.detail}…</p>;
  if (stage.stage === "ocr") {
    return <p>OCR in progress: {Math.round(stage.progress * 100)}%</p>;
  }
  if (stage.stage === "building") return <p>Building meshes…</p>;
  if (stage.stage === "export") return <p>Exporting GLB…</p>;
  if (stage.stage === "done") {
    return <p>Export ready — download or open above.</p>;
  }
  return null;
}
