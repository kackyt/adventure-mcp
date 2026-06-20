/**
 * シナリオデータの取得口（Secondary Port）。
 * 実装は `infrastructure` 層に置き、`application` 層はこの抽象にのみ依存する。
 * これによりユニットテストではインメモリ・フェイクを注入でき、fs から独立できる。
 */
export interface ScenarioStoragePort {
  /** 利用可能なシナリオ id（snake_case・拡張子なし）を返す。 */
  listScenarioIds(): string[];
  /**
   * 指定 id のコンパイル済み Ink JSON 文字列を返す。
   * 実装は id を列挙済みホワイトリストへ閉じ込め、assets 外を解決してはならない。
   */
  loadScenarioJson(id: string): string;
}
