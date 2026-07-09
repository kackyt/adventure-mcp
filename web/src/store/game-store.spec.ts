import { compileInkToJson } from "engine/src/browser.ts";
import { describe, expect, it, vi } from "vitest";
import {
  AUTOSAVE_KEY_PREFIX,
  createGameStore,
  type SaveStore,
  type ScenarioSource,
} from "./game-store.ts";

/**
 * 選択肢・自由入力（# input）・公開ステータス・終端をすべて含む検証用ミニシナリオ。
 * 洞窟 → 数字盤（正解 1234）→ 脱出成功、の流れで Web プレイの主要経路を通す。
 */
const FIXTURE_INK = `
VAR hp = 10
VAR door_code = ""
VAR public_status = "hp"

-> start

=== start ===
洞窟の入り口に立っている。
* [中へ進む] -> door
* [引き返す] -> retreat

=== door ===
扉には数字盤が付いている。 # input: door_code
+ [数字を入力する] -> door_check

=== door_check ===
{ door_code == "1234":
    -> goal
- else:
    ~ hp = hp - 1
    -> door
}

=== retreat ===
あなたは引き返した。
-> END

=== goal ===
脱出成功！
-> END
`;

const STORY_JSON = compileInkToJson(FIXTURE_INK);

/** インメモリの localStorage 代替。 */
class MemoryStorage implements SaveStore {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

function fakeLoader(): ScenarioSource {
  return {
    fetchIndex: async () => [
      { id: "cave_test", title: "テスト洞窟", description: "検証用ミニシナリオ" },
    ],
    fetchScenarioJson: async (id: string) => {
      if (id !== "cave_test") throw new Error(`不明なシナリオです: ${id}`);
      return STORY_JSON;
    },
  };
}

function newStore(storage: SaveStore = new MemoryStorage()) {
  const store = createGameStore({
    loader: fakeLoader(),
    storage,
    now: () => new Date("2026-07-09T00:00:00.000Z"),
  });
  return { store, storage };
}

describe("game-store", () => {
  it("シナリオ一覧を取得して表示できる", async () => {
    const { store } = newStore();
    await store.getState().loadScenarios();
    expect(store.getState().scenarios).toEqual([
      { id: "cave_test", title: "テスト洞窟", description: "検証用ミニシナリオ" },
    ]);
  });

  it("一覧取得に失敗したらエラー文言を保持し、空一覧に倒す", async () => {
    const store = createGameStore({
      loader: {
        fetchIndex: async () => {
          throw new Error("接続できません");
        },
        fetchScenarioJson: async () => {
          throw new Error("unreachable");
        },
      },
      storage: new MemoryStorage(),
    });
    await store.getState().loadScenarios();
    expect(store.getState().scenarios).toEqual([]);
    expect(store.getState().error).toContain("接続できません");
  });

  it("ゲーム開始で本文・選択肢・公開ステータスが得られ、自動セーブされる", async () => {
    const { store, storage } = newStore();
    await store.getState().loadScenarios();
    await store.getState().startGame("cave_test");

    const state = store.getState();
    expect(state.phase).toBe("playing");
    expect(state.scenarioTitle).toBe("テスト洞窟");
    expect(state.snapshot?.scene).toContain("洞窟の入り口");
    expect(state.snapshot?.choices.map((c) => c.text)).toEqual(["中へ進む", "引き返す"]);
    expect(state.snapshot?.status).toEqual({ hp: 10 });
    expect(state.snapshot?.awaitingInput).toBe(false);
    expect(storage.getItem(`${AUTOSAVE_KEY_PREFIX}cave_test`)).not.toBeNull();
  });

  it("選択肢 → 自由入力（誤答→正答）→ 終端まで進行できる", async () => {
    const { store } = newStore();
    await store.getState().startGame("cave_test");

    store.getState().choose(0);
    let snapshot = store.getState().snapshot;
    expect(snapshot?.scene).toContain("数字盤");
    expect(snapshot?.awaitingInput).toBe(true);
    // 入力モード中は選択肢を秘匿し、submitInput だけが前進経路になる
    expect(snapshot?.choices).toEqual([]);

    store.getState().submitInput("9999");
    snapshot = store.getState().snapshot;
    expect(snapshot?.awaitingInput).toBe(true);
    expect(snapshot?.status).toEqual({ hp: 9 });

    // 全角入力は NFKC 正規化されて正誤判定される
    store.getState().submitInput("１２３４");
    snapshot = store.getState().snapshot;
    expect(snapshot?.scene).toContain("脱出成功");
    expect(snapshot?.ended).toBe(true);
    expect(snapshot?.awaitingInput).toBe(false);

    // 行動履歴に選択ラベルと入力値が刻まれている
    const turns = store.getState().turns;
    expect(turns.some((t) => t.choice === "中へ進む")).toBe(true);
    expect(turns.some((t) => t.choice === "入力: 9999")).toBe(true);
    expect(turns.some((t) => t.choice === "入力: 1234")).toBe(true);
    expect(turns[turns.length - 1].choice).toBeNull();
  });

  it("終端到達後は choose がエラー文言になり、進行しない", async () => {
    const { store } = newStore();
    await store.getState().startGame("cave_test");
    store.getState().choose(1); // 引き返す → END
    expect(store.getState().snapshot?.ended).toBe(true);

    store.getState().choose(0);
    expect(store.getState().error).toContain("終了");
    expect(store.getState().snapshot?.ended).toBe(true);
  });

  it("範囲外の選択肢はエラー文言になり、状態は進まない", async () => {
    const { store } = newStore();
    await store.getState().startGame("cave_test");
    const before = store.getState().snapshot;
    store.getState().choose(99);
    expect(store.getState().error).toContain("範囲外");
    expect(store.getState().snapshot).toBe(before);
  });

  it("自由入力待ちに choose するとエラー文言になる", async () => {
    const { store } = newStore();
    await store.getState().startGame("cave_test");
    store.getState().choose(0);
    store.getState().choose(0);
    expect(store.getState().error).toContain("自由入力待ち");
  });

  it("リロード相当（別ストア＋同じ storage）で自動セーブから再開できる", async () => {
    const storage = new MemoryStorage();
    const { store: first } = newStore(storage);
    await first.getState().startGame("cave_test");
    first.getState().choose(0); // 入力待ちまで進めてから「リロード」

    const { store: second } = newStore(storage);
    expect(second.getState().hasAutoSave("cave_test")).toBe(true);
    await second.getState().resumeGame("cave_test");

    const snapshot = second.getState().snapshot;
    expect(second.getState().phase).toBe("playing");
    expect(snapshot?.awaitingInput).toBe(true);
    expect(snapshot?.scene).toContain("数字盤");
    // 再開後もそのまま正答して完走できる
    second.getState().submitInput("1234");
    expect(second.getState().snapshot?.ended).toBe(true);
  });

  it("セーブデータのエクスポート → インポートで進行状況を復元できる", async () => {
    const { store } = newStore();
    await store.getState().startGame("cave_test");
    store.getState().choose(0);
    store.getState().submitInput("9999"); // hp 9 の途中経過を作る
    const saveText = store.getState().exportSave();

    const { store: other } = newStore();
    await other.getState().importSave(saveText);
    const snapshot = other.getState().snapshot;
    expect(other.getState().phase).toBe("playing");
    expect(snapshot?.status).toEqual({ hp: 9 });
    expect(snapshot?.awaitingInput).toBe(true);
    expect(other.getState().turns.some((t) => t.choice === "入力: 9999")).toBe(true);

    other.getState().submitInput("1234");
    expect(other.getState().snapshot?.ended).toBe(true);
  });

  it("壊れたセーブ文字列のインポートはエラー文言になり、一覧に留まる", async () => {
    const { store } = newStore();
    await store.getState().importSave("これはセーブデータではない");
    expect(store.getState().phase).toBe("list");
    expect(store.getState().error).toContain("形式");
  });

  it("タイトルへ戻るとプレイ状態が破棄される（自動セーブは残る）", async () => {
    const { store, storage } = newStore();
    await store.getState().startGame("cave_test");
    store.getState().backToList();
    expect(store.getState().phase).toBe("list");
    expect(store.getState().snapshot).toBeNull();
    expect(storage.getItem(`${AUTOSAVE_KEY_PREFIX}cave_test`)).not.toBeNull();
  });
});

describe("game-store の計測イベント", () => {
  function newTrackedStore(storage: SaveStore = new MemoryStorage()) {
    const track = vi.fn();
    const store = createGameStore({
      loader: fakeLoader(),
      storage,
      now: () => new Date("2026-07-09T00:00:00.000Z"),
      track,
    });
    return { store, storage, track };
  }

  it("ゲーム開始で scenario_start を送る", async () => {
    const { store, track } = newTrackedStore();
    await store.getState().startGame("cave_test");
    expect(track).toHaveBeenCalledWith("scenario_start", { scenario_id: "cave_test" });
  });

  it("開始に失敗したら scenario_start を送らない", async () => {
    const { store, track } = newTrackedStore();
    await store.getState().startGame("no_such_scenario");
    expect(track).not.toHaveBeenCalled();
  });

  it("終端到達で scenario_complete をターン数付きで送る", async () => {
    const { store, track } = newTrackedStore();
    await store.getState().startGame("cave_test");
    store.getState().choose(1); // 引き返す → END
    expect(track).toHaveBeenCalledWith(
      "scenario_complete",
      expect.objectContaining({ scenario_id: "cave_test", turns: expect.any(Number) }),
    );
  });

  it("終端に達しない選択では scenario_complete を送らない", async () => {
    const { store, track } = newTrackedStore();
    await store.getState().startGame("cave_test");
    track.mockClear();
    store.getState().choose(0); // 数字盤（入力待ち）へ。まだ終わらない
    expect(track).not.toHaveBeenCalledWith("scenario_complete", expect.anything());
  });

  it("エクスポートで save_export を送る", async () => {
    const { store, track } = newTrackedStore();
    await store.getState().startGame("cave_test");
    store.getState().exportSave();
    expect(track).toHaveBeenCalledWith("save_export", { scenario_id: "cave_test" });
  });

  it("インポート成功で save_import を送る", async () => {
    const { store } = newTrackedStore();
    await store.getState().startGame("cave_test");
    const saveText = store.getState().exportSave();

    const { store: other, track } = newTrackedStore();
    await other.getState().importSave(saveText);
    expect(track).toHaveBeenCalledWith("save_import", { scenario_id: "cave_test" });
  });

  it("インポート失敗では save_import を送らない", async () => {
    const { store, track } = newTrackedStore();
    await store.getState().importSave("壊れたデータ");
    expect(track).not.toHaveBeenCalled();
  });

  it("続きからの再開で resume_autosave を送る", async () => {
    const storage = new MemoryStorage();
    const { store: first } = newTrackedStore(storage);
    await first.getState().startGame("cave_test");

    const { store: second, track } = newTrackedStore(storage);
    await second.getState().resumeGame("cave_test");
    expect(track).toHaveBeenCalledWith("resume_autosave", { scenario_id: "cave_test" });
  });
});
