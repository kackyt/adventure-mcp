import type { Choice } from "../../domain/services/scenario-engine.ts";
import { SessionError } from "../../shared/errors/session-error.ts";
import type { GameSessionState, Snapshot, Turn } from "../dtos/game-dtos.ts";

/**
 * {@link GameSession} が依存するシナリオエンジンの操作面。
 * `domain` の `ScenarioEngine` が構造的に満たす。具象から切り離すことで、
 * CLI/engine 双方のユニットテストでフェイクを差し込める。
 */
export interface PlayableEngine {
  canContinue(): boolean;
  continue(): string;
  readonly currentChoices: Choice[];
  chooseChoiceIndex(index: number): void;
  getVariable(name: string): unknown;
  setVariable(name: string, value: unknown): void;
  getVariables(): Record<string, unknown>;
  getPublicVariables(): Record<string, unknown>;
  getState(): string;
  loadState(json: string): void;
}

/** CLI デバッグ専用の生変数アクセサ（mcp-server からは到達させない）。 */
export interface DebugAccessor {
  getVariable(name: string): unknown;
  setVariable(name: string, value: unknown): void;
  getVariables(): Record<string, unknown>;
}

/**
 * 選択肢ラベルの照合用正規化。NFKC → 角括弧/引用符除去 → 空白圧縮 → トリム → 小文字化。
 * `expectedText` による誤選択防止（完全一致 or 部分文字列包含）の前処理に使う。
 */
export function normalizeChoiceLabel(label: string): string {
  return label
    .normalize("NFKC")
    .replace(/[[\]()<>「」『』【】（）〈〉《》"'“”‘’`]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

/**
 * 1 ゲーム分の進行状態を保持する集約。CLI（単一）と mcp-server の SessionManager
 * （複数）の双方で共用される「前進プリミティブ」。状態遷移は Ink に一任し、外部へは
 * 公開スナップショットと履歴のみを出す。
 */
export class GameSession {
  private readonly history: Turn[] = [];
  private currentScene = "";
  private choices: Choice[] = [];
  /** 提示順 index → Ink の生 choice index の対応表。 */
  private inkChoiceIndices: number[] = [];
  private ended = false;
  private turnCounter = 0;

  constructor(private readonly engine: PlayableEngine) {
    this.advance();
  }

  /** 現在状況のスナップショット（状態は進めない）。 */
  getSituation(): Snapshot {
    return this.snapshot();
  }

  /** 現在の内部状態をセーブ用 DTO にシリアライズする。 */
  serialize(): GameSessionState {
    return {
      history: this.history.map((t) => ({ ...t })),
      currentScene: this.currentScene,
      choices: this.choices.map((c) => ({ ...c })),
      inkChoiceIndices: [...this.inkChoiceIndices],
      ended: this.ended,
      turnCounter: this.turnCounter,
      inkState: this.engine.getState(),
    };
  }

  /**
   * シリアライズされた状態からセッションを復元する。
   * @param engine 紐付けるシナリオエンジン
   * @param state 復元する状態データ
   */
  static restore(engine: PlayableEngine, state: GameSessionState): GameSession {
    engine.loadState(state.inkState);
    const session = Object.create(GameSession.prototype) as GameSession;
    Object.defineProperty(session, "engine", {
      value: engine,
      writable: false,
      enumerable: true,
      configurable: true,
    });
    // biome-ignore lint/suspicious/noExplicitAny: factoryメソッド内でのprivate/readonlyへの代入を許可
    const s = session as any;
    s.history = state.history.map((t) => ({ ...t }));
    s.currentScene = state.currentScene;
    s.choices = state.choices.map((c) => ({ ...c }));
    s.inkChoiceIndices = [...state.inkChoiceIndices];
    s.ended = state.ended;
    s.turnCounter = state.turnCounter;
    return session;
  }

  /** 行動履歴。各ターンは表示済み本文と選んだラベル、最新未選択ターンは null。 */
  getHistory(): { turns: Turn[] } {
    return { turns: this.history.map((t) => ({ ...t })) };
  }

  /**
   * 選択肢を選び、次の状況まで前進する。
   * @param index 提示順 0..n-1 の選択肢インデックス
   * @param expectedText 任意。指定時は正規化のうえ「完全一致 or 部分文字列包含」で照合し、
   *   不一致なら状態を進めず `choice_mismatch` を投げる。
   * @throws {SessionError} game_already_ended / choice_out_of_range / choice_mismatch
   */
  choose(index: number, expectedText?: string): Snapshot {
    if (this.ended) {
      throw new SessionError("game_already_ended", "ゲームは既に終了しています。");
    }
    if (!Number.isInteger(index) || index < 0 || index >= this.choices.length) {
      throw new SessionError(
        "choice_out_of_range",
        `選択肢の番号が範囲外です: ${index}（0〜${this.choices.length - 1}）`,
        this.snapshotChoices(),
      );
    }
    if (expectedText !== undefined && expectedText.trim() !== "") {
      const actual = normalizeChoiceLabel(this.choices[index].text);
      const expected = normalizeChoiceLabel(expectedText);
      const matches =
        actual === expected ||
        (expected.length > 0 && actual.includes(expected)) ||
        (actual.length > 0 && expected.includes(actual));
      if (!matches) {
        throw new SessionError(
          "choice_mismatch",
          `選択肢ラベルが一致しません: index=${index} 期待="${expectedText}" 実際="${this.choices[index].text}"`,
          this.snapshotChoices(),
        );
      }
    }

    // 直近（最新・未選択）ターンに選んだラベルを刻む
    const latest = this.history[this.history.length - 1];
    if (latest) {
      latest.choice = this.choices[index].text;
    }
    this.engine.chooseChoiceIndex(this.inkChoiceIndices[index]);
    this.advance();
    return this.snapshot();
  }

  /** CLI デバッグ専用の生変数アクセサ。mcp-server はこの経路を import しない。 */
  get debug(): DebugAccessor {
    return {
      getVariable: (name) => this.engine.getVariable(name),
      setVariable: (name, value) => this.engine.setVariable(name, value),
      getVariables: () => this.engine.getVariables(),
    };
  }

  /** 選択肢提示か終端まで continue を回し、本文を蓄積して現在ターンを確定する。 */
  private advance(): void {
    const parts: string[] = [];
    while (this.engine.canContinue()) {
      const text = this.engine.continue().replace(/\s+$/u, "");
      if (text.length > 0) {
        parts.push(text);
      }
    }
    this.currentScene = parts.join("\n");
    const raw = this.engine.currentChoices;
    this.inkChoiceIndices = raw.map((c) => c.index);
    this.choices = raw.map((c, i) => ({ index: i, text: c.text }));
    this.ended = this.choices.length === 0;
    this.turnCounter += 1;
    this.history.push({ turn: this.turnCounter, scene: this.currentScene, choice: null });
  }

  private snapshot(): Snapshot {
    return {
      scene: this.currentScene,
      choices: this.snapshotChoices(),
      status: this.engine.getPublicVariables(),
      ended: this.ended,
    };
  }

  private snapshotChoices(): Choice[] {
    return this.choices.map((c) => ({ ...c }));
  }
}
