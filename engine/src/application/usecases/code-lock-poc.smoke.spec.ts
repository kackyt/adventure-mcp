import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "../../domain/services/scenario-engine.ts";
import type { SessionError } from "../../shared/errors/session-error.ts";
import type { Snapshot } from "../dtos/game-dtos.ts";
import { GameSession } from "./game-session.ts";

// =====================================================================
//  code_lock_poc.ink のスモークプレイ（Issue #13: 自由入力・完全一致）
//  build:ink が生成した JSON を inkjs で実際に再生し、
//   - 金庫前で入力モード（awaitingInput）になり、継続用選択肢が秘匿される
//   - 誤入力では開かず店内へ戻る（ソフトロックなし）／正入力でのみクリア到達
//   - 正解値が本文・選択肢のどこにも直接書かれていない（ノンスポイラー）
//   - 手がかりゲート（鍵→引き出しのメモ）が機能する
//  を検証する。
//
//  ＊生成 JSON 先頭には BOM が付くため、Story へ渡す前に除去する。
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "../../../assets/code_lock_poc.json");

function loadStoryJson(): string {
  return readFileSync(jsonPath, "utf-8").replace(/^﻿/, "");
}

const ANSWER = "2691"; // 封印層: 「創業 1962年」を逆さに読む

/** 提示中の選択肢からラベル部分一致で選ぶ。見つからなければ候補付きで落とす。 */
function chooseByLabel(session: GameSession, label: string): Snapshot {
  const { choices } = session.getSituation();
  const target = choices.find((c) => c.text.includes(label));
  if (!target) {
    throw new Error(
      `選択肢「${label}」が見つからない。候補: [${choices.map((c) => c.text).join(", ")}]`,
    );
  }
  return session.choose(target.index, label);
}

describe("code_lock_poc smoke play (#13)", () => {
  let session: GameSession;
  /** プレイヤー/GM に見えた本文の全記録（ノンスポイラー検査用）。 */
  let seenScenes: string[];

  function snapshotAndRecord(s: Snapshot): Snapshot {
    seenScenes.push(s.scene);
    for (const c of s.choices) seenScenes.push(c.text);
    return s;
  }

  beforeEach(() => {
    session = new GameSession(new ScenarioEngine(loadStoryJson()));
    seenScenes = [];
    snapshotAndRecord(session.getSituation());
  });

  it("金庫前で入力モードになり、継続用選択肢は露出しない", () => {
    const s = snapshotAndRecord(chooseByLabel(session, "金庫"));
    expect(s.awaitingInput).toBe(true);
    expect(s.choices).toEqual([]);
    expect(s.ended).toBe(false);
    // 入力待ち中の choose は拒否される
    try {
      session.choose(0);
      expect.unreachable();
    } catch (e) {
      expect((e as SessionError).code).toBe("input_required");
    }
  });

  it("誤入力では開かず店内へ戻り（ソフトロックなし）、入力待ち外の submitInput は拒否される", () => {
    snapshotAndRecord(chooseByLabel(session, "金庫"));
    const wrong = snapshotAndRecord(session.submitInput("0000"));
    expect(wrong.scene).toContain("番号が違う");
    expect(wrong.awaitingInput).toBe(false);
    expect(wrong.ended).toBe(false);
    expect(wrong.choices.length).toBeGreaterThan(0); // 店内に戻り探索を続けられる

    try {
      session.submitInput("0000"); // もう入力待ちではない
      expect.unreachable();
    } catch (e) {
      expect((e as SessionError).code).toBe("input_not_allowed");
    }
  });

  it("手がかりゲート: 鍵を見つけるまで引き出しは開かず、メモは読めない", () => {
    const locked = snapshotAndRecord(chooseByLabel(session, "引き出し"));
    expect(locked.scene).toContain("施錠");
    expect(locked.scene).not.toContain("逆さ");

    snapshotAndRecord(chooseByLabel(session, "柱時計")); // 鍵を発見
    const opened = snapshotAndRecord(chooseByLabel(session, "引き出し"));
    expect(opened.scene).toContain("逆さ"); // メモが読める
  });

  it("手がかりを集めて正しい入力でのみクリアに到達し、正解値は一度も表示されない", () => {
    // (C) ゲート: 柱時計の鍵 → 引き出しのメモ、(B) 統合: 写真の年号と組み合わせる
    snapshotAndRecord(chooseByLabel(session, "柱時計"));
    snapshotAndRecord(chooseByLabel(session, "引き出し"));
    const photo = snapshotAndRecord(chooseByLabel(session, "写真立て"));
    expect(photo.scene).toContain("1962");

    snapshotAndRecord(chooseByLabel(session, "金庫"));

    // 惜しい誤答（年号そのまま）でも開かない
    const near = snapshotAndRecord(session.submitInput("1962"));
    expect(near.ended).toBe(false);
    expect(near.scene).toContain("番号が違う");

    // 正答（全角・前後空白入りでも正規化されて一致する）
    snapshotAndRecord(chooseByLabel(session, "金庫"));
    const cleared = snapshotAndRecord(session.submitInput("　２６９１ "));
    expect(cleared.scene).toContain("形見の懐中時計");
    expect(cleared.ended).toBe(true);

    // ノンスポイラー: 正解値がクリアまでの本文・選択肢のどこにも直接出ていない
    expect(seenScenes.join("\n")).not.toContain(ANSWER);
  });

  it("全探索してもデッドエンドがない（常に選択肢か入力待ちがある）", () => {
    // 店内の全調査を一巡して戻ってくる
    for (const label of ["柱時計", "写真立て", "引き出し", "柱時計", "引き出し"]) {
      const s = snapshotAndRecord(chooseByLabel(session, label));
      expect(s.ended).toBe(false);
      expect(s.choices.length > 0 || s.awaitingInput).toBe(true);
    }
    // 金庫前 → 誤入力 → 店内、を繰り返しても行き詰まらない
    for (let i = 0; i < 2; i++) {
      const gate = snapshotAndRecord(chooseByLabel(session, "金庫"));
      expect(gate.awaitingInput).toBe(true);
      const back = snapshotAndRecord(session.submitInput(`000${i}`));
      expect(back.ended).toBe(false);
      expect(back.choices.length).toBeGreaterThan(0);
    }
  });
});
