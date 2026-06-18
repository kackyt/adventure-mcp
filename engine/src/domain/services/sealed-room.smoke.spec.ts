import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

// =====================================================================
//  sealed_room.ink のスモークプレイ（Issue #12 / 密室・結果ゲート型）
//  appearance-gating（解決コマンドが後から出現＝それ自体がネタバレ）を避け、
//  outcome-gating を検証する:
//   - 解決行動「受け穴に手を差し入れてみる」は最初から常設（コマンド集合は不変）
//   - 水たまり（溶けた氷）に気づく前に試すと空振り
//   - 気づいた後に同じ行動を試すと鍵を取り戻し、脱出できる
//   - 力ずくの失敗はデッドエンドにならない
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "../../../assets/sealed_room.json");

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

const REACH = "受け穴に手を差し入れ";

describe("sealed_room smoke play (#12 / 結果ゲート型)", () => {
  let engine: ScenarioEngine;

  beforeEach(() => {
    engine = new ScenarioEngine(loadStoryJson());
  });

  it("解決行動は最初から常設されている（コマンド出現で漏れない）", () => {
    const start = advance(engine);
    expect(start.choices.some((c) => c.text.includes(REACH))).toBe(true);
  });

  it("水たまりに気づく前に手を入れても空振りする", () => {
    advance(engine);
    const miss = choose(engine, REACH); // 何も調べずいきなり
    expect(miss.text).toContain("何も触れない");
    expect(engine.getVariable("has_key")).toBe(false);
    expect(miss.choices.length).toBeGreaterThan(0);
  });

  it("水たまりに気づいた後に同じ行動で鍵を取り戻し、脱出できる", () => {
    advance(engine);
    choose(engine, REACH); // 早すぎる試行（空振り）
    choose(engine, "閂の真下の床を調べる"); // 溶けた氷に気づく
    expect(engine.getVariable("ev_water")).toBe(true);

    const reach = choose(engine, REACH); // 同じコマンドだが今度は成功
    expect(reach.text).toContain("消えたはずの鍵");
    expect(engine.getVariable("has_key")).toBe(true);

    const end = choose(engine, "鉄扉を開けて脱出する");
    expect(end.text).toContain("脱出した");
    expect(engine.canContinue()).toBe(false);
  });

  it("思い込みのまま扉を押しても出られず進行不能にもならない", () => {
    advance(engine);
    const step = choose(engine, "鉄扉を力ずくで開けようとする");
    expect(step.text).toContain("微動だにしない");
    expect(step.choices.length).toBeGreaterThan(0);
  });
});
