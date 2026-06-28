/**
 * セーブデータの永続化を行うポート。
 * エンコードされた不透明なテキストの読み書きのみを責務とする。
 */
export interface SaveStoragePort {
  /** セーブデータを保存する */
  save(saveId: string, text: string): void;
  /** セーブデータを読み込む */
  load(saveId: string): string;
  /** 保存されている saveId の一覧を取得する */
  list(): string[];
  /** セーブデータを削除する */
  delete(saveId: string): void;
}
