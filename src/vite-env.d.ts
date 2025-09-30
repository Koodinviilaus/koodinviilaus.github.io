/// <reference types="vite/client" />

declare module "*.json?url" {
  const url: string;
  export default url;
}

declare module "*.json?raw" {
  const raw: string;
  export default raw;
}

interface ImportMetaEnv {
  readonly VITE_RESUME_GLB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    __DEV_RESUME_GLB_URL?: string;
    __DEV_RESUME_GLB_BLOB?: Blob;
  }
}

export {};
