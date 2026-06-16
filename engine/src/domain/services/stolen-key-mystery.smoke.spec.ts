import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

// =====================================================================
//  stolen_key_mystery.ink のスモークプレイ（Issue #12 / 推理型・難しい）
//  段階ゲートの調査・仕立て上げの罠・決め手の秘匿・犯人×証拠の提示が
//  破綻なく成立することを検証する。
//   - 段階ゲート: 足跡→足元→水滴の筋 の順でしか決定的証拠に到達できない
//   - 罠を見抜き、カイ＋「水滴の筋」を提示すれば鍵を取り戻して脱出できる
//   - 無実の者（罠のボウ等）を名指すとバッドエンド（終端ED＝ソフトロックでない）
//   - 決め手未発見では正解の組み合わせを作れない（総当たり抑止）
//
//  ＊生成 JSON 先頭の BOM を除去してから Story へ渡す。
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "../../../assets/stolen_key_mystery.json");

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
  expect(
    choices.length,
    `デッドエンド検出: 選択肢がない状態で「${label}」を選ぼうとした`,
  ).toBeGreaterThan(0);
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

/** 段階ゲートを踏んで決定的証拠（水滴の筋）まで到達する。 */
function fullInvestigation(engine: ScenarioEngine): void {
  advance(engine);
  choose(engine, "台座を調べる");
  expect(engine.getVariable("ev_footprint")).toBe(true);
  choose(engine, "水場を調べる");
  choose(engine, "三人の足元をあらためる"); // 足跡発見後に解禁
  expect(engine.getVariable("ev_feet")).toBe(true);
  choose(engine, "床全体をもう一度見渡す"); // 足元確認後に解禁
  expect(engine.getVariable("ev_trail")).toBe(true);
}

describe("stolen_key_mystery smoke play (#12 / 推理型・難しい)", () => {
  let engine: ScenarioEngine;

  beforeEach(() => {
    engine = new ScenarioEngine(loadStoryJson());
  });

  it("段階ゲート: 足跡を見る前は足元確認が、足元確認前は床精査が出ない", () => {
    advance(engine);
    expect(hasChoice(engine, "三人の足元をあらためる")).toBe(false);
    expect(hasChoice(engine, "床全体をもう一度見渡す")).toBe(false);

    choose(engine, "台座を調べる");
    expect(hasChoice(engine, "三人の足元をあらためる")).toBe(true);
    expect(hasChoice(engine, "床全体をもう一度見渡す")).toBe(false); // まだ

    choose(engine, "三人の足元をあらためる");
    expect(hasChoice(engine, "床全体をもう一度見渡す")).toBe(true);
  });

  it("正解: 罠を見抜き、カイ＋水滴の筋を提示すれば鍵を取り戻し脱出できる", () => {
    fullInvestigation(engine);
    choose(engine, "鍵を持ち去った者を指摘する");
    choose(engine, "カイを指摘する");
    const reveal = choose(engine, "水場から隅へ続く水滴の筋");
    expect(reveal.text).toContain("なぜ濡れているんだ");
    expect(engine.getVariable("has_key")).toBe(true);

    const end = choose(engine, "鉄扉を開けて脱出する");
    expect(end.text).toContain("脱出した");
    expect(engine.canContinue()).toBe(false);
    expect(engine.currentChoices.length).toBe(0);
  });

  it("仕立て上げの罠: 濡れた足のボウを名指すとバッドエンド（終端ED）", () => {
    fullInvestigation(engine);
    choose(engine, "鍵を持ち去った者を指摘する");
    const bad = choose(engine, "ボウを指摘する");
    expect(bad.text).toContain("取り残された");
    expect(engine.getVariable("has_key")).toBe(false);
    expect(engine.canContinue()).toBe(false); // ソフトロックではなく終端
    expect(engine.currentChoices.length).toBe(0);
  });

  it("決め手の秘匿: 水滴の筋を見つける前はそれを提示できず、弱い証拠は空振りに終わる", () => {
    advance(engine);
    // 足跡だけ見て（罠の証拠）すぐカイを告発しようとする
    choose(engine, "台座を調べる");
    choose(engine, "鍵を持ち去った者を指摘する");
    choose(engine, "カイを指摘する");
    // 決定的証拠は未発見なので選べない
    expect(hasChoice(engine, "水場から隅へ続く水滴の筋")).toBe(false);
    // 弱い証拠を突きつけても空振り、進行不能にはならない
    const weak = choose(engine, "台座の濡れた足跡");
    expect(weak.text).toContain("空振り");
    expect(engine.getVariable("has_key")).toBe(false);
    expect(weak.choices.length).toBeGreaterThan(0);
  });

  it("鍵を取り戻す前は脱出選択肢が出ず、取り戻すと出る（手がかりゲート）", () => {
    advance(engine);
    expect(hasChoice(engine, "鉄扉を開けて脱出する")).toBe(false);

    fullInvestigation(engine);
    choose(engine, "鍵を持ち去った者を指摘する");
    choose(engine, "カイを指摘する");
    choose(engine, "水場から隅へ続く水滴の筋");
    expect(hasChoice(engine, "鉄扉を開けて脱出する")).toBe(true);
    expect(hasChoice(engine, "鍵を持ち去った者を指摘する")).toBe(false);
  });
});
