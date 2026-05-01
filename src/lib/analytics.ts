// アクセス解析の薄いラッパ (Issue #14)
//
// 採用ツール: Cloudflare Web Analytics 単独
// - PV は CF beacon が SPA を含めて自動検知するため、当ラッパからは送信しない
// - カスタムイベントは CF が未対応のため trackEvent は no-op スタブ
// - 後続 Issue (#2/#3/#4/#5) で `import { trackEvent } from "@/lib/analytics"` で
//   フックを差し込み、将来 GA4 を併用する際に内部実装だけ差し替える設計
//
// ガード方針:
// - process.env.NEXT_PUBLIC_CF_BEACON_TOKEN 未設定時は no-op
//   (Production スコープのみ環境変数を設定し、Preview/Local では送信オフ)

export type AnalyticsParams = Record<string, string | number | boolean>;

const CF_BEACON_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

export const isAnalyticsEnabled = Boolean(CF_BEACON_TOKEN);

export function trackEvent(name: string, params?: AnalyticsParams): void {
  if (!isAnalyticsEnabled) return;
  if (typeof window === "undefined") return;

  // CF Web Analytics は任意イベントを未サポート。
  // GA4 併用が決まった時点でここで window.gtag('event', name, params) を呼ぶ。
  void name;
  void params;
}

export function trackPageView(path: string): void {
  if (!isAnalyticsEnabled) return;
  if (typeof window === "undefined") return;

  // CF Web Analytics は SPA 遷移を自動検知するため明示送信は不要。
  // GA4 併用時はここで window.gtag('event', 'page_view', { page_path }) を呼ぶ。
  void path;
}
