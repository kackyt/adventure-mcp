import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(srcDir, "..");

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("アンチチート: mcp-server は engine 公開 API のみ使用する", () => {
  it("src 配下のどのファイルも inkjs を直接 import しない", () => {
    const offenders = collectTsFiles(srcDir).filter((file) =>
      /from\s+["']inkjs/.test(readFileSync(file, "utf-8")),
    );
    expect(offenders).toEqual([]);
  });

  it("package.json は inkjs を依存に宣言しない（import 解決を構造的に不能にする）", () => {
    const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(deps)).not.toContain("inkjs");
  });
});
