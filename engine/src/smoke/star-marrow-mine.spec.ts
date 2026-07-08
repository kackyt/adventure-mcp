import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ScenarioEngine } from "../domain/services/scenario-engine.ts";

// =====================================================================
//  star_marrow_mine.ink v2（探索×謎解き重心のサバイバル・RPG worked example）
//  のスモークプレイ。検証する規律:
//   - 固定コマンドパレットでクリアに到達できる（正規ルート）
//   - 謎の答え・解法が本文に出ない（ネタバレ非出現）
//   - ごり押し（メニュー順の機械プレイ・刃なし連打）は資源が尽きて敗北 ED
//   - ガード（蜘蛛・獣）と一度きりイベントのフラグ管理
//   - 有界探索でデッドエンドが無い（選択肢ゼロ = 終端 ED のみ）
//  シナリオは完全決定論（RANDOM 不使用）。
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORY_JSON = readFileSync(
  resolve(__dirname, "../../assets/star_marrow_mine.json"),
  "utf-8",
).replace(/^﻿/, "");

function newGame(): ScenarioEngine {
  const engine = new ScenarioEngine(STORY_JSON);
  playOut(engine);
  return engine;
}

/** 選択肢が出るか終端に達するまで本文を読み進め、読んだ本文を返す。 */
function playOut(engine: ScenarioEngine): string {
  let text = "";
  while (engine.canContinue()) {
    text += engine.continue();
  }
  return text;
}

/** パターンに一致する選択肢を選び、続く本文を返す。無ければ現在の選択肢一覧つきで失敗。 */
function choose(engine: ScenarioEngine, pattern: RegExp): string {
  const found = engine.currentChoices.find((c) => pattern.test(c.text));
  if (!found) {
    const labels = engine.currentChoices.map((c) => c.text).join(" / ");
    throw new Error(`選択肢 ${pattern} が見つからない。現在: ${labels}`);
  }
  engine.chooseChoiceIndex(found.index);
  return playOut(engine);
}

function isTerminal(engine: ScenarioEngine): boolean {
  return !engine.canContinue() && engine.currentChoices.length === 0;
}

/** B1 で装備を整え、B2 の排水を解いて三ノ坑まで進む。読んだ本文を全て返す。 */
function playToB3(engine: ScenarioEngine): string {
  let t = "";
  t += choose(engine, /うごく/) + choose(engine, /工具庫/);
  t += choose(engine, /とる/) + choose(engine, /つるはし/) + choose(engine, /カンテラ/);
  t += choose(engine, /やめる/);
  t += choose(engine, /うごく/) + choose(engine, /広場へ/);
  t += choose(engine, /うごく/) + choose(engine, /詰所/);
  t += choose(engine, /とる/) + choose(engine, /薬草/);
  t += choose(engine, /うごく/) + choose(engine, /広場へ/);
  t += choose(engine, /うごく/) + choose(engine, /坑口の中へ/);
  t += choose(engine, /たたく/) + choose(engine, /坑鼠/);
  t += choose(engine, /うごく/) + choose(engine, /二ノ坑へ下る/);
  t += choose(engine, /うごく/) + choose(engine, /堰の水路へ/);
  // 正順: 甲(膝) → 丙(腰) → 乙(胸)
  t += choose(engine, /たたく/) + choose(engine, /甲の堰/);
  t += choose(engine, /たたく/) + choose(engine, /丙の堰/);
  t += choose(engine, /たたく/) + choose(engine, /乙の堰/);
  t += choose(engine, /うごく/) + choose(engine, /巻揚場へ/);
  t += choose(engine, /うごく/) + choose(engine, /水の引いた坑道へ/);
  t += choose(engine, /たたく/) + choose(engine, /大蟹/);
  t += choose(engine, /うごく/) + choose(engine, /三ノ坑へ下る/);
  return t;
}

/** B3 の降り口を開けて下ノ坑の辻まで（蜘蛛→石片A→西の壁→初遭遇をやり過ごす）。 */
function playToB4(engine: ScenarioEngine): string {
  let t = playToB3(engine);
  t += choose(engine, /うごく/) + choose(engine, /東の坑道へ/);
  t += choose(engine, /たたく/) + choose(engine, /影蜘蛛/);
  t += choose(engine, /しらべる/) + choose(engine, /崩れた岩/) + choose(engine, /やめる/);
  t += choose(engine, /とる/) + choose(engine, /平たい石片/);
  t += choose(engine, /うごく/) + choose(engine, /分かれ道へ/);
  t += choose(engine, /うごく/) + choose(engine, /西の坑道へ/);
  t += choose(engine, /たたく/) + choose(engine, /行き止まりの壁/);
  t += choose(engine, /うごく/) + choose(engine, /下ノ坑へ降りる/);
  t += choose(engine, /うごく（物陰へ退く）/);
  return t;
}

/** （必要なら）炉で刃を鍛え、泉で全快して地底湖まで進む。 */
function playToLake(engine: ScenarioEngine, opts: { forgeBlade: boolean }): string {
  let t = playToB4(engine);
  if (opts.forgeBlade) {
    t += choose(engine, /うごく/) + choose(engine, /祠の間へ/);
    t += choose(engine, /とる/) + choose(engine, /台座の石片/);
    t += choose(engine, /うごく/) + choose(engine, /辻へ/);
    t += choose(engine, /うごく/) + choose(engine, /旧作業場へ/);
    t += choose(engine, /たたく/) + choose(engine, /壁/);
    t += choose(engine, /うごく/) + choose(engine, /炉の間へ/);
    t += choose(engine, /つかう/) + choose(engine, /つるはし（火床に）/);
    t += choose(engine, /うごく/) + choose(engine, /旧作業場へ/);
    t += choose(engine, /うごく/) + choose(engine, /辻へ/);
  }
  t += choose(engine, /うごく/) + choose(engine, /さらに下る/);
  t += choose(engine, /たたく/) + choose(engine, /甲殻の獣/);
  t += choose(engine, /うごく/) + choose(engine, /脇道の奥へ/);
  t += choose(engine, /つかう/) + choose(engine, /泉の水/);
  t += choose(engine, /うごく/) + choose(engine, /崩落回廊へ/);
  t += choose(engine, /うごく/) + choose(engine, /水の吸い込まれる隙間を抜ける/);
  return t;
}

describe("star_marrow_mine v2 スモークプレイ", () => {
  it("正規ルートでクリアに到達できる（探索→謎→鍛刀→排水→決着）", () => {
    const engine = newGame();
    playToLake(engine, { forgeBlade: true });
    // ①の二段再演: 水の行き先（捨て水路）を先に開けてから大水門
    choose(engine, /たたく/);
    choose(engine, /捨て水路の門/);
    choose(engine, /たたく/);
    choose(engine, /大水門/);
    choose(engine, /たたく/);
    choose(engine, /^あれ$/); // 一撃目（手傷）
    choose(engine, /たたく/);
    choose(engine, /^あれ$/); // 二撃目（決着）
    expect(engine.getVariable("boss_beaten")).toBe(true);
    choose(engine, /うごく/);
    choose(engine, /骸のもとへ/);
    choose(engine, /とる/);
    const endingText = choose(engine, /星髄/);
    expect(endingText).toContain("村への道を歩き出した");
    expect(isTerminal(engine)).toBe(true);
  });

  it("public_status は公開ステータスのみ・LIST は ', ' 区切りに正規化", () => {
    const engine = newGame();
    const status = engine.getPublicVariables();
    expect(Object.keys(status).sort()).toEqual([
      "conditions",
      "depth",
      "equipment",
      "herb_count",
      "player_hp",
    ]);
    expect(status.player_hp).toBe(20);
    expect(status.equipment).toBe("");
    // 装備を取ると LIST が文字列で公開される
    choose(engine, /うごく/);
    choose(engine, /工具庫/);
    choose(engine, /とる/);
    choose(engine, /つるはし/);
    choose(engine, /カンテラ/);
    expect(engine.getPublicVariables().equipment).toBe("pickaxe, lantern");
  });

  it("ネタバレ非出現: 解く前に手がかりを読み尽くしても答え・解法が本文に出ない", () => {
    const engine = newGame();
    let seen = "";
    seen += choose(engine, /うごく/) + choose(engine, /工具庫/);
    seen += choose(engine, /とる/) + choose(engine, /つるはし/) + choose(engine, /カンテラ/);
    seen += choose(engine, /やめる/);
    seen += choose(engine, /うごく/) + choose(engine, /広場へ/);
    seen += choose(engine, /はなす/) + choose(engine, /下ノ坑のこと/) + choose(engine, /やめる/);
    seen += choose(engine, /うごく/) + choose(engine, /詰所/);
    seen += choose(engine, /しらべる/) + choose(engine, /坑内図/) + choose(engine, /やめる/);
    seen += choose(engine, /うごく/) + choose(engine, /広場へ/);
    seen += choose(engine, /うごく/) + choose(engine, /坑口の中へ/);
    seen += choose(engine, /たたく/) + choose(engine, /坑鼠/);
    seen += choose(engine, /うごく/) + choose(engine, /二ノ坑へ下る/);
    seen += choose(engine, /しらべる/) + choose(engine, /帳面/) + choose(engine, /やめる/);
    seen += choose(engine, /うごく/) + choose(engine, /堰の水路へ/);
    seen += choose(engine, /しらべる/) + choose(engine, /甲の堰/) + choose(engine, /乙の堰/);
    seen += choose(engine, /丙の堰/) + choose(engine, /やめる/);
    for (const spoiler of [
      "低い堰から",
      "低い方から",
      "甲から",
      "順に開け",
      "壁の先に坑道",
      "埋め戻され",
      "石片を重ね",
      "組み合わせると",
      "刃でなければ",
      "星髄の刃が要る",
    ]) {
      expect(seen).not.toContain(spoiler);
    }
  });

  it("ごり押し敗北: 堰をメニュー順に叩き続ける機械プレイは逆流で力尽きる", () => {
    const engine = newGame();
    choose(engine, /うごく/);
    choose(engine, /工具庫/);
    choose(engine, /とる/);
    choose(engine, /つるはし/);
    choose(engine, /カンテラ/);
    choose(engine, /やめる/);
    choose(engine, /うごく/);
    choose(engine, /広場へ/);
    choose(engine, /うごく/);
    choose(engine, /坑口の中へ/);
    choose(engine, /たたく/);
    choose(engine, /坑鼠/);
    choose(engine, /うごく/);
    choose(engine, /二ノ坑へ下る/);
    choose(engine, /うごく/);
    choose(engine, /堰の水路へ/);
    // 観察せず、メニュー先頭の堰を叩き続ける
    let defeated = false;
    for (let i = 0; i < 40; i++) {
      if (isTerminal(engine)) {
        defeated = true;
        break;
      }
      choose(engine, /たたく/);
      const first = engine.currentChoices[0];
      engine.chooseChoiceIndex(first.index);
      playOut(engine);
    }
    expect(defeated).toBe(true);
    expect(engine.getVariable("drained")).toBe(false);
  });

  it("B6 誤順: 行き先を作らず大水門を叩くと逆流し、排水されない（①の再演が効いている）", () => {
    const engine = newGame();
    playToLake(engine, { forgeBlade: true });
    const hpBefore = engine.getVariable("player_hp") as number;
    const surge = choose(engine, /たたく/) + choose(engine, /大水門/);
    expect(surge).toContain("噴き返した");
    expect(engine.getVariable("lake_drained")).toBe(false);
    expect(engine.getVariable("player_hp")).toBe(hpBefore - 4);
    // 行き先を開ければ通る
    choose(engine, /たたく/);
    choose(engine, /捨て水路の門/);
    const drained = choose(engine, /たたく/) + choose(engine, /大水門/);
    expect(drained).toContain("泥の湖底");
    expect(engine.getVariable("lake_drained")).toBe(true);
  });

  it("前提ゲート: 刃を鍛えずにボスへ挑むと勝てず、薬草が尽きても敗北EDに到達する", () => {
    const engine = newGame();
    playToLake(engine, { forgeBlade: false });
    choose(engine, /たたく/);
    choose(engine, /捨て水路の門/);
    choose(engine, /たたく/);
    choose(engine, /大水門/);
    let text = "";
    for (let i = 0; i < 60; i++) {
      if (isTerminal(engine)) break;
      const hp = engine.getVariable("player_hp") as number;
      const herbs = engine.getVariable("herb_count") as number;
      if (hp <= 6 && herbs > 0 && engine.currentChoices.some((c) => /つかう/.test(c.text))) {
        text += choose(engine, /つかう/) + choose(engine, /薬草/);
      } else if (engine.currentChoices.some((c) => /たたく/.test(c.text))) {
        text += choose(engine, /たたく/) + choose(engine, /^あれ$/);
      } else {
        throw new Error("戦闘中に選択肢が尽きた（デッドエンド）");
      }
    }
    expect(engine.getVariable("boss_beaten")).toBe(false);
    expect(engine.getVariable("boss_wounded")).toBe(false);
    expect(isTerminal(engine)).toBe(true);
    expect(text).toContain("手応えが、まるでない");
  });

  it("ガード: 影蜘蛛を倒すまで石片Aに近づけない", () => {
    const engine = newGame();
    playToB3(engine);
    choose(engine, /うごく/);
    choose(engine, /東の坑道へ/);
    const blocked = choose(engine, /しらべる/) + choose(engine, /崩れた岩/);
    expect(blocked).toContain("これ以上は寄れない");
    expect(blocked).not.toContain("平たい石片");
    choose(engine, /やめる/);
    expect(engine.currentChoices.some((c) => /とる/.test(c.text))).toBe(false);
  });

  it("一度きり戦闘は再訪で再発しない", () => {
    const engine = newGame();
    choose(engine, /うごく/);
    choose(engine, /工具庫/);
    choose(engine, /とる/);
    choose(engine, /つるはし/);
    choose(engine, /やめる/);
    choose(engine, /うごく/);
    choose(engine, /広場へ/);
    choose(engine, /うごく/);
    choose(engine, /坑口の中へ/);
    choose(engine, /たたく/);
    choose(engine, /坑鼠/);
    expect(engine.getVariable("rat_beaten")).toBe(true);
    choose(engine, /うごく/);
    choose(engine, /広場へ/);
    choose(engine, /うごく/);
    choose(engine, /坑口の中へ/);
    choose(engine, /たたく/);
    expect(engine.currentChoices.some((c) => /坑鼠/.test(c.text))).toBe(false);
  });

  it("有界探索でデッドエンドが無い（全状態で選択肢あり or 終端ED）", () => {
    const engine = new ScenarioEngine(STORY_JSON);
    const visited = new Set<string>();
    const queue: string[] = [];

    playOut(engine);
    queue.push(engine.getState());

    const LIMIT = 600;
    while (queue.length > 0 && visited.size < LIMIT) {
      const state = queue.pop() as string;
      if (visited.has(state)) continue;
      visited.add(state);

      engine.loadState(state);
      const choices = engine.currentChoices;
      if (choices.length === 0) {
        // 終端 ED であること（本文が残ったまま宙吊りにならない）
        expect(engine.canContinue()).toBe(false);
        continue;
      }
      for (const choice of choices) {
        engine.loadState(state);
        engine.chooseChoiceIndex(choice.index);
        playOut(engine);
        const next = engine.getState();
        if (!visited.has(next)) queue.push(next);
      }
    }
    expect(visited.size).toBeGreaterThan(100);
  });
});
