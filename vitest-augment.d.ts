import type { UserConfig as VitestUserConfig } from "vitest/config";
import "vite";

declare module "vite" {
  interface UserConfig {
    test?: VitestUserConfig["test"];
  }

  interface UserConfigExport {
    test?: VitestUserConfig["test"];
  }
}
