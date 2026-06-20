import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ScenarioStoragePort } from "../application/ports/scenario-storage-port.ts";
import { EngineError } from "../shared/errors/engine-error.ts";

/** 許可するシナリオ id の文字種（snake_case）。 */
const ID_PATTERN = /^[a-z0-9_]+$/;

/** engine パッケージ基準の既定 assets ディレクトリ（CWD に依存しない）。 */
function defaultAssetsDir(): string {
  // このファイルは engine/src/infrastructure/ にあるため ../../assets = engine/assets
  return resolve(import.meta.dirname, "../../assets");
}

/**
 * inkjs-compiler の出力は UTF-8 BOM 付きのことがあるため、JSON.parse が失敗しないよう除去する。
 * シナリオ JSON のファイル読み込みはこの 1 箇所に集約する。
 */
function stripBom(raw: string): string {
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

/**
 * `engine/assets/` 配下のコンパイル済みシナリオ（.json）を読む fs アダプタ。
 * id は列挙済みホワイトリスト＋文字種チェックの二段で検証し、`/`・`..`・絶対パス等で
 * assets 外を解決させない。
 */
export class FsScenarioStorage implements ScenarioStoragePort {
  constructor(private readonly assetsDir: string = defaultAssetsDir()) {}

  listScenarioIds(): string[] {
    try {
      return readdirSync(this.assetsDir)
        .filter((name) => name.endsWith(".json"))
        .map((name) => name.slice(0, -".json".length))
        .filter((id) => ID_PATTERN.test(id))
        .sort();
    } catch (e) {
      throw new EngineError("Failed to list scenario ids", e);
    }
  }

  loadScenarioJson(id: string): string {
    // 文字種 → ホワイトリスト membership の二段で assets 外解決を構造的に封じる
    if (!ID_PATTERN.test(id) || !this.listScenarioIds().includes(id)) {
      throw new EngineError(`Unknown or invalid scenario id: ${id}`);
    }
    try {
      const raw = readFileSync(resolve(this.assetsDir, `${id}.json`), "utf-8");
      return stripBom(raw);
    } catch (e) {
      throw new EngineError(`Failed to load scenario json: ${id}`, e);
    }
  }
}

/**
 * 任意パスのコンパイル済み Ink JSON を読む（CLI のデバッグ用途）。
 * BOM 除去をアダプタと共通化するためのユーティリティ。
 */
export function readStoryJsonFromPath(path: string): string {
  const raw = readFileSync(path, "utf-8");
  return stripBom(raw);
}
