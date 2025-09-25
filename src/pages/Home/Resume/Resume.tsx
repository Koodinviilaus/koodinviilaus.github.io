import ResumeViewer from "../../../features/resume3d/viewer/ResumeViewer.tsx";
import Page from "../../../components/Page.tsx";
import { resolveResumeGLBUrl } from "../../../features/resume3d/viewer/viewerConfig.ts";

export default function Resume() {
  const glbUrl = resolveResumeGLBUrl();
  return (
    <Page>
      <ResumeViewer glbUrl={glbUrl} />
    </Page>
  );
}
