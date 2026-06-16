import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// =====================================================================
//  Ink ビルドスクリプト（inklecate ベース）
//  各 .ink を inklecate でコンパイルし、同時に issues（ERROR/TODO/WARNING）を
//  検出して表示し、stats（語数・ノット数・選択肢数など）をレポートする。
//   - ERROR またはコンパイル失敗があればプロセスを 1 で終了する。
//   - inklecate は同梱の bin/<platform>/ を使う（Windows: .exe / Linux: 実行ファイル）。
// =====================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const assetsDir = resolve(__dirname, "../assets");
const repoRoot = resolve(__dirname, "../..");

function resolveInklecate(): string {
  const platform = process.platform;
  const candidate =
    platform === "win32"
      ? resolve(repoRoot, "bin/windows/inklecate.exe")
      : platform === "linux"
        ? resolve(repoRoot, "bin/linux/inklecate")
        : "";
  if (!candidate || !existsSync(candidate)) {
    console.error(
      `inklecate が見つかりません（platform=${platform}）。bin/<windows|linux>/ を確認してください。`,
    );
    process.exit(1);
  }
  return candidate;
}

function findInkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  let results: string[] = [];
  for (const file of readdirSync(dir)) {
    const filePath = join(dir, file);
    if (statSync(filePath)?.isDirectory()) {
      results = results.concat(findInkFiles(filePath));
    } else if (file.endsWith(".ink")) {
      results.push(filePath);
    }
  }
  return results;
}

/** 連結された複数のトップレベル JSON オブジェクトを文字列から取り出す。 */
function extractJsonObjects(s: string): unknown[] {
  const objs: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
    } else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start >= 0) {
          try {
            objs.push(JSON.parse(s.slice(start, i + 1)));
          } catch {
            // 不完全な断片は無視
          }
          start = -1;
        }
      }
    }
  }
  return objs;
}

interface Stats {
  words: number;
  knots: number;
  choices: number;
  diverts: number;
}

function runStats(bin: string, inkFile: string): Stats | null {
  const res = spawnSync(bin, ["-j", "-s", "-c", inkFile], { encoding: "utf-8" });
  for (const obj of extractJsonObjects(`${res.stdout ?? ""}${res.stderr ?? ""}`)) {
    if (obj && typeof obj === "object" && "stats" in obj) {
      return (obj as { stats: Stats }).stats;
    }
  }
  return null;
}

function main(): void {
  const bin = resolveInklecate();
  const inkFiles = findInkFiles(assetsDir);
  if (inkFiles.length === 0) {
    console.log("No .ink files found in assets directory.");
    return;
  }

  let hasError = false;
  const statsRows: { name: string; stats: Stats | null }[] = [];

  for (const file of inkFiles) {
    const targetJson = file.replace(/\.ink$/, ".json");
    const res = spawnSync(bin, ["-j", "-c", "-o", targetJson, file], { encoding: "utf-8" });
    const output = `${res.stdout ?? ""}${res.stderr ?? ""}`;
    const objs = extractJsonObjects(output);

    let compileSuccess = res.status === 0;
    let issues: string[] = [];
    for (const obj of objs) {
      if (obj && typeof obj === "object") {
        if ("compile-success" in obj)
          compileSuccess = Boolean((obj as Record<string, unknown>)["compile-success"]);
        if ("issues" in obj && Array.isArray((obj as Record<string, unknown>).issues)) {
          issues = (obj as { issues: string[] }).issues;
        }
      }
    }

    const errors = issues.filter((m) => m.startsWith("ERROR"));
    const warnings = issues.filter((m) => !m.startsWith("ERROR"));

    if (!compileSuccess || res.status !== 0 || errors.length > 0) {
      hasError = true;
      console.error(`✗ ${file}`);
      for (const m of errors.length > 0 ? errors : [output.trim() || "compile failed"]) {
        console.error(`    ${m}`);
      }
    } else {
      console.log(`✓ ${targetJson}`);
    }
    for (const w of warnings) {
      console.warn(`  ! ${w}`);
    }

    if (compileSuccess) {
      statsRows.push({
        name: file.replace(`${assetsDir}/`, "").replace(/\\/g, "/"),
        stats: runStats(bin, file),
      });
    }
  }

  if (statsRows.length > 0) {
    console.log("\nstats (words / knots / choices / diverts):");
    for (const { name, stats } of statsRows) {
      const base = name.split("/").pop() ?? name;
      if (stats) {
        console.log(
          `  ${base.padEnd(28)} ${stats.words}w  ${stats.knots}k  ${stats.choices}c  ${stats.diverts}d`,
        );
      } else {
        console.log(`  ${base.padEnd(28)} (stats なし)`);
      }
    }
  }

  if (hasError) {
    process.exit(1);
  }
}

main();
