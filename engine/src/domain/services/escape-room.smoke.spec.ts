import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

// =====================================================================
//  escape_room.ink のスモークプレイ（Issue #12 / 汎用コマンド×アイテム制）
//  脱出ゲームを「固定動詞（調べる／道具を使う）＋インベントリ」で組み、解決のたびに
//  専用コマンドが湧かない（appearance-gating 回避）ことと、攻略連鎖の成立を検証する。
//   - トップの動詞は終始固定（調べる／道具を使う(*)／持ち物）
//   - 本→真鍮の鍵→引き出し→火かき棒→暖炉→鉄の鍵→扉 の連鎖でクリア
//   - 誤った道具×対象はフェアに空振り（効果がない）し、進行不能にならない
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "../../../assets/escape_room.json");

function loadStoryJson(): string {
  return readFileSync(jsonPath, "utf-8").replace(/^﻿/, "");
}

interface Step {
  text: string;
  choices: { index: number; text: string }[];
}

function advance(engine: ScenarioEngine): Step {
  let text = "";
  while (engine.canContinue()) {
    text += engine.continue();
  }
  return { text, choices: engine.currentChoices };
}

function choose(engine: ScenarioEngine, label: string): Step {
  const choices = engine.currentChoices;
  expect(choices.length, `デッドエンド検出: 「${label}」`).toBeGreaterThan(0);
  const target = choices.find((c) => c.text.includes(label));
  if (!target) {
    throw new Error(
      `選択肢「${label}」が見つからない。候補: [${choices.map((c) => c.text).join(", ")}]`,
    );
  }
  engine.chooseChoiceIndex(target.index);
  return advance(engine);
}

function hasChoice(engine: ScenarioEngine, label: string): boolean {
  return engine.currentChoices.some((c) => c.text.includes(label));
}

/** 道具を対象に使う（固定動詞 → 道具 → 対象）。 */
function use(engine: ScenarioEngine, item: string, target: string): Step {
  choose(engine, "道具を使う");
  choose(engine, item);
  return choose(engine, target);
}

describe("escape_room smoke play (#12 / 汎用コマンド×アイテム制)", () => {
  let engine: ScenarioEngine;

  beforeEach(() => {
    engine = new ScenarioEngine(loadStoryJson());
  });

  it("トップの動詞は固定で、解決しても専用コマンドは湧かない", () => {
    advance(engine);
    expect(hasChoice(engine, "あたりを調べる")).toBe(true);
    expect(hasChoice(engine, "持ち物を確認する")).toBe(true);
    // 道具入手前は「道具を使う」は無し（手ぶら）。入手しても増えるのは汎用動詞のみ。
    expect(hasChoice(engine, "道具を使う")).toBe(false);

    choose(engine, "あたりを調べる");
    choose(engine, "本棚");
    choose(engine, "飛び出た本を引く"); // 真鍮の鍵（→ look_menu に戻る）
    choose(engine, "やめる"); // look_menu → hub
    // 動詞は固定のまま。専用の解決コマンドは現れない
    expect(hasChoice(engine, "あたりを調べる")).toBe(true);
    expect(hasChoice(engine, "道具を使う")).toBe(true); // 道具を持ったので使える
    expect(hasChoice(engine, "持ち物を確認する")).toBe(true);
  });

  it("連鎖（本→真鍮→引き出し→火かき棒→暖炉→鉄→扉）でクリアできる", () => {
    advance(engine);
    choose(engine, "あたりを調べる");
    choose(engine, "本棚");
    choose(engine, "飛び出た本を引く");
    expect(engine.getVariable("has_brass")).toBe(true);
    choose(engine, "やめる");

    use(engine, "真鍮の鍵", "机の引き出し");
    expect(engine.getVariable("has_poker")).toBe(true);

    use(engine, "火かき棒", "暖炉の灰");
    expect(engine.getVariable("has_iron")).toBe(true);

    const end = use(engine, "鉄の鍵", "樫の扉");
    expect(end.text).toContain("脱出した");
    expect(engine.canContinue()).toBe(false);
    expect(engine.currentChoices.length).toBe(0);
  });

  it("誤った道具×対象はフェアに空振りし、進行不能にならない", () => {
    advance(engine);
    choose(engine, "あたりを調べる");
    choose(engine, "本棚");
    choose(engine, "飛び出た本を引く");
    choose(engine, "やめる");

    const miss = use(engine, "真鍮の鍵", "樫の扉"); // 小さい鍵を大きな鍵穴へ
    expect(miss.text).toContain("効果がない");
    expect(engine.getVariable("drawer_open")).toBe(false);
    expect(miss.choices.length).toBeGreaterThan(0);
  });
});
