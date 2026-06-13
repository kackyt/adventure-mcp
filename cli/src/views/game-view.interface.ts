import type { GameController } from "../controller/game-controller.ts";

/**
 * ゲームの表示と入力を担う View の抽象。
 * 実体（neo-blessed / 行ベース）を差し替え可能にする。
 *
 * 各 View は自身のループを持ち、コントローラを駆動する。コントローラの
 * `exitRequested` が立つか入力が尽きたら、終了コードで解決する。
 */
export interface IGameView {
  /** コントローラを駆動し、終了コードを返す。 */
  run(controller: GameController): Promise<number>;
  /** 端末状態の復元など後始末を行う（多重呼び出し安全）。 */
  destroy(): void;
}
