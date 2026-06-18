import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

// =====================================================================
//  escape_mansion.ink のスモークプレイ（Issue #12 / 複数部屋・場所移動）
//  部屋移動（書斎 ↔ 廊下 ↔ 地下室）と、部屋をまたぐ手がかり結合を検証する。
//   - 各部屋から接続先へ移動でき、戻れる
//   - 書斎で得たランタンがないと地下室は暗くて探索できない（空間的距離）
//   - 本→真鍮→ランタン→地下室→鉄の鍵→玄関 の連鎖でクリア
//   - 誤った道具×対象はフェアに空振りし、進行不能にならない
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "../../../assets/escape_mansion.json");

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

function getBrassKey(engine: ScenarioEngine): void {
  choose(engine, "あたりを調べる");
  choose(engine, "本棚");
  choose(engine, "飛び出た本を引く");
  choose(engine, "やめる"); // s_look → study_hub
}

function getLantern(engine: ScenarioEngine): void {
  choose(engine, "道具を使う");
  choose(engine, "真鍮の鍵");
  choose(engine, "机の引き出し");
}

describe("escape_mansion smoke play (#12 / 複数部屋)", () => {
  let engine: ScenarioEngine;

  beforeEach(() => {
    engine = new ScenarioEngine(loadStoryJson());
  });

  it("部屋を移動でき、戻ってこられる（書斎→廊下→地下室→廊下→書斎）", () => {
    advance(engine);
    expect(hasChoice(engine, "廊下へ移動する")).toBe(true);
    choose(engine, "廊下へ移動する");
    expect(hasChoice(engine, "地下室へ移動する")).toBe(true);
    choose(engine, "地下室へ移動する");
    choose(engine, "廊下へ移動する");
    const study = choose(engine, "書斎へ移動する");
    expect(study.text).toContain("書斎");
  });

  it("ランタンがないと地下室は暗くて調べられない（空間的距離）", () => {
    advance(engine);
    choose(engine, "廊下へ移動する");
    choose(engine, "地下室へ移動する");
    expect(hasChoice(engine, "あたりを調べる")).toBe(false); // 暗い
    expect(hasChoice(engine, "廊下へ移動する")).toBe(true); // 戻れる（デッドエンドでない）
  });

  it("連鎖（本→真鍮→ランタン→地下室→鉄の鍵→玄関）でクリアできる", () => {
    advance(engine);
    getBrassKey(engine);
    getLantern(engine);
    expect(engine.getVariable("has_lantern")).toBe(true);

    choose(engine, "廊下へ移動する");
    choose(engine, "地下室へ移動する");
    expect(hasChoice(engine, "あたりを調べる")).toBe(true); // ランタンで明るい
    choose(engine, "あたりを調べる");
    choose(engine, "古い棚");
    expect(engine.getVariable("has_iron")).toBe(true);
    choose(engine, "やめる");

    choose(engine, "廊下へ移動する");
    choose(engine, "道具を使う");
    choose(engine, "鉄の鍵");
    const end = choose(engine, "玄関扉");
    expect(end.text).toContain("脱出に成功した");
    expect(engine.canContinue()).toBe(false);
  });

  it("誤った道具×対象はフェアに空振りし、進行不能にならない", () => {
    advance(engine);
    getBrassKey(engine);
    choose(engine, "廊下へ移動する");
    const miss = (() => {
      choose(engine, "道具を使う");
      return choose(engine, "真鍮の鍵"); // 廊下では真鍮は使い道なし
    })();
    expect(miss.text).toContain("効果がない");
    expect(hasChoice(engine, "書斎へ移動する")).toBe(true);
  });
});
