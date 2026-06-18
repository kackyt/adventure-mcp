import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// =====================================================================
//  inklecate インストールスクリプト
//  ビルド（build-ink）が使う inklecate を inkle/ink の GitHub Release から
//  取得し bin/<platform>/ に展開する。bin/ は .gitignore 済み（コミットしない）。
//
//  使い方:  pnpm --filter engine run setup:ink
//  バージョン上書き:  INKLECATE_VERSION=v1.1.1 pnpm --filter engine run setup:ink
//  再取得:  既に存在する場合はスキップ。--force で強制再取得。
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");

const VERSION = process.env.INKLECATE_VERSION ?? "v1.1.1";
const force = process.argv.includes("--force");

interface Target {
  platformDir: string; // bin/ 配下のサブディレクトリ
  asset: string; // Release のアセット名
  exe: string; // 実行ファイル名
}

function targetForPlatform(): Target | null {
  switch (process.platform) {
    case "win32":
      return { platformDir: "windows", asset: "inklecate_windows.zip", exe: "inklecate.exe" };
    case "linux":
      return { platformDir: "linux", asset: "inklecate_linux.zip", exe: "inklecate" };
    case "darwin":
      return { platformDir: "mac", asset: "inklecate_mac.zip", exe: "inklecate" };
    default:
      return null;
  }
}

function extract(zipPath: string, destDir: string): void {
  // Windows の bsdtar / Linux の unzip で展開（どちらも zip を扱える）
  const cmd =
    process.platform === "win32"
      ? { bin: "tar", args: ["-xf", zipPath, "-C", destDir] }
      : { bin: "unzip", args: ["-o", zipPath, "-d", destDir] };
  const res = spawnSync(cmd.bin, cmd.args, { stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(
      `展開に失敗しました（${cmd.bin}）。手動で ${zipPath} を ${destDir} に展開してください。`,
    );
  }
}

async function main(): Promise<void> {
  const target = targetForPlatform();
  if (!target) {
    console.error(`未対応のプラットフォームです: ${process.platform}`);
    process.exit(1);
  }

  const destDir = resolve(repoRoot, "bin", target.platformDir);
  const exePath = resolve(destDir, target.exe);
  if (existsSync(exePath) && !force) {
    console.log(`inklecate は既に存在します: ${exePath}（再取得は --force）`);
    return;
  }

  const url = `https://github.com/inkle/ink/releases/download/${VERSION}/${target.asset}`;
  console.log(`ダウンロード: ${url}`);

  let buf: Buffer;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error(`ダウンロードに失敗しました: ${(e as Error).message}`);
    console.error(`手動で ${url} を取得し、bin/${target.platformDir}/ に展開してください。`);
    process.exit(1);
  }

  mkdirSync(destDir, { recursive: true });
  const zipPath = resolve(destDir, target.asset);
  writeFileSync(zipPath, buf);
  try {
    extract(zipPath, destDir);
  } finally {
    rmSync(zipPath, { force: true });
  }

  if (process.platform !== "win32" && existsSync(exePath)) {
    spawnSync("chmod", ["+x", exePath]);
  }

  if (!existsSync(exePath)) {
    console.error(`展開後に ${exePath} が見つかりません。アセット構成が変わった可能性があります。`);
    process.exit(1);
  }
  console.log(`完了: ${exePath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
