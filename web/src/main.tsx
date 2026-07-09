import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { initAnalytics } from "./lib/analytics.ts";
import { gaMeasurementId } from "./lib/config.ts";

initAnalytics(gaMeasurementId());

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root 要素が見つかりません。index.html を確認してください。");
}
createRoot(container).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="auto">
      <App />
    </MantineProvider>
  </StrictMode>,
);
