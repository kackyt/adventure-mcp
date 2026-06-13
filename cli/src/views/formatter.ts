/**
 * 行ベース表示（line View）用のフォーマッタ群。
 * 文字列を組み立てるだけの純粋関数とし、出力（I/O）は呼び出し側が担う。
 */

/** 本文テキストを表示用に整形する。末尾の空白を取り除く。 */
export function formatPassage(text: string): string {
  return text.replace(/\s+$/, "");
}

/** 選択肢ラベル一覧を 1 始まりの番号付きリストとして整形する。 */
export function formatChoices(labels: string[]): string {
  return labels.map((label, i) => `  ${i + 1}) ${label}`).join("\n");
}

/** エラーメッセージを整形する。 */
export function formatError(message: string): string {
  return `エラー: ${message}`;
}
