import ResumeViewer from "../../../features/resume3d/viewer/ResumeViewer.tsx";
import Page from "../../../components/Page.tsx";
import { resolveResumeGLBUrl } from "../../../features/resume3d/viewer/viewerConfig.ts";

export default function Resume() {
  const resumeGLBUrl = resolveResumeGLBUrl();
  return (
    <Page>
      <ResumeViewer resumeGLBUrl={resumeGLBUrl} />
    </Page>
  );
}
