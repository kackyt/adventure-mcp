import * as fs from "node:fs";
import * as path from "node:path";
import type { SaveStoragePort } from "../../application/ports/save-storage-port.ts";
import { EngineError } from "../../shared/errors/engine-error.ts";
import { SessionError } from "../../shared/errors/session-error.ts";

export class FsSaveStorage implements SaveStoragePort {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * saveId を検証し、安全なファイルパスを生成する。
   * @throws {SessionError} 不正な ID やディレクトリトラバーサル検知時
   */
  private resolvePath(saveId: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(saveId)) {
      throw new SessionError("unknown_save", `不正な saveId です: ${saveId}`);
    }
    const resolved = path.resolve(this.baseDir, `${saveId}.save`);
    // resolve の結果が baseDir 以下にあるかを念のためチェック（正規表現で弾いているので通常到達しない）
    if (!resolved.startsWith(this.baseDir)) {
      throw new SessionError(
        "unknown_save",
        "セーブデータディレクトリ外へのアクセスは許可されていません。",
      );
    }
    return resolved;
  }

  save(saveId: string, text: string): void {
    const filePath = this.resolvePath(saveId);
    try {
      fs.writeFileSync(filePath, text, "utf-8");
    } catch (e) {
      throw new EngineError(`セーブデータの書き込みに失敗しました: ${(e as Error).message}`, e);
    }
  }

  load(saveId: string): string {
    const filePath = this.resolvePath(saveId);
    if (!fs.existsSync(filePath)) {
      throw new SessionError("unknown_save", `指定されたセーブデータが存在しません: ${saveId}`);
    }
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch (e) {
      throw new EngineError(`セーブデータの読み込みに失敗しました: ${(e as Error).message}`, e);
    }
  }

  list(): string[] {
    try {
      return fs
        .readdirSync(this.baseDir)
        .filter((file) => file.endsWith(".save"))
        .map((file) => file.replace(/\.save$/, ""));
    } catch (_e) {
      return [];
    }
  }

  delete(saveId: string): void {
    const filePath = this.resolvePath(saveId);
    if (!fs.existsSync(filePath)) {
      throw new SessionError("unknown_save", `指定されたセーブデータが存在しません: ${saveId}`);
    }
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      throw new EngineError(`セーブデータの削除に失敗しました: ${(e as Error).message}`, e);
    }
  }
}
