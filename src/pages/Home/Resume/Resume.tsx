import ResumeViewer from "../../../features/resume3d/viewer/ResumeViewer.tsx";
import Page from "../../../components/Page.tsx";
import { resolveResumeGlbUrl } from "../../../features/resume3d/viewer/viewerConfig.ts";

export default function Resume() {
  const glbUrl = resolveResumeGlbUrl();
  return (
    <Page>
      <ResumeViewer glbUrl={glbUrl} />
    </Page>
  );
}
