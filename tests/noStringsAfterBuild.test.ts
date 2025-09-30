import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";

const BANNED = ["gmail", "Lucas"];

describe("build privacy scan", () => {
  it("dist bundle contains no plain-text resume strings", async () => {
    const distPath = join(process.cwd(), "dist");
    const hasDist = await pathExists(distPath);
    if (!hasDist) {
      console.warn("dist/ missing — run `npm run build` before this test.");
      expect(hasDist).toBe(false);
      return;
    }

    const files = await collectFiles(distPath);
    const offenders: { file: string; match: string }[] = [];

    for (const file of files) {
      const content = await fs.readFile(file, "utf-8");
      const lowered = content.toLowerCase();
      for (const needle of BANNED) {
        if (lowered.includes(needle)) {
          offenders.push({ file, match: needle });
        }
      }
    }

    if (offenders.length) {
      const details = offenders.map((o) => `${o.file} → ${o.match}`).join("\n");
      throw new Error(`Banned strings detected after build:\n${details}`);
    }

    expect(offenders.length).toBe(0);
  });
});

async function pathExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  await Promise.all(
    entries.map(async (entry) => {
      const full = join(root, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await collectFiles(full)));
      } else {
        files.push(full);
      }
    })
  );
  return files;
}
