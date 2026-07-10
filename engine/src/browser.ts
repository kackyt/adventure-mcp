/**
 * ブラウザ環境向けの公開 API（Node 組み込みモジュール非依存の面だけを束ねるバレル）。
 * `./index.ts` は `node:fs` / `node:crypto` に依存するアダプタ（FsScenarioStorage・
 * FsSaveStorage・SaveCodec・SessionManager）を含むため、web パッケージはこちらを import する。
 * ここへ追加してよいのは「Node 組み込みモジュールを（推移的にも）import しないファイル」のみ。
 */
export * from "./application/dtos/game-dtos.ts";
export * from "./application/ports/save-storage-port.ts";
export * from "./application/ports/scenario-storage-port.ts";
export * from "./application/usecases/game-session.ts";
export * from "./domain/services/scenario-engine.ts";
export * from "./infrastructure/ink/compile-ink.ts";
export * from "./shared/errors/engine-error.ts";
export * from "./shared/errors/session-error.ts";
