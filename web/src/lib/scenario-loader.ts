import { EngineError } from "engine/src/browser.ts";

/** 許可するシナリオ id の文字種（snake_case）。engine の FsScenarioStorage と同一の制約。 */
const ID_PATTERN = /^[a-z0-9_]+$/;

/** バケット直下に置くシナリオ一覧インデックスのファイル名。 */
export const SCENARIO_INDEX_FILENAME = "scenarios.json";

/** `scenarios.json` の 1 エントリ。title/description は一覧表示用のメタデータ。 */
export interface ScenarioIndexEntry {
  id: string;
  title: string;
  description?: string;
}

/** `scenarios.json` 全体のスキーマ。 */
export interface ScenarioIndex {
  schemaVersion: number;
  scenarios: ScenarioIndexEntry[];
}

/**
 * シナリオ取得失敗の種別。フロントエンドはこのコードで表示メッセージを出し分ける。
 * - network_error: fetch 自体の失敗（オフライン・DNS 不達・CORS 拒否など）
 * - http_error: 2xx 以外の HTTP 応答（バケット未存在・オブジェクト未配置など）
 * - invalid_index: scenarios.json が想定スキーマではない
 * - unknown_scenario: インデックスに載っていない（または文字種が不正な）id の指定
 * - invalid_scenario_json: シナリオ本文が JSON として壊れている
 */
export type ScenarioFetchErrorCode =
  | "network_error"
  | "http_error"
  | "invalid_index"
  | "unknown_scenario"
  | "invalid_scenario_json";

/** シナリオ配信（GCS などの静的ホスティング）からの取得失敗を表す型付きエラー。 */
export class ScenarioFetchError extends EngineError {
  constructor(
    public readonly code: ScenarioFetchErrorCode,
    message: string,
    /** http_error のときの HTTP ステータスコード。 */
    public readonly status?: number,
    cause?: unknown,
  ) {
    super(message, cause);
    this.name = "ScenarioFetchError";
    Object.setPrototypeOf(this, ScenarioFetchError.prototype);
  }
}

/**
 * inkjs-compiler の出力は UTF-8 BOM 付きのことがあるため、JSON.parse が失敗しないよう除去する。
 */
function stripBom(raw: string): string {
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

/** unknown な JSON 値が ScenarioIndex の形をしているかを検証する。 */
function isScenarioIndex(value: unknown): value is ScenarioIndex {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.schemaVersion !== "number") return false;
  if (!Array.isArray(record.scenarios)) return false;
  return record.scenarios.every((entry) => {
    if (typeof entry !== "object" || entry === null) return false;
    const e = entry as Record<string, unknown>;
    return (
      typeof e.id === "string" &&
      typeof e.title === "string" &&
      (e.description === undefined || typeof e.description === "string")
    );
  });
}

/**
 * CORS 設定された静的ホスティング（GCS バケット等）から fetch でシナリオを読むローダー。
 * `ScenarioStoragePort` は同期 API のためブラウザでは実装せず、非同期の取得口を別途定義する。
 * id はインデックス（scenarios.json）のホワイトリスト＋文字種チェックの二段で検証し、
 * パス操作でバケット外・想定外オブジェクトを解決させない。
 */
export class HttpScenarioLoader {
  private readonly baseUrl: string;
  private indexPromise: Promise<ScenarioIndexEntry[]> | null = null;

  /**
   * @param baseUrl シナリオ JSON を配置したベース URL（例: `https://storage.googleapis.com/<bucket>`）
   * @param fetchFn テスト差し替え用の fetch 実装（既定はグローバル fetch）
   */
  constructor(
    baseUrl: string,
    private readonly fetchFn: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  /**
   * シナリオ一覧インデックスを取得する。結果はローダー生涯でメモ化される。
   * @throws {ScenarioFetchError} network_error / http_error / invalid_index
   */
  fetchIndex(): Promise<ScenarioIndexEntry[]> {
    this.indexPromise ??= this.loadIndex().catch((e) => {
      // 一時的な失敗をメモ化すると再試行できなくなるため、失敗時はキャッシュを破棄する
      this.indexPromise = null;
      throw e;
    });
    return this.indexPromise;
  }

  /**
   * 指定 id のコンパイル済み Ink JSON 文字列を取得する。
   * @throws {ScenarioFetchError} unknown_scenario / network_error / http_error / invalid_scenario_json
   */
  async fetchScenarioJson(id: string): Promise<string> {
    // 文字種 → インデックス membership の二段で想定外オブジェクトの取得を構造的に封じる
    if (!ID_PATTERN.test(id)) {
      throw new ScenarioFetchError("unknown_scenario", `不正なシナリオ id です: ${id}`);
    }
    const index = await this.fetchIndex();
    if (!index.some((entry) => entry.id === id)) {
      throw new ScenarioFetchError("unknown_scenario", `不明なシナリオです: ${id}`);
    }
    const text = await this.fetchText(`${id}.json`);
    const json = stripBom(text);
    try {
      JSON.parse(json);
    } catch (e) {
      throw new ScenarioFetchError(
        "invalid_scenario_json",
        `シナリオ JSON が壊れています: ${id}`,
        undefined,
        e,
      );
    }
    return json;
  }

  private async loadIndex(): Promise<ScenarioIndexEntry[]> {
    const text = await this.fetchText(SCENARIO_INDEX_FILENAME);
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripBom(text));
    } catch (e) {
      throw new ScenarioFetchError(
        "invalid_index",
        `シナリオ一覧（${SCENARIO_INDEX_FILENAME}）が JSON として壊れています。`,
        undefined,
        e,
      );
    }
    if (!isScenarioIndex(parsed)) {
      throw new ScenarioFetchError(
        "invalid_index",
        `シナリオ一覧（${SCENARIO_INDEX_FILENAME}）の形式が不正です。`,
      );
    }
    // インデックス側にも文字種制約を適用し、配信ミスの id を一覧から除外する
    return parsed.scenarios.filter((entry) => ID_PATTERN.test(entry.id));
  }

  private async fetchText(path: string): Promise<string> {
    const url = `${this.baseUrl}/${path}`;
    let response: Response;
    try {
      response = await this.fetchFn(url);
    } catch (e) {
      throw new ScenarioFetchError(
        "network_error",
        `シナリオ配信サーバーへ接続できません: ${url}`,
        undefined,
        e,
      );
    }
    if (!response.ok) {
      throw new ScenarioFetchError(
        "http_error",
        `シナリオの取得に失敗しました（HTTP ${response.status}）: ${url}`,
        response.status,
      );
    }
    return await response.text();
  }
}
