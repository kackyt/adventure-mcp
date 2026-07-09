declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Google Analytics (gtag.js) を初期化する。計測 ID 未設定なら何もしない。
 * gtag.js は `arguments` オブジェクトが push されることを前提とするため、公式スニペットと
 * 同じ形で実装する。
 */
export function initAnalytics(measurementId: string | undefined): void {
  if (!measurementId) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer ?? [];
  function gtag(): void {
    // biome-ignore lint/complexity/noArguments: gtag.js は Arguments オブジェクトそのものを要求する
    window.dataLayer?.push(arguments);
  }
  window.gtag = gtag as (...args: unknown[]) => void;
  window.gtag("js", new Date());
  window.gtag("config", measurementId);
}
