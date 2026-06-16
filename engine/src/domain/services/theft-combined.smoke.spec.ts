import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

// =====================================================================
//  theft_combined.ink のスモークプレイ（Issue #12 / 合成・仮説実証）
//  独立2次元（誰が × 配置）の一括コミットが破綻なく成立することを検証する。
//   - 両次元を正しく揃えて提出すると解決（脱出）
//   - 片方だけ正しくても提出は失敗＝終端バッドエンド（部分正解の手応えなし）
//     → 総当たりは積（掛け算）、賢い解き手は各次元を別々に解いて和（足し算）
//   - 両次元が揃うまで「封印に答える」が出ない
//  位置: 1=北,2=東,3=南,4=西 ／ 犯人: 1=アレン,2=ボウ,3=カイ,4=ドラ
//  解: 盗人=カイ(3) / 炎=北 水=東 風=南 土=西
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "../../../assets/theft_combined.json");

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

function setCulprit(engine: ScenarioEngine, who: string): void {
  choose(engine, "盗人を選ぶ");
  choose(engine, who);
}

function placeRune(engine: ScenarioEngine, rune: string, dir: string): void {
  choose(engine, `${rune}の封印を置く`);
  choose(engine, dir);
}

/** 正解の配置（炎北/水東/風南/土西）を置く。 */
function placeCorrectRunes(engine: ScenarioEngine): void {
  placeRune(engine, "炎", "北");
  placeRune(engine, "水", "東");
  placeRune(engine, "風", "南");
  placeRune(engine, "土", "西");
}

describe("theft_combined smoke play (#12 / 合成)", () => {
  let engine: ScenarioEngine;

  beforeEach(() => {
    engine = new ScenarioEngine(loadStoryJson());
  });

  it("両次元が揃うまで『封印に答える』は出ない", () => {
    advance(engine);
    expect(hasChoice(engine, "封印に答える")).toBe(false);
    setCulprit(engine, "カイ");
    expect(hasChoice(engine, "封印に答える")).toBe(false); // 配置未設定
    placeCorrectRunes(engine);
    expect(hasChoice(engine, "封印に答える")).toBe(true);
  });

  it("正解: 盗人(カイ)と配置(炎北/水東/風南/土西)を揃えて提出すると脱出する", () => {
    advance(engine);
    setCulprit(engine, "カイ");
    placeCorrectRunes(engine);
    const end = choose(engine, "封印に答える");
    expect(end.text).toContain("脱出した");
    expect(engine.canContinue()).toBe(false);
    expect(engine.currentChoices.length).toBe(0);
  });

  it("配置だけ正解・犯人を誤ると失敗（部分正解の手応えなし＝積で効く）", () => {
    advance(engine);
    setCulprit(engine, "ボウ"); // 犯人だけ誤り
    placeCorrectRunes(engine);
    const bad = choose(engine, "封印に答える");
    expect(bad.text).toContain("永遠に閉ざされた");
    expect(engine.canContinue()).toBe(false);
  });

  it("犯人だけ正解・配置を誤ると失敗（部分正解の手応えなし＝積で効く）", () => {
    advance(engine);
    setCulprit(engine, "カイ"); // 犯人は正解
    placeRune(engine, "炎", "東"); // 配置を誤り
    placeRune(engine, "水", "北");
    placeRune(engine, "風", "南");
    placeRune(engine, "土", "西");
    const bad = choose(engine, "封印に答える");
    expect(bad.text).toContain("永遠に閉ざされた");
    expect(engine.canContinue()).toBe(false);
  });
});
