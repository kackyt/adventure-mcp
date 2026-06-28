import { Compiler } from "inkjs/compiler/Compiler";
import { describe, expect, it } from "vitest";
import { SessionError } from "../../shared/errors/session-error.ts";
import type { SaveStoragePort } from "../ports/save-storage-port.ts";
import type { ScenarioStoragePort } from "../ports/scenario-storage-port.ts";
import { SaveCodec } from "../services/save-codec.ts";
import { SessionManager } from "./session-manager.ts";

class FakeSaveStorage implements SaveStoragePort {
  public data = new Map<string, string>();
  save(saveId: string, text: string): void {
    this.data.set(saveId, text);
  }
  load(saveId: string): string {
    const text = this.data.get(saveId);
    if (!text) throw new SessionError("unknown_save", "not found");
    return text;
  }
  list(): string[] {
    return Array.from(this.data.keys());
  }
  delete(saveId: string): void {
    if (!this.data.delete(saveId)) {
      throw new SessionError("unknown_save", "not found");
    }
  }
}

function managerWithSave(): { m: SessionManager; saveStorage: FakeSaveStorage; codec: SaveCodec } {
  const scenarioStorage = new FakeStorage({ counter: COUNTER, other: COUNTER });
  const saveStorage = new FakeSaveStorage();
  const codec = new SaveCodec("test-secret");
  const m = new SessionManager(scenarioStorage, saveStorage, codec);
  return { m, saveStorage, codec };
}

function compile(source: string): string {
  const json = new Compiler(source).Compile().ToJson();
  if (!json) {
    throw new Error("Compilation failed");
  }
  return json;
}

/** ink ソースをコンパイルして返すだけのインメモリ・フェイク（fs 非依存）。 */
class FakeStorage implements ScenarioStoragePort {
  private readonly compiled = new Map<string, string>();

  constructor(sources: Record<string, string>) {
    for (const [id, src] of Object.entries(sources)) {
      this.compiled.set(id, compile(src));
    }
  }
  listScenarioIds(): string[] {
    return [...this.compiled.keys()].sort();
  }
  loadScenarioJson(id: string): string {
    const json = this.compiled.get(id);
    if (!json) throw new Error(`unknown: ${id}`);
    return json;
  }
}

const COUNTER = `
VAR count = 0
VAR public_status = "count"

-> loop
=== loop ===
カウント {count}。
+ [increment]
    ~ count = count + 1
    -> loop
+ [stop]
    終了。
    -> DONE
`;

function manager(): SessionManager {
  return new SessionManager(new FakeStorage({ counter: COUNTER, other: COUNTER }));
}

describe("SessionManager", () => {
  it("listScenarios はストレージの id 一覧を返す", () => {
    expect(manager().listScenarios()).toEqual(["counter", "other"]);
  });

  it("start_game は sessionId と最初のスナップショットを返す", () => {
    const started = manager().startGame("counter");
    expect(started.sessionId).toMatch(/[0-9a-f-]{36}/);
    expect(started.choices.map((c) => c.text)).toEqual(["increment", "stop"]);
    expect(started.status).toEqual({ count: 0 });
    expect(started.ended).toBe(false);
  });

  it("不明シナリオは unknown_scenario", () => {
    try {
      manager().startGame("../etc/passwd");
      expect.unreachable();
    } catch (e) {
      expect((e as SessionError).code).toBe("unknown_scenario");
    }
  });

  it("複数セッションは独立して進行する", () => {
    const m = manager();
    const a = m.startGame("counter");
    const b = m.startGame("counter");
    expect(a.sessionId).not.toBe(b.sessionId);

    m.choose(a.sessionId, 0); // a: count=1
    m.choose(a.sessionId, 0); // a: count=2
    m.choose(b.sessionId, 0); // b: count=1

    expect(m.getSituation(a.sessionId).status).toEqual({ count: 2 });
    expect(m.getSituation(b.sessionId).status).toEqual({ count: 1 });
  });

  it("get_situation は状態を進めない", () => {
    const m = manager();
    const { sessionId } = m.startGame("counter");
    m.choose(sessionId, 0);
    const before = m.getSituation(sessionId).status;
    const after = m.getSituation(sessionId).status;
    expect(before).toEqual({ count: 1 });
    expect(after).toEqual({ count: 1 });
  });

  it("end_game で破棄、以降の同 sessionId 操作は unknown_session", () => {
    const m = manager();
    const { sessionId } = m.startGame("counter");
    expect(m.endGame(sessionId)).toEqual({ ok: true });
    for (const op of [
      () => m.choose(sessionId, 0),
      () => m.getSituation(sessionId),
      () => m.getHistory(sessionId),
      () => m.endGame(sessionId),
    ]) {
      expect(op).toThrowError(SessionError);
      try {
        op();
      } catch (e) {
        expect((e as SessionError).code).toBe("unknown_session");
      }
    }
  });

  it("終端到達でもセッションは自動破棄されない（end_game まで履歴を引ける）", () => {
    const m = manager();
    const { sessionId } = m.startGame("counter");
    const ended = m.choose(sessionId, 1); // stop → DONE
    expect(ended.ended).toBe(true);
    // 自動破棄されていないので履歴を引ける
    expect(m.getHistory(sessionId).turns.at(-1)?.choice).toBeNull();
    expect(() => m.getSituation(sessionId)).not.toThrow();
  });

  describe("セーブ / ロード機能", () => {
    it("saveGame は進行状態を保存し、loadGame はそれを復元して新しい sessionId を返す", () => {
      const { m } = managerWithSave();
      const { sessionId: originalId } = m.startGame("counter");
      m.choose(originalId, 0); // count = 1

      const saveRes = m.saveGame(originalId, "save-1");
      expect(saveRes.ok).toBe(true);
      expect(m.listSaves()).toEqual(["save-1"]);

      const loaded = m.loadGame("save-1");
      expect(loaded.sessionId).not.toBe(originalId);
      expect(loaded.status).toEqual({ count: 1 });
      expect(loaded.choices.map((c) => c.text)).toEqual(["increment", "stop"]);

      // ロード後に再開できるか
      m.choose(loaded.sessionId, 0); // count = 2
      expect(m.getSituation(loaded.sessionId).status).toEqual({ count: 2 });
    });

    it("saveStorage がない場合はエラーになる", () => {
      const m = manager();
      const { sessionId } = m.startGame("counter");
      expect(() => m.saveGame(sessionId, "save-1")).toThrowError(
        "セーブ機能が設定されていません。",
      );
      expect(() => m.loadGame("save-1")).toThrowError("セーブ機能が設定されていません。");
      expect(() => m.deleteSave("save-1")).toThrowError("セーブ機能が設定されていません。");
    });

    it("deleteSave はセーブデータを削除する", () => {
      const { m } = managerWithSave();
      const { sessionId } = m.startGame("counter");
      m.saveGame(sessionId, "save-1");

      expect(m.listSaves()).toEqual(["save-1"]);
      m.deleteSave("save-1");
      expect(m.listSaves()).toEqual([]);

      expect(() => m.deleteSave("save-1")).toThrowError(SessionError);
    });
  });
});
