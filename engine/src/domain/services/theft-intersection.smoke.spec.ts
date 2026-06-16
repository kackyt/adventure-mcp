import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

// =====================================================================
//  theft_intersection.ink のスモークプレイ（Issue #12 / 案1）
//  制約 intersection ＋ 多層フレーム ＋ 2次元コミットの検証。
//   - 3手がかり＋観察を集め、カイ＋「全条件を満たす唯一」を提示すると解決
//   - 罠の容疑者（アレン/ボウ/ドラ）を名指すとバッドエンド（終端ED）
//   - 3手がかりを揃える前は決定的証拠を提示できず、部分証拠は空振り
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "../../../assets/theft_intersection.json");

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

function gatherAll(engine: ScenarioEngine): void {
  advance(engine);
  choose(engine, "台座を調べる");
  choose(engine, "高い棚を調べる");
  choose(engine, "燭台の火を調べる");
  choose(engine, "容疑者たちを観察する");
}

describe("theft_intersection smoke play (#12 / 案1)", () => {
  let engine: ScenarioEngine;

  beforeEach(() => {
    engine = new ScenarioEngine(loadStoryJson());
  });

  it("正解: 3手がかり＋観察を集め、カイと『全条件を満たす唯一』で解決し脱出する", () => {
    gatherAll(engine);
    expect(engine.getVariable("ev_footprint")).toBe(true);
    expect(engine.getVariable("ev_time")).toBe(true);
    expect(engine.getVariable("ev_height")).toBe(true);
    expect(engine.getVariable("ev_observe")).toBe(true);

    choose(engine, "鍵を持ち去った者を指摘する");
    choose(engine, "カイを指摘する");
    const reveal = choose(engine, "全てを満たすのは一人だけ");
    expect(reveal.text).toContain("お前だけ");
    expect(engine.getVariable("has_key")).toBe(true);

    const end = choose(engine, "鉄扉を開けて脱出する");
    expect(end.text).toContain("脱出した");
    expect(engine.canContinue()).toBe(false);
    expect(engine.currentChoices.length).toBe(0);
  });

  it("多層フレーム: 罠のボウを名指すとバッドエンド（終端ED）", () => {
    gatherAll(engine);
    choose(engine, "鍵を持ち去った者を指摘する");
    const bad = choose(engine, "ボウを指摘する");
    expect(bad.text).toContain("取り残された");
    expect(engine.canContinue()).toBe(false);
    expect(engine.currentChoices.length).toBe(0);
  });

  it("決め手の秘匿: 手がかりが揃う前は決定的証拠を提示できず、部分証拠は空振り", () => {
    advance(engine);
    choose(engine, "台座を調べる"); // 足跡のみ
    choose(engine, "鍵を持ち去った者を指摘する");
    choose(engine, "カイを指摘する");
    expect(hasChoice(engine, "全てを満たすのは一人だけ")).toBe(false);
    const weak = choose(engine, "濡れた足跡");
    expect(weak.text).toContain("空振り");
    expect(engine.getVariable("has_key")).toBe(false);
    expect(weak.choices.length).toBeGreaterThan(0);
  });
});
