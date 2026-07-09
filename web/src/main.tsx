import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// NOTE: プレイ UI 本体は Issue #25 で実装する。ここでは web パッケージの起動導線のみを用意する。
function Placeholder() {
  return <p>Adventure MCP Web - プレイ UI は準備中です。</p>;
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root 要素が見つかりません。index.html を確認してください。");
}
createRoot(container).render(
  <StrictMode>
    <Placeholder />
  </StrictMode>,
);
