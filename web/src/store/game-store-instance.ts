import { track } from "../lib/analytics.ts";
import { scenarioBaseUrl } from "../lib/config.ts";
import { HttpScenarioLoader } from "../lib/scenario-loader.ts";
import { createGameStore, type SaveStore } from "./game-store.ts";

/**
 * localStorage を安全に取得する。プライベートブラウジング・ストレージ制限・
 * サンドボックス iframe・SSR などで `window.localStorage` への参照や操作が
 * SecurityError を投げる／null になる場合があるため、利用不可なら no-op の
 * インメモリ実装に倒してアプリ全体のクラッシュを防ぐ。
 */
function getSafeLocalStorage(): SaveStore {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // 参照時点で SecurityError が飛ぶ環境（サードパーティ制限等）はフォールバックする
  }
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

/** アプリ全体で共有するゲーム進行ストアの実体（本番配線）。 */
export const gameStore = createGameStore({
  loader: new HttpScenarioLoader(scenarioBaseUrl()),
  storage: getSafeLocalStorage(),
  track,
});
