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

/** B1 で装備を整え、B2 の排水を解いて三の坑まで進む。読んだ本文を全て返す。 */
function playToB3(engine: ScenarioEngine): string {
  let t = "";
  t += choose(engine, /うごく/) + choose(engine, /道具小屋/);
  t += choose(engine, /とる/) + choose(engine, /つるはし/) + choose(engine, /ランプ/);
  t += choose(engine, /やめる/);
  t += choose(engine, /うごく/) + choose(engine, /広場へ/);
  t += choose(engine, /うごく/) + choose(engine, /事務所/);
  t += choose(engine, /とる/) + choose(engine, /薬草/);
  t += choose(engine, /うごく/) + choose(engine, /広場へ/);
  t += choose(engine, /うごく/) + choose(engine, /鉱山の中へ/);
  t += choose(engine, /たたく/) + choose(engine, /大ねずみ/);
  t += choose(engine, /うごく/) + choose(engine, /二の坑へ下りる/);
  t += choose(engine, /うごく/) + choose(engine, /水門の部屋へ/);
  // 正順: 二(ひざ) → 三(こし) → 一(胸)
  t += choose(engine, /たたく/) + choose(engine, /二の水門/);
  t += choose(engine, /たたく/) + choose(engine, /三の水門/);
  t += choose(engine, /たたく/) + choose(engine, /一の水門/);
  t += choose(engine, /うごく/) + choose(engine, /機械室へ/);
  t += choose(engine, /うごく/) + choose(engine, /水のひいた坑道へ/);
  t += choose(engine, /たたく/) + choose(engine, /大ガニ/);
  t += choose(engine, /うごく/) + choose(engine, /三の坑へ下りる/);
  return t;
}

/** B3 の降り口を開けて下の坑の分かれ道まで（大グモ→かけらA→西のかべ→初遭遇をやり過ごす）。 */
function playToB4(engine: ScenarioEngine): string {
  let t = playToB3(engine);
  t += choose(engine, /うごく/) + choose(engine, /東の坑道へ/);
  t += choose(engine, /たたく/) + choose(engine, /大グモ/);
  t += choose(engine, /しらべる/) + choose(engine, /くずれた岩/) + choose(engine, /やめる/);
  t += choose(engine, /とる/) + choose(engine, /平たいかけら/);
  t += choose(engine, /うごく/) + choose(engine, /分かれ道へ/);
  t += choose(engine, /うごく/) + choose(engine, /西の坑道へ/);
  t += choose(engine, /たたく/) + choose(engine, /行き止まりのかべ/);
  t += choose(engine, /うごく/) + choose(engine, /下の坑へ下りる/);
  t += choose(engine, /うごく（物かげにかくれる）/);
  return t;
}

/** （必要なら）かじ場で刃をつくり、泉で全快して地底の湖まで進む。 */
function playToLake(engine: ScenarioEngine, opts: { forgeBlade: boolean }): string {
  let t = playToB4(engine);
  if (opts.forgeBlade) {
    t += choose(engine, /うごく/) + choose(engine, /ほこらへ/);
    t += choose(engine, /とる/) + choose(engine, /台のかけら/);
    t += choose(engine, /うごく/) + choose(engine, /分かれ道へ/);
    t += choose(engine, /うごく/) + choose(engine, /作業場へ/);
    t += choose(engine, /たたく/) + choose(engine, /かべ/);
    t += choose(engine, /うごく/) + choose(engine, /かじ場へ/);
    t += choose(engine, /つかう/) + choose(engine, /つるはし（星髄の火に）/);
    t += choose(engine, /うごく/) + choose(engine, /作業場へ/);
    t += choose(engine, /うごく/) + choose(engine, /分かれ道へ/);
  }
  t += choose(engine, /うごく/) + choose(engine, /さらに下りる/);
  t += choose(engine, /たたく/) + choose(engine, /岩ガメ/);
  t += choose(engine, /うごく/) + choose(engine, /わき道の奥へ/);
  t += choose(engine, /つかう/) + choose(engine, /泉の水/);
  t += choose(engine, /うごく/) + choose(engine, /崩れた通路へ/);
  t += choose(engine, /うごく/) + choose(engine, /水が流れこむすき間を抜ける/);
  return t;
}

describe("star_marrow_mine v2 スモークプレイ", () => {
  it("正規ルートでクリアに到達できる（探索→謎→鍛刀→排水→決着）", () => {
    const engine = newGame();
    playToLake(engine, { forgeBlade: true });
    // ①の二段再演: 水のにげ道（小さい水門）を先に開けてから大きい水門
    choose(engine, /たたく/);
    choose(engine, /小さい水門/);
    choose(engine, /たたく/);
    choose(engine, /大きい水門/);
    choose(engine, /たたく/);
    choose(engine, /^星喰い$/); // 一撃目（手傷）
    choose(engine, /たたく/);
    choose(engine, /^星喰い$/); // 二撃目（決着）
    expect(engine.getVariable("boss_beaten")).toBe(true);
    choose(engine, /うごく/);
    choose(engine, /星喰いのそばへ/);
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
    choose(engine, /道具小屋/);
    choose(engine, /とる/);
    choose(engine, /つるはし/);
    choose(engine, /ランプ/);
    expect(engine.getPublicVariables().equipment).toBe("pickaxe, lantern");
  });

  it("ネタバレ非出現: 解く前に手がかりを読み尽くしても答え・解法が本文に出ない", () => {
    const engine = newGame();
    let seen = "";
    seen += choose(engine, /うごく/) + choose(engine, /道具小屋/);
    seen += choose(engine, /とる/) + choose(engine, /つるはし/) + choose(engine, /ランプ/);
    seen += choose(engine, /やめる/);
    seen += choose(engine, /うごく/) + choose(engine, /広場へ/);
    seen +=
      choose(engine, /はなす/) + choose(engine, /下の坑のこと/) + choose(engine, /星喰いのこと/);
    seen += choose(engine, /やめる/);
    seen += choose(engine, /うごく/) + choose(engine, /事務所/);
    seen += choose(engine, /しらべる/) + choose(engine, /坑内の地図/) + choose(engine, /やめる/);
    seen += choose(engine, /うごく/) + choose(engine, /広場へ/);
    seen += choose(engine, /うごく/) + choose(engine, /鉱山の中へ/);
    seen += choose(engine, /たたく/) + choose(engine, /大ねずみ/);
    seen += choose(engine, /うごく/) + choose(engine, /二の坑へ下りる/);
    seen += choose(engine, /しらべる/) + choose(engine, /日誌/) + choose(engine, /やめる/);
    seen += choose(engine, /うごく/) + choose(engine, /水門の部屋へ/);
    seen += choose(engine, /しらべる/) + choose(engine, /一の水門/) + choose(engine, /二の水門/);
    seen += choose(engine, /三の水門/) + choose(engine, /やめる/);
    for (const spoiler of [
      "低い水門から",
      "低いほうから開け",
      "二の水門から",
      "順に開け",
      "かべのむこうに坑道",
      "うめられた",
      "かけらを重ね",
      "組み合わせると",
      "刃でなければ",
      "星髄の刃がいる",
    ]) {
      expect(seen).not.toContain(spoiler);
    }
  });

  it("ごり押し敗北: 水門をメニュー順に叩き続ける機械プレイは逆流で力尽きる", () => {
    const engine = newGame();
    choose(engine, /うごく/);
    choose(engine, /道具小屋/);
    choose(engine, /とる/);
    choose(engine, /つるはし/);
    choose(engine, /ランプ/);
    choose(engine, /やめる/);
    choose(engine, /うごく/);
    choose(engine, /広場へ/);
    choose(engine, /うごく/);
    choose(engine, /鉱山の中へ/);
    choose(engine, /たたく/);
    choose(engine, /大ねずみ/);
    choose(engine, /うごく/);
    choose(engine, /二の坑へ下りる/);
    choose(engine, /うごく/);
    choose(engine, /水門の部屋へ/);
    // 観察せず、メニュー先頭の水門を叩き続ける
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

  it("B6 誤順: 行き先を作らず大きい水門を叩くと逆流し、排水されない（①の再演が効いている）", () => {
    const engine = newGame();
    playToLake(engine, { forgeBlade: true });
    const hpBefore = engine.getVariable("player_hp") as number;
    const surge = choose(engine, /たたく/) + choose(engine, /大きい水門/);
    expect(surge).toContain("あふれ返って");
    expect(engine.getVariable("lake_drained")).toBe(false);
    expect(engine.getVariable("player_hp")).toBe(hpBefore - 4);
    // 行き先を開ければ通る
    choose(engine, /たたく/);
    choose(engine, /小さい水門/);
    const drained = choose(engine, /たたく/) + choose(engine, /大きい水門/);
    expect(drained).toContain("湖の底があらわれた");
    expect(engine.getVariable("lake_drained")).toBe(true);
  });

  it("前提ゲート: 刃を鍛えずにボスへ挑むと勝てず、薬草が尽きても敗北EDに到達する", () => {
    const engine = newGame();
    playToLake(engine, { forgeBlade: false });
    choose(engine, /たたく/);
    choose(engine, /小さい水門/);
    choose(engine, /たたく/);
    choose(engine, /大きい水門/);
    let text = "";
    for (let i = 0; i < 60; i++) {
      if (isTerminal(engine)) break;
      const hp = engine.getVariable("player_hp") as number;
      const herbs = engine.getVariable("herb_count") as number;
      if (hp <= 6 && herbs > 0 && engine.currentChoices.some((c) => /つかう/.test(c.text))) {
        text += choose(engine, /つかう/) + choose(engine, /薬草/);
      } else if (engine.currentChoices.some((c) => /たたく/.test(c.text))) {
        text += choose(engine, /たたく/) + choose(engine, /^星喰い$/);
      } else {
        throw new Error("戦闘中に選択肢が尽きた（デッドエンド）");
      }
    }
    expect(engine.getVariable("boss_beaten")).toBe(false);
    expect(engine.getVariable("boss_wounded")).toBe(false);
    expect(isTerminal(engine)).toBe(true);
    expect(text).toContain("手ごたえが、まるでない");
  });

  it("ガード: 大グモを倒すまでかけらAに近づけない", () => {
    const engine = newGame();
    playToB3(engine);
    choose(engine, /うごく/);
    choose(engine, /東の坑道へ/);
    const blocked = choose(engine, /しらべる/) + choose(engine, /くずれた岩/);
    expect(blocked).toContain("これ以上は寄れない");
    expect(blocked).not.toContain("平たいかけら");
    choose(engine, /やめる/);
    expect(engine.currentChoices.some((c) => /とる/.test(c.text))).toBe(false);
  });

  it("一度きり戦闘は再訪で再発しない", () => {
    const engine = newGame();
    choose(engine, /うごく/);
    choose(engine, /道具小屋/);
    choose(engine, /とる/);
    choose(engine, /つるはし/);
    choose(engine, /やめる/);
    choose(engine, /うごく/);
    choose(engine, /広場へ/);
    choose(engine, /うごく/);
    choose(engine, /鉱山の中へ/);
    choose(engine, /たたく/);
    choose(engine, /大ねずみ/);
    expect(engine.getVariable("rat_beaten")).toBe(true);
    choose(engine, /うごく/);
    choose(engine, /広場へ/);
    choose(engine, /うごく/);
    choose(engine, /鉱山の中へ/);
    choose(engine, /たたく/);
    expect(engine.currentChoices.some((c) => /大ねずみ/.test(c.text))).toBe(false);
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
