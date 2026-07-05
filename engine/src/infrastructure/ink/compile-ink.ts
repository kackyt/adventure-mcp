import { Compiler } from "inkjs/compiler/Compiler";
import { EngineError } from "../../shared/errors/engine-error.ts";

/**
 * Ink ソース文字列を inkjs でコンパイルして Story 用 JSON を返す（inklecate 非依存）。
 * ランタイムに .ink を直接コンパイルしたいツール／テスト向け。先頭 BOM は除去する。
 */
export function compileInkToJson(source: string): string {
  const src = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  try {
    const json = new Compiler(src).Compile().ToJson();
    if (!json) {
      throw new EngineError("Ink compile produced no JSON");
    }
    return json;
  } catch (e) {
    if (e instanceof EngineError) throw e;
    throw new EngineError("Failed to compile ink source", e);
  }
}
