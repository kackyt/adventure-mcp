import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

// =====================================================================
//  adventure_command.ink のスモークプレイ（Issue #12 / 冒険コマンドハーネス）
//  古典的な点アンドクリック型アドベンチャーの固定コマンド体系を検証する。
//   - 固定コマンド（しらべる/あける/とる/つかう/たたく/はなす/うごく/もちもの）
//   - 連鎖: たたく(蜘蛛の巣)→火打石→松明点火→宝箱→鍵→扉解錠→うごく でクリア
//   - 松明を点けずに闇へ進むと死ぬ（予兆つき終端ED・ソフトロックでない）
//   - 火打石は蜘蛛の巣を払うまで取れない
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "../../../assets/adventure_command.json");

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

const VERB = (engine: ScenarioEngine, verb: string, target: string) => {
  choose(engine, verb);
  return choose(engine, target);
};

/** 鍵を入手し北の扉を解錠するまで（松明の点火は引数で選択）。 */
function prepare(engine: ScenarioEngine, lightTorch: boolean): void {
  advance(engine);
  VERB(engine, "たたく", "蜘蛛の巣"); // 火打石が見える
  VERB(engine, "とる", "火打石");
  VERB(engine, "とる", "壁の松明");
  if (lightTorch) {
    choose(engine, "つかう");
    choose(engine, "火打石");
    choose(engine, "松明");
  }
  VERB(engine, "あける", "古い宝箱"); // 鍵が見える
  VERB(engine, "とる", "鉄の鍵");
  choose(engine, "つかう");
  choose(engine, "鉄の鍵");
  choose(engine, "北の扉");
}

describe("adventure_command smoke play (#12 / 冒険コマンド)", () => {
  let engine: ScenarioEngine;

  beforeEach(() => {
    engine = new ScenarioEngine(loadStoryJson());
  });

  it("冒険ハーネスの固定コマンドが揃っている", () => {
    const start = advance(engine);
    for (const verb of [
      "しらべる",
      "あける",
      "とる",
      "たたく",
      "はなす",
      "うごく",
      "もちものをみる",
    ]) {
      expect(
        start.choices.some((c) => c.text.includes(verb)),
        verb,
      ).toBe(true);
    }
  });

  it("連鎖（蜘蛛の巣→火打石→点火→宝箱→鍵→解錠→うごく）でクリアできる", () => {
    prepare(engine, true);
    expect(engine.getVariable("torch_lit")).toBe(true);
    expect(engine.getVariable("door_unlocked")).toBe(true);

    const end = VERB(engine, "うごく", "北の扉の先へ");
    expect(end.text).toContain("宝物の間");
    expect(engine.canContinue()).toBe(false);
  });

  it("松明を点けずに闇へ進むと死ぬ（予兆つき終端ED）", () => {
    prepare(engine, false); // 松明を点けない
    expect(engine.getVariable("torch_lit")).toBe(false);
    const death = VERB(engine, "うごく", "北の扉の先へ");
    expect(death.text).toContain("奈落");
    expect(engine.canContinue()).toBe(false); // 終端（ソフトロックでない）
    expect(engine.currentChoices.length).toBe(0);
  });

  it("火打石は蜘蛛の巣を払うまで取れない", () => {
    advance(engine);
    choose(engine, "とる");
    expect(hasChoice(engine, "火打石")).toBe(false); // まだ
    choose(engine, "やめる");
    VERB(engine, "たたく", "蜘蛛の巣");
    choose(engine, "とる");
    expect(hasChoice(engine, "火打石")).toBe(true);
  });
});
