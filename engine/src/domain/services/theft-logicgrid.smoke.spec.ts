import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

// =====================================================================
//  theft_logicgrid.ink のスモークプレイ（Issue #12 / 案2）
//  論理グリッド（割当そのものを提出）の検証。
//   - 全員の位置を割り当てるまで提出できない
//   - 正しい配置(A北/B東/C南/D台座)を提出すると犯人ドラが判明し脱出
//   - 誤った配置の提出はバッドエンド（終端ED）
//  位置コード: 1=北扉, 2=東扉, 3=南扉, 4=台座
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "../../../assets/theft_logicgrid.json");

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

/** 各容疑者の位置を割り当てる。spot: 北扉/東扉/南扉/台座 */
function assign(engine: ScenarioEngine, who: string, spot: string): void {
  choose(engine, `${who}の位置を決める`);
  choose(engine, spot);
}

describe("theft_logicgrid smoke play (#12 / 案2)", () => {
  let engine: ScenarioEngine;

  beforeEach(() => {
    engine = new ScenarioEngine(loadStoryJson());
  });

  it("全員を割り当てるまで『提出』は出ない", () => {
    advance(engine);
    expect(hasChoice(engine, "推理を提出する")).toBe(false);
    assign(engine, "アレン", "北扉");
    assign(engine, "ボウ", "東扉");
    assign(engine, "カイ", "南扉");
    expect(hasChoice(engine, "推理を提出する")).toBe(false); // ドラ未割当
    assign(engine, "ドラ", "台座");
    expect(hasChoice(engine, "推理を提出する")).toBe(true);
  });

  it("正解配置(A北/B東/C南/D台座)を提出すると犯人ドラが判明し脱出する", () => {
    advance(engine);
    assign(engine, "アレン", "北扉");
    assign(engine, "ボウ", "東扉");
    assign(engine, "カイ", "南扉");
    assign(engine, "ドラ", "台座");

    const reveal = choose(engine, "推理を提出する");
    expect(reveal.text).toContain("ドラ");
    expect(engine.getVariable("has_key")).toBe(true);

    const end = choose(engine, "鉄扉を開けて脱出する");
    expect(end.text).toContain("脱出した");
    expect(engine.canContinue()).toBe(false);
    expect(engine.currentChoices.length).toBe(0);
  });

  it("誤った配置の提出はバッドエンド（終端ED）", () => {
    advance(engine);
    assign(engine, "アレン", "台座"); // 誤り
    assign(engine, "ボウ", "東扉");
    assign(engine, "カイ", "南扉");
    assign(engine, "ドラ", "北扉");

    const bad = choose(engine, "推理を提出する");
    expect(bad.text).toContain("取り残された");
    expect(engine.getVariable("has_key")).toBe(false);
    expect(engine.canContinue()).toBe(false);
    expect(engine.currentChoices.length).toBe(0);
  });

  it("割当はやり直せる（再設定して提出に進める）", () => {
    advance(engine);
    assign(engine, "アレン", "台座");
    assign(engine, "アレン", "北扉"); // 上書き
    expect(engine.getVariable("p_alen")).toBe(1);
  });
});
