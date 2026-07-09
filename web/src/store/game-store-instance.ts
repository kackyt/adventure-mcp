import { scenarioBaseUrl } from "../lib/config.ts";
import { HttpScenarioLoader } from "../lib/scenario-loader.ts";
import { createGameStore } from "./game-store.ts";

/** アプリ全体で共有するゲーム進行ストアの実体（本番配線）。 */
export const gameStore = createGameStore({
  loader: new HttpScenarioLoader(scenarioBaseUrl()),
  storage: window.localStorage,
});
