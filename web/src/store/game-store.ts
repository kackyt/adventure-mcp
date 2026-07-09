import {
  GameSession,
  type SaveEnvelope,
  ScenarioEngine,
  SessionError,
  type Snapshot,
  type Turn,
} from "engine/src/browser.ts";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { ScenarioIndexEntry } from "../lib/scenario-loader.ts";
import { decodeWebSave, encodeWebSave } from "../lib/web-save-codec.ts";

/** localStorage の自動セーブキーの接頭辞。 */
export const AUTOSAVE_KEY_PREFIX = "advmcp:autosave:";

/** ストアが必要とするシナリオ取得口（HttpScenarioLoader が満たす。テストではフェイクを注入）。 */
export interface ScenarioSource {
  fetchIndex(): Promise<ScenarioIndexEntry[]>;
  fetchScenarioJson(id: string): Promise<string>;
}

/** 自動セーブの保存先（window.localStorage が満たす。テストではインメモリを注入）。 */
export interface SaveStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface GameStoreDeps {
  loader: ScenarioSource;
  storage: SaveStore;
  /** セーブ日時の供給源（テスト用に差し替え可能）。 */
  now?: () => Date;
}

export interface GameStoreState {
  /** 画面フェーズ。list = シナリオ一覧、playing = プレイ中。 */
  phase: "list" | "playing";
  /** 取得済みシナリオ一覧（未取得なら null）。 */
  scenarios: ScenarioIndexEntry[] | null;
  scenariosLoading: boolean;
  scenarioId: string | null;
  scenarioTitle: string | null;
  snapshot: Snapshot | null;
  /** 行動履歴（過去ターンの本文と選んだ行動）。 */
  turns: Turn[];
  /** シナリオ読込などの非同期処理中フラグ（操作ボタンの二度押し防止）。 */
  busy: boolean;
  /** 利用者へ表示するエラー文言（null なら非表示）。 */
  error: string | null;

  loadScenarios(): Promise<void>;
  hasAutoSave(scenarioId: string): boolean;
  startGame(scenarioId: string): Promise<void>;
  /** localStorage の自動セーブから「続きから」を再開する。 */
  resumeGame(scenarioId: string): Promise<void>;
  choose(index: number): void;
  submitInput(value: string): void;
  /** 現在の進行状況をセーブ文字列としてエクスポートする。 */
  exportSave(): string;
  /** エクスポートしたセーブ文字列から再開する。 */
  importSave(text: string): Promise<void>;
  backToList(): void;
  clearError(): void;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * ゲーム進行ストアを生成する。GameSession/ScenarioEngine の実体は React の状態には載せず、
 * このファクトリのクロージャに閉じ込める（外へはスナップショットと履歴のみを公開する）。
 */
export function createGameStore(deps: GameStoreDeps): StoreApi<GameStoreState> {
  const now = deps.now ?? (() => new Date());
  let session: GameSession | null = null;

  return createStore<GameStoreState>()((set, get) => {
    /** 現在のセッションからセーブエンベロープを組み立てる。 */
    function buildEnvelope(scenarioId: string, current: GameSession): SaveEnvelope {
      return {
        saveId: "autosave",
        scenarioId,
        savedAt: now().toISOString(),
        schemaVersion: 1,
        session: current.serialize(),
      };
    }

    /** 毎ターンの自動セーブ。保存失敗（容量超過等）でゲーム進行は止めない。 */
    function autoSave(scenarioId: string, current: GameSession): void {
      try {
        deps.storage.setItem(
          AUTOSAVE_KEY_PREFIX + scenarioId,
          encodeWebSave(buildEnvelope(scenarioId, current)),
        );
      } catch {
        // localStorage が使えない環境でもプレイ自体は継続できるようにする
      }
    }

    /** セッション確定後の共通状態反映。 */
    function reflect(scenarioId: string, title: string, current: GameSession): void {
      session = current;
      autoSave(scenarioId, current);
      set({
        phase: "playing",
        scenarioId,
        scenarioTitle: title,
        snapshot: current.getSituation(),
        turns: current.getHistory().turns,
        busy: false,
        error: null,
      });
    }

    function titleOf(scenarioId: string): string {
      const entry = get().scenarios?.find((s) => s.id === scenarioId);
      return entry?.title ?? scenarioId;
    }

    /** エンベロープからセッションを復元して状態へ反映する（resume/import 共通）。 */
    async function restoreFromEnvelope(envelope: SaveEnvelope): Promise<void> {
      const json = await deps.loader.fetchScenarioJson(envelope.scenarioId);
      const restored = GameSession.restore(new ScenarioEngine(json), envelope.session);
      reflect(envelope.scenarioId, titleOf(envelope.scenarioId), restored);
    }

    return {
      phase: "list",
      scenarios: null,
      scenariosLoading: false,
      scenarioId: null,
      scenarioTitle: null,
      snapshot: null,
      turns: [],
      busy: false,
      error: null,

      async loadScenarios() {
        if (get().scenariosLoading) return;
        set({ scenariosLoading: true, error: null });
        try {
          const scenarios = await deps.loader.fetchIndex();
          set({ scenarios, scenariosLoading: false });
        } catch (e) {
          set({
            scenarios: get().scenarios ?? [],
            scenariosLoading: false,
            error: errorMessage(e),
          });
        }
      },

      hasAutoSave(scenarioId) {
        return deps.storage.getItem(AUTOSAVE_KEY_PREFIX + scenarioId) !== null;
      },

      async startGame(scenarioId) {
        if (get().busy) return;
        set({ busy: true, error: null });
        try {
          const json = await deps.loader.fetchScenarioJson(scenarioId);
          reflect(scenarioId, titleOf(scenarioId), new GameSession(new ScenarioEngine(json)));
        } catch (e) {
          set({ busy: false, error: errorMessage(e) });
        }
      },

      async resumeGame(scenarioId) {
        if (get().busy) return;
        const saved = deps.storage.getItem(AUTOSAVE_KEY_PREFIX + scenarioId);
        if (saved === null) {
          set({ error: "このシナリオのセーブデータが見つかりません。" });
          return;
        }
        set({ busy: true, error: null });
        try {
          await restoreFromEnvelope(decodeWebSave(saved));
        } catch (e) {
          set({ busy: false, error: errorMessage(e) });
        }
      },

      choose(index) {
        const { scenarioId } = get();
        if (!session || scenarioId === null) return;
        try {
          const snapshot = session.choose(index);
          autoSave(scenarioId, session);
          set({ snapshot, turns: session.getHistory().turns, error: null });
        } catch (e) {
          if (e instanceof SessionError) {
            set({ error: e.message });
            return;
          }
          throw e;
        }
      },

      submitInput(value) {
        const { scenarioId } = get();
        if (!session || scenarioId === null) return;
        try {
          const snapshot = session.submitInput(value);
          autoSave(scenarioId, session);
          set({ snapshot, turns: session.getHistory().turns, error: null });
        } catch (e) {
          if (e instanceof SessionError) {
            set({ error: e.message });
            return;
          }
          throw e;
        }
      },

      exportSave() {
        const { scenarioId } = get();
        if (!session || scenarioId === null) {
          throw new Error("プレイ中のゲームがないため、セーブデータを書き出せません。");
        }
        return encodeWebSave(buildEnvelope(scenarioId, session));
      },

      async importSave(text) {
        if (get().busy) return;
        set({ busy: true, error: null });
        try {
          await restoreFromEnvelope(decodeWebSave(text));
        } catch (e) {
          set({ busy: false, error: errorMessage(e) });
        }
      },

      backToList() {
        session = null;
        set({
          phase: "list",
          scenarioId: null,
          scenarioTitle: null,
          snapshot: null,
          turns: [],
          error: null,
        });
      },

      clearError() {
        set({ error: null });
      },
    };
  });
}
