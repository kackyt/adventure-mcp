import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

// =====================================================================
//  謎の引き出し（ジャンル別）スモークプレイ（Issue #12）
//   - liar_logic      : 嘘つき論理（騎士と悪党型）
//   - alibi_timeline  : アリバイ崩し（時系列の矛盾）
//   - lateral_door    : 水平思考（前提の再解釈）
//   - cipher_levers   : 換字暗号（鍵表で解読 → 手順）
//  各ジャンルが破綻なく成立し、正解で脱出・誤答で終端/やり直しになることを検証する。
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const assets = resolve(__dirname, "../../../assets");

function load(name: string): string {
  return readFileSync(resolve(assets, name), "utf-8").replace(/^﻿/, "");
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

describe("嘘つき論理 (liar_logic)", () => {
  let engine: ScenarioEngine;
  beforeEach(() => {
    engine = new ScenarioEngine(load("liar_logic.json"));
  });

  it("規則に矛盾なく成り立つアレンを指摘すると脱出する", () => {
    advance(engine);
    choose(engine, "盗人を指摘する");
    const reveal = choose(engine, "アレン");
    expect(reveal.text).toContain("アレンが盗人");
    const end = choose(engine, "鉄扉を開けて脱出する");
    expect(end.text).toContain("脱出した");
    expect(engine.canContinue()).toBe(false);
  });

  it("矛盾するボウを指摘するとバッドエンド（終端ED）", () => {
    advance(engine);
    choose(engine, "盗人を指摘する");
    const bad = choose(engine, "ボウ");
    expect(bad.text).toContain("取り残された");
    expect(engine.canContinue()).toBe(false);
  });
});

describe("アリバイ崩し (alibi_timeline)", () => {
  let engine: ScenarioEngine;
  beforeEach(() => {
    engine = new ScenarioEngine(load("alibi_timeline.json"));
  });

  it("時系列が破綻したボウを指摘すると脱出する", () => {
    advance(engine);
    choose(engine, "時系列が破綻している者を指摘する");
    const reveal = choose(engine, "ボウ");
    expect(reveal.text).toContain("あり得ぬ時刻");
    const end = choose(engine, "鉄扉を開けて脱出する");
    expect(end.text).toContain("脱出した");
    expect(engine.canContinue()).toBe(false);
  });

  it("矛盾のないアレンを指摘するとバッドエンド", () => {
    advance(engine);
    choose(engine, "時系列が破綻している者を指摘する");
    const bad = choose(engine, "アレン");
    expect(bad.text).toContain("取り残された");
    expect(engine.canContinue()).toBe(false);
  });
});

describe("水平思考 (lateral_door)", () => {
  let engine: ScenarioEngine;
  beforeEach(() => {
    engine = new ScenarioEngine(load("lateral_door.json"));
  });

  it("三つのちぐはぐを集めるまで本棚を回す選択肢は出ない", () => {
    advance(engine);
    expect(hasChoice(engine, "本棚を回転させてみる")).toBe(false);
    choose(engine, "鉄の扉を調べる");
    choose(engine, "床を調べる");
    expect(hasChoice(engine, "本棚を回転させてみる")).toBe(false); // 本棚未調査
    choose(engine, "本棚を調べる");
    expect(hasChoice(engine, "本棚を回転させてみる")).toBe(true);
  });

  it("思い込みのまま鉄扉を押しても出られず進行不能にもならない", () => {
    advance(engine);
    const step = choose(engine, "鉄の扉を力ずくで開けようとする");
    expect(step.text).toContain("びくともしない");
    expect(step.choices.length).toBeGreaterThan(0);
  });

  it("再解釈して本棚を回すと脱出する", () => {
    advance(engine);
    choose(engine, "鉄の扉を調べる");
    choose(engine, "床を調べる");
    choose(engine, "本棚を調べる");
    const end = choose(engine, "本棚を回転させてみる");
    expect(end.text).toContain("脱出した");
    expect(engine.canContinue()).toBe(false);
  });
});

describe("換字暗号 (cipher_levers)", () => {
  let engine: ScenarioEngine;
  beforeEach(() => {
    engine = new ScenarioEngine(load("cipher_levers.json"));
  });

  it("鍵表どおり 炎→水→風 の順で引くと封印が解け脱出する", () => {
    advance(engine);
    choose(engine, "隣室で鍵表を探す");
    choose(engine, "炎のレバーを引く");
    choose(engine, "水のレバーを引く");
    choose(engine, "風のレバーを引く");
    expect(engine.getVariable("opened")).toBe(true);
    const end = choose(engine, "扉を抜けて脱出する");
    expect(end.text).toContain("脱出した");
    expect(engine.canContinue()).toBe(false);
  });

  it("誤った順序は封印が戻し、やり直せる（デッドエンドにならない）", () => {
    advance(engine);
    choose(engine, "水のレバーを引く");
    choose(engine, "炎のレバーを引く");
    const step = choose(engine, "風のレバーを引く"); // 誤順
    expect(step.text).toContain("押し戻した");
    expect(engine.getVariable("opened")).toBe(false);
    expect(engine.getVariable("n")).toBe(0); // リセットされ再挑戦可能
    expect(step.choices.length).toBeGreaterThan(0);
  });
});
