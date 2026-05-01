// アクセス解析ラッパ (Issue #14)。詳細は README.md「アクセス解析」節を参照。
// CF Web Analytics 単独採用のため trackEvent は no-op スタブ、PV は CF beacon の自動検知に委ねる。

export type AnalyticsParams = Record<string, string | number | boolean>;

const CF_BEACON_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

export const isAnalyticsEnabled = Boolean(CF_BEACON_TOKEN);

export function trackEvent(_name: string, _params?: AnalyticsParams): void {
  if (!isAnalyticsEnabled) return;
  if (typeof window === "undefined") return;
  // GA4 併用が決まった時点でここで window.gtag('event', name, params) を呼ぶ。
}

export function trackPageView(_path: string): void {
  if (!isAnalyticsEnabled) return;
  if (typeof window === "undefined") return;
  // GA4 併用時はここで window.gtag('event', 'page_view', { page_path }) を呼ぶ。
}
