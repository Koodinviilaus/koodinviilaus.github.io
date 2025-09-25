import Page from "../../components/Page.tsx";
import ResumeViewer from "../../features/resume3d/viewer/ResumeViewer.tsx";
import { resolveResumeGLBUrl } from "../../features/resume3d/viewer/viewerConfig.ts";

export default function Home() {
  const glbUrl = resolveResumeGLBUrl();
  return (
    <Page>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 8px" }}>3D Resume</h1>
        <p style={{ margin: 0 }}>
          Drag to rotate, pinch or wheel to zoom. All résumé data lives inside
          the GLB geometry.
        </p>
      </header>
      <ResumeViewer glbUrl={glbUrl} />
    </Page>
  );
}
