/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** シナリオ配信のベース URL（例: https://storage.googleapis.com/my-bucket）。 */
  readonly VITE_SCENARIO_BASE_URL?: string;
  /** Google Analytics 計測 ID（例: G-XXXXXXXXXX）。未設定なら計測しない。 */
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
