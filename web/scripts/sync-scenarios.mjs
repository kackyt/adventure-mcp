// ローカル開発用: engine/assets のコンパイル済みシナリオを web/public/scenarios へ同期し、
// シナリオ一覧インデックス（scenarios.json）を生成する。
// VITE_SCENARIO_BASE_URL 未設定時、dev サーバーはこのディレクトリを配信する。
// タイトル等のメタデータを直したい場合は、生成された scenarios.json を GCS 側で編集する運用とし、
// このスクリプトは id をそのままタイトルに使う。
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ID_PATTERN = /^[a-z0-9_]+$/;
const assetsDir = fileURLToPath(new URL("../../engine/assets/", import.meta.url));
const outDir = fileURLToPath(new URL("../public/scenarios/", import.meta.url));

mkdirSync(outDir, { recursive: true });

const ids = readdirSync(assetsDir)
  .filter((name) => name.endsWith(".json"))
  .map((name) => name.slice(0, -".json".length))
  .filter((id) => ID_PATTERN.test(id))
  .sort();

for (const id of ids) {
  copyFileSync(`${assetsDir}${id}.json`, `${outDir}${id}.json`);
}

const index = {
  schemaVersion: 1,
  scenarios: ids.map((id) => ({ id, title: id })),
};
writeFileSync(`${outDir}scenarios.json`, `${JSON.stringify(index, null, 2)}\n`);

console.log(`synced ${ids.length} scenario(s) -> ${outDir}`);
