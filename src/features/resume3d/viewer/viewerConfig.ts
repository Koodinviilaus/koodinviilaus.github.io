const DEFAULT_URL = "/resume.glb";

type DevWindow = Window & {
  __DEV_RESUME_GLB_URL?: string;
};

export function resolveResumeGLBUrl(): string {
  if (import.meta.env.DEV) {
    const devWindow = window as DevWindow;
    if (devWindow.__DEV_RESUME_GLB_URL) {
      return devWindow.__DEV_RESUME_GLB_URL;
    }
  }

  const envUrl = import.meta.env.VITE_RESUME_GLB_URL as string | undefined;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl;
  }
  return DEFAULT_URL;
}
