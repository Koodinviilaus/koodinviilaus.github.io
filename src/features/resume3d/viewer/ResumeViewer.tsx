import { useEffect, useRef, useState } from "react";
import { ResumeRenderer } from "./ResumeRenderer.ts";

type Props = {
  resumeGLBUrl: string;
};

export function ResumeViewer({ resumeGLBUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ResumeRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renderCalls, setRenderCalls] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new ResumeRenderer({
      canvas,
      resumeGLBUrl,
      onError: (err) => setError(err instanceof Error ? err.message : String(err)),
      onStats: (info) => setRenderCalls(info.render.calls),
    });

    rendererRef.current = renderer;
    return () => renderer.dispose();
  }, [resumeGLBUrl]);

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", touchAction: "none" }}
        aria-label="Interactive 3D resume"
      />
      {error && (
        <p style={{ position: "absolute", inset: 0, margin: 0, display: "grid", placeItems: "center", background: "rgba(16,17,20,0.8)", color: "#f8f8f8" }}>
          Failed to load GLB: {error}
        </p>
      )}
      {renderCalls !== null && import.meta.env.DEV && (
        <span
          style={{
            position: "absolute",
            bottom: 8,
            right: 12,
            padding: "4px 8px",
            background: "rgba(0,0,0,0.45)",
            color: "#fff",
            fontSize: 12,
            borderRadius: 4,
          }}
        >
          draws: {renderCalls}
        </span>
      )}
    </div>
  );
}

export default ResumeViewer;
