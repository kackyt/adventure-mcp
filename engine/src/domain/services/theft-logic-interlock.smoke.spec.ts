import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

// =====================================================================
//  theft_logic_interlock.ink のスモークプレイ（Issue #12 / 相互依存）
//  クロス制約（位置 × 濡れ/乾き）の単一推理が破綻なく成立することを検証する。
//   - 唯一解（北=ボウ/東=ドラ/南=アレン/台座=カイ）の提出で解決・脱出
//   - 誤った配置はバッドエンド（終端ED）
//   - 全員割り当てるまで告発は出ない
//  位置: 1=北,2=東,3=南,4=台座
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "../../../assets/theft_logic_interlock.json");

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

function assign(engine: ScenarioEngine, who: string, spot: string): void {
  choose(engine, `${who}の位置を決める`);
  choose(engine, spot);
}

/** 唯一解の配置を割り当てる。 */
function assignSolution(engine: ScenarioEngine): void {
  assign(engine, "アレン", "南");
  assign(engine, "ボウ", "北");
  assign(engine, "カイ", "台座");
  assign(engine, "ドラ", "東");
}

describe("theft_logic_interlock smoke play (#12 / 相互依存)", () => {
  let engine: ScenarioEngine;

  beforeEach(() => {
    engine = new ScenarioEngine(loadStoryJson());
  });

  it("全員を割り当てるまで『告発』は出ない", () => {
    advance(engine);
    expect(hasChoice(engine, "この配置で告発する")).toBe(false);
    assign(engine, "アレン", "南");
    assign(engine, "ボウ", "北");
    assign(engine, "カイ", "台座");
    expect(hasChoice(engine, "この配置で告発する")).toBe(false); // ドラ未割当
    assign(engine, "ドラ", "東");
    expect(hasChoice(engine, "この配置で告発する")).toBe(true);
  });

  it("唯一解の配置で告発すると犯人カイが判明し脱出する", () => {
    advance(engine);
    assignSolution(engine);
    const reveal = choose(engine, "この配置で告発する");
    expect(reveal.text).toContain("台座にいたのはカイ");
    expect(engine.getVariable("has_key")).toBe(true);

    const end = choose(engine, "鉄扉を開けて脱出する");
    expect(end.text).toContain("脱出した");
    expect(engine.canContinue()).toBe(false);
    expect(engine.currentChoices.length).toBe(0);
  });

  it("一見もっともらしい誤配置（台座=ボウ）はバッドエンド（終端ED）", () => {
    // ボウも濡れているため台座候補に見えるが、(4)(5)で否定される
    advance(engine);
    assign(engine, "アレン", "南");
    assign(engine, "ボウ", "台座");
    assign(engine, "カイ", "北");
    assign(engine, "ドラ", "東");
    const bad = choose(engine, "この配置で告発する");
    expect(bad.text).toContain("取り残された");
    expect(engine.getVariable("has_key")).toBe(false);
    expect(engine.canContinue()).toBe(false);
  });
});
