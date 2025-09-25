import { useCallback, useRef, useState } from "react";
import { loadDefaultFont } from "../../../features/resume3d/fonts/defaultFont.ts";
import {
  averageColor,
  type RGB,
} from "../../../features/resume3d/pipeline/colorSampler.ts";
import { buildLineMesh } from "../../../features/resume3d/pipeline/buildLineMesh.ts";
import {
  exportLinesToGLB,
  type LineMeshInput,
} from "../../../features/resume3d/pipeline/GLBExporter.ts";
import {
  createOrientedBitmap,
  readOrientation,
} from "../../../features/resume3d/pipeline/orientation.ts";
import Page from "../../../components/Page.tsx";
import { RESUME_PIPELINE_CONFIG } from "../../../features/resume3d/config.ts";

type RecognizedLine = {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
};

type PipelineStage =
  | { stage: "idle" }
  | { stage: "loading"; detail: string }
  | { stage: "ocr"; progress: number }
  | { stage: "building" }
  | { stage: "export" }
  | { stage: "done"; blob: Blob };

const DEFAULT_IMAGE_PATH = "/.local/dev-resume.png";

type DevWindow = Window & {
  __DEV_RESUME_GLB_URL?: string;
  __DEV_RESUME_GLB_BLOB?: Blob;
};

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

    URL.revokeObjectURL(downloadUrlRef.current);
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
        const { recognize } = await import("tesseract.js");
        const orientation = await readOrientation(file);
        const { canvas, width, height } = await createOrientedBitmap(
          file,
          orientation
        );
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("2D context unavailable");

        setStage({ stage: "ocr", progress: 0 });
        const result = await recognize(canvas, "eng", {
          logger: ({ progress, status }) => {
            if (status === "recognizing text") {
              setStage({ stage: "ocr", progress });
            }
          },
        });

        const recognized: RecognizedLine[] = (result.data.lines ?? [])
          .filter((line) => line.text.trim().length > 0)
          .map((line) => ({
            text: line.text,
            bbox: line.bbox,
            confidence: line.confidence ?? 0,
          }));

        setLines(recognized);

        setStage({ stage: "building" });
        const font = await loadDefaultFont();
        const safePlaneWidth =
          RESUME_PIPELINE_CONFIG.planeWidth /
          RESUME_PIPELINE_CONFIG.planePaddingRatio;
        const pixelToWorld = safePlaneWidth / Math.max(1, width);
        const zOffsetStep = RESUME_PIPELINE_CONFIG.zFightingOffset;

        const lineMeshes: LineMeshInput[] = recognized.map((line, index) => {
          const bounds = line.bbox;
          const rect = {
            x: bounds.x0,
            y: bounds.y0,
            width: bounds.x1 - bounds.x0,
            height: bounds.y1 - bounds.y0,
          };
          const color = averageColor(ctx, rect) as RGB;
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
              imageWidth: width,
              imageHeight: height,
              scale: pixelToWorld,
              fontSize: RESUME_PIPELINE_CONFIG.fontSize,
              depth: RESUME_PIPELINE_CONFIG.lineExtrudeDepth,
              curveSegments: RESUME_PIPELINE_CONFIG.curveSegments,
              zOffset: index * zOffsetStep,
              depthScaleMultiplier: RESUME_PIPELINE_CONFIG.depthScaleMultiplier,
            }
          );
          return {
            mesh,
            color,
          };
        });

        setStage({ stage: "export" });
        const blob = await exportLinesToGLB(lineMeshes, { binary: true });

        const objectUrl = URL.createObjectURL(blob);
        downloadUrlRef.current = objectUrl;
        setDownloadUrl(objectUrl);

        if (import.meta.env.DEV) {
          const devWindow = window as DevWindow;
          if (
            devWindow.__DEV_RESUME_GLB_URL &&
            devWindow.__DEV_RESUME_GLB_URL !== objectUrl
          ) {
            URL.revokeObjectURL(devWindow.__DEV_RESUME_GLB_URL);
          }
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
    [resetDownloadUrl]
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
      <p>
        This tool stays in dev builds; use it to convert a résumé snapshot into
        geometry.
      </p>
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
        <button
          type="button"
          onClick={() => triggerDefault().catch(console.error)}
        >
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
                <code>{line.text}</code> Confidence: (
                {Math.round(line.confidence)}%)
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
