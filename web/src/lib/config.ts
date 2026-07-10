/**
 * シナリオ配信のベース URL。
 * 本番は `VITE_SCENARIO_BASE_URL`（例: `https://storage.googleapis.com/<bucket>`）で注入し、
 * 未設定時はローカル開発向けに `public/scenarios/`（`pnpm --filter web sync:scenarios` で生成）
 * を参照する。
 */
export function scenarioBaseUrl(): string {
  const configured = import.meta.env.VITE_SCENARIO_BASE_URL;
  if (typeof configured === "string" && configured.trim().length > 0) {
    return configured;
  }
  return `${import.meta.env.BASE_URL}scenarios`;
}

/** Google Analytics の計測 ID。未設定なら undefined（計測なしで動作する）。 */
export function gaMeasurementId(): string | undefined {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  return typeof id === "string" && id.trim().length > 0 ? id : undefined;
}
