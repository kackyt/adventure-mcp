// GameSession が依存するエンジン操作面。テスト用フェイクはこれを実装する。
export type { PlayableEngine } from "engine";

/** 現在の操作モード。 */
export type ViewMode = "choosing" | "command" | "ended";

/** 直近の操作結果メッセージ（:get の値やエラー）。 */
export interface ViewMessage {
  kind: "info" | "error";
  text: string;
}

/** 表示用の選択肢。`selected` はハイライト対象かどうか。 */
export interface ViewChoice {
  label: string;
  selected: boolean;
}

/**
 * View が描画するための不変スナップショット。
 * コントローラの内部状態から導出され、View はこれを描画するだけに徹する。
 */
export interface ViewModel {
  mode: ViewMode;
  status: { variables: Record<string, unknown>; visible: boolean };
  /** 公開ステータス由来の現在地。`place` が公開変数のときその値、無ければ null。常時表示用。 */
  location: string | null;
  scene: string;
  choices: ViewChoice[];
  command: { active: boolean; buffer: string };
  message: ViewMessage | null;
  ended: boolean;
}

/**
 * View からコントローラへ渡す入力意図。
 * View はキーや行入力をこの Action に翻訳して渡すだけで、状態遷移は持たない。
 */
export type Action =
  | { type: "moveUp" }
  | { type: "moveDown" }
  | { type: "confirm" } // ハイライト中の選択肢を決定
  | { type: "selectIndex"; index: number } // 0 始まりのインデックスを直接選択
  | { type: "enterCommandMode" } // ':'
  | { type: "commandInput"; char: string } // コマンドモードで 1 文字入力
  | { type: "commandBackspace" }
  | { type: "commandSubmit" } // Enter: 内部バッファを parse して適用
  | { type: "commandCancel" } // Esc: コマンドモード解除
  | { type: "runCommand"; raw: string } // line View 用: 1 行を一括 parse 適用
  | { type: "quit" };
