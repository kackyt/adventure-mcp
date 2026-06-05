export class EngineError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "EngineError";
    // TypeScriptで組み込みクラスを継承する場合のおまじない
    Object.setPrototypeOf(this, EngineError.prototype);
  }
}
