import { Compiler } from "inkjs/compiler/Compiler";
import { describe, expect, it } from "vitest";
import type { ScenarioStoragePort } from "../ports/scenario-storage-port.ts";
import { SessionError } from "../shared/errors/session-error.ts";
import { SessionManager } from "./session-manager.ts";

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
});
