const DEFAULT_URL = "/resume.glb";

export function resolveResumeGLBUrl(): string {
  const envUrl = import.meta.env.VITE_RESUME_GLB_URL as string | undefined;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl;
  }
  return DEFAULT_URL;
}
