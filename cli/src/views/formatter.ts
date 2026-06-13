import type { Choice } from "engine";

/**
 * コンソール表示用のフォーマッタ群。
 * 文字列を組み立てるだけの純粋関数とし、出力（I/O）は呼び出し側が担う。
 */

/** 本文テキストを表示用に整形する。前後の空白を取り除く。 */
export function formatPassage(text: string): string {
  return text.trimEnd();
}

/** 選択肢一覧を 1 始まりの番号付きリストとして整形する。 */
export function formatChoices(choices: Choice[]): string {
  return choices.map((choice, i) => `  ${i + 1}) ${choice.text}`).join("\n");
}

/** 変数の値を `name = value` 形式で整形する。 */
export function formatVariable(name: string, value: unknown): string {
  return `${name} = ${formatValue(value)}`;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

/** エラーメッセージを整形する。 */
export function formatError(message: string): string {
  return `エラー: ${message}`;
}
