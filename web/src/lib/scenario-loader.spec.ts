import { describe, expect, it, vi } from "vitest";
import { HttpScenarioLoader, ScenarioFetchError } from "./scenario-loader.ts";

const BASE_URL = "https://storage.googleapis.com/test-bucket";

/** UTF-8 BOM（inkjs-compiler の出力に付くことがある）。 */
const BOM = "﻿";

const VALID_INDEX = JSON.stringify({
  schemaVersion: 1,
  scenarios: [
    { id: "cave_escape", title: "洞窟からの脱出", description: "短編の脱出もの" },
    { id: "star_marrow_mine", title: "星髄鉱山" },
  ],
});

/** URL → レスポンス定義の対応で fetch を偽装する。 */
function fakeFetch(routes: Record<string, { status?: number; body?: string }>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes[url];
    if (!route) {
      return new Response("not found", { status: 404 });
    }
    return new Response(route.body ?? "", { status: route.status ?? 200 });
  }) as unknown as typeof fetch;
}

async function expectFetchError(promise: Promise<unknown>, code: ScenarioFetchError["code"]) {
  const error = await promise.then(
    () => {
      throw new Error("ScenarioFetchError が投げられるはずです");
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ScenarioFetchError);
  expect((error as ScenarioFetchError).code).toBe(code);
  return error as ScenarioFetchError;
}

describe("HttpScenarioLoader", () => {
  describe("fetchIndex", () => {
    it("scenarios.json を取得して一覧を返す", async () => {
      const loader = new HttpScenarioLoader(
        BASE_URL,
        fakeFetch({ [`${BASE_URL}/scenarios.json`]: { body: VALID_INDEX } }),
      );
      const index = await loader.fetchIndex();
      expect(index).toEqual([
        { id: "cave_escape", title: "洞窟からの脱出", description: "短編の脱出もの" },
        { id: "star_marrow_mine", title: "星髄鉱山" },
      ]);
    });

    it("末尾スラッシュ付きの baseUrl でも同じ URL に解決する", async () => {
      const fetchFn = fakeFetch({ [`${BASE_URL}/scenarios.json`]: { body: VALID_INDEX } });
      const loader = new HttpScenarioLoader(`${BASE_URL}/`, fetchFn);
      await expect(loader.fetchIndex()).resolves.toHaveLength(2);
    });

    it("結果をメモ化し、2 回目以降は fetch しない", async () => {
      const fetchFn = fakeFetch({ [`${BASE_URL}/scenarios.json`]: { body: VALID_INDEX } });
      const loader = new HttpScenarioLoader(BASE_URL, fetchFn);
      await loader.fetchIndex();
      await loader.fetchIndex();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("BOM 付きの scenarios.json も読める", async () => {
      const loader = new HttpScenarioLoader(
        BASE_URL,
        fakeFetch({ [`${BASE_URL}/scenarios.json`]: { body: BOM + VALID_INDEX } }),
      );
      await expect(loader.fetchIndex()).resolves.toHaveLength(2);
    });

    it("不正な文字種の id はインデックスから除外する", async () => {
      const index = JSON.stringify({
        schemaVersion: 1,
        scenarios: [
          { id: "ok_scenario", title: "OK" },
          { id: "../evil", title: "パス操作" },
          { id: "UPPER", title: "大文字" },
        ],
      });
      const loader = new HttpScenarioLoader(
        BASE_URL,
        fakeFetch({ [`${BASE_URL}/scenarios.json`]: { body: index } }),
      );
      await expect(loader.fetchIndex()).resolves.toEqual([{ id: "ok_scenario", title: "OK" }]);
    });

    it("HTTP エラー時は http_error を投げる", async () => {
      const loader = new HttpScenarioLoader(
        BASE_URL,
        fakeFetch({ [`${BASE_URL}/scenarios.json`]: { status: 403, body: "forbidden" } }),
      );
      const error = await expectFetchError(loader.fetchIndex(), "http_error");
      expect(error.status).toBe(403);
    });

    it("通信断（fetch reject）時は network_error を投げる", async () => {
      const fetchFn = vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }) as unknown as typeof fetch;
      const loader = new HttpScenarioLoader(BASE_URL, fetchFn);
      await expectFetchError(loader.fetchIndex(), "network_error");
    });

    it("ボディ読み込み（response.text()）中の失敗も network_error にラップする", async () => {
      const fetchFn = vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => {
          throw new TypeError("network error while reading body");
        },
      })) as unknown as typeof fetch;
      const loader = new HttpScenarioLoader(BASE_URL, fetchFn);
      await expectFetchError(loader.fetchIndex(), "network_error");
    });

    it("失敗はメモ化せず、復旧後に再試行できる", async () => {
      let failing = true;
      const fetchFn = vi.fn(async () => {
        if (failing) throw new TypeError("Failed to fetch");
        return new Response(VALID_INDEX, { status: 200 });
      }) as unknown as typeof fetch;
      const loader = new HttpScenarioLoader(BASE_URL, fetchFn);
      await expectFetchError(loader.fetchIndex(), "network_error");
      failing = false;
      await expect(loader.fetchIndex()).resolves.toHaveLength(2);
    });

    it("JSON でないインデックスは invalid_index を投げる", async () => {
      const loader = new HttpScenarioLoader(
        BASE_URL,
        fakeFetch({ [`${BASE_URL}/scenarios.json`]: { body: "<html>error</html>" } }),
      );
      await expectFetchError(loader.fetchIndex(), "invalid_index");
    });

    it("スキーマ不一致のインデックスは invalid_index を投げる", async () => {
      const loader = new HttpScenarioLoader(
        BASE_URL,
        fakeFetch({
          [`${BASE_URL}/scenarios.json`]: { body: JSON.stringify({ scenarios: "broken" }) },
        }),
      );
      await expectFetchError(loader.fetchIndex(), "invalid_index");
    });
  });

  describe("fetchScenarioJson", () => {
    const routes = {
      [`${BASE_URL}/scenarios.json`]: { body: VALID_INDEX },
      [`${BASE_URL}/cave_escape.json`]: { body: `${BOM}{"inkVersion":21,"root":[]}` },
      [`${BASE_URL}/star_marrow_mine.json`]: { body: "{broken json" },
    };

    it("インデックスに載っている id の JSON を BOM 除去して返す", async () => {
      const loader = new HttpScenarioLoader(BASE_URL, fakeFetch(routes));
      const json = await loader.fetchScenarioJson("cave_escape");
      expect(json).toBe('{"inkVersion":21,"root":[]}');
      expect(JSON.parse(json)).toEqual({ inkVersion: 21, root: [] });
    });

    it("インデックスに無い id は unknown_scenario を投げ、本文 fetch は行わない", async () => {
      const fetchFn = fakeFetch(routes);
      const loader = new HttpScenarioLoader(BASE_URL, fetchFn);
      await expectFetchError(loader.fetchScenarioJson("no_such_scenario"), "unknown_scenario");
      expect(fetchFn).toHaveBeenCalledTimes(1); // scenarios.json のみ
    });

    it("パス操作を含む id は unknown_scenario を投げ、fetch 自体を行わない", async () => {
      const fetchFn = fakeFetch(routes);
      const loader = new HttpScenarioLoader(BASE_URL, fetchFn);
      await expectFetchError(loader.fetchScenarioJson("../secret"), "unknown_scenario");
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("インデックスに載っているのに本文が無い場合は http_error を投げる", async () => {
      const loader = new HttpScenarioLoader(
        BASE_URL,
        fakeFetch({ [`${BASE_URL}/scenarios.json`]: { body: VALID_INDEX } }),
      );
      const error = await expectFetchError(loader.fetchScenarioJson("cave_escape"), "http_error");
      expect(error.status).toBe(404);
    });

    it("本文が JSON として壊れている場合は invalid_scenario_json を投げる", async () => {
      const loader = new HttpScenarioLoader(BASE_URL, fakeFetch(routes));
      await expectFetchError(loader.fetchScenarioJson("star_marrow_mine"), "invalid_scenario_json");
    });
  });
});
