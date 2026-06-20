import type { Choice } from "../../domain/services/scenario-engine.ts";

/** AI に渡してよい現在状況のスナップショット（生の Ink 変数は含めない）。 */
export interface Snapshot {
  /** 表示済み本文（continue 群を改行連結）。 */
  scene: string;
  /** 提示順 0..n-1 に正規化した選択肢。 */
  choices: Choice[];
  /** `public_status` で公開宣言された変数のみ。 */
  status: Record<string, unknown>;
  /** 選択肢が無く、これ以上進めない終端か。 */
  ended: boolean;
}

/** 行動履歴の 1 ターン。最新（未選択）ターンの `choice` は null。 */
export interface Turn {
  turn: number;
  scene: string;
  choice: string | null;
}

/** start_game の返却（スナップショットに sessionId を加えたもの）。 */
export interface StartedGame extends Snapshot {
  sessionId: string;
}
