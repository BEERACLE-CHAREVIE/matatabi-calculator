/**
 * 編集デザイン専用の線細モノラインアイコン。
 * - stroke 1.25, currentColor を継承し、親側で text-ink/accent を切替。
 * - viewBox 24x24、aria は呼び出し側の <span aria-hidden> に委ねる。
 * - 各アイコンは「数字を扱う伝票」の語彙（コイン縦断面 / 砂時計 / 警告罫線 / 電卓 /
 *   下降折れ線 / ファイル余白）を細線で抽象化し、lucide のジェネリック感を排する。
 */
type IconProps = {
  className?: string;
};

const COMMON = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Coin / Vendor cost — 縦断面の硬貨 */
export function CoinStackIcon({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className} aria-hidden="true">
      <ellipse cx="12" cy="6.5" rx="7" ry="2.4" />
      <path d="M5 6.5v3.6c0 1.32 3.13 2.4 7 2.4s7-1.08 7-2.4V6.5" />
      <path d="M5 12v3.6c0 1.32 3.13 2.4 7 2.4s7-1.08 7-2.4V12" />
      <path d="M5 17.5v0c0 1.32 3.13 2.4 7 2.4s7-1.08 7-2.4" />
      <path d="M9.5 6.4l5 0" strokeWidth="0.9" opacity="0.55" />
    </svg>
  );
}

/** Hourglass / 待ち時間 — 細い砂時計、中央に砂粒 */
export function HourglassThinIcon({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className} aria-hidden="true">
      <path d="M6.5 3h11" />
      <path d="M6.5 21h11" />
      <path d="M7 3v2.5c0 2 5 4 5 6.5s-5 4.5-5 6.5V21" />
      <path d="M17 3v2.5c0 2-5 4-5 6.5s5 4.5 5 6.5V21" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <path d="M11 16.4c.6-.4 1.4-.4 2 0" strokeWidth="0.9" opacity="0.6" />
    </svg>
  );
}

/** Warning / 違和感 — 細い三角に縦罫 */
export function AlertRulerIcon({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className} aria-hidden="true">
      <path d="M12 3.5L21 19.5H3z" />
      <path d="M12 9.5v5" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
      <path d="M7.4 17.5h9.2" strokeWidth="0.6" opacity="0.5" />
    </svg>
  );
}

/** Calculator / 試算 — シンプルな電卓、数字グリッド 4 ドット */
export function LedgerCalcIcon({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className} aria-hidden="true">
      <rect x="4.5" y="3" width="15" height="18" rx="2" />
      <rect x="7" y="5.5" width="10" height="3" rx="0.4" />
      <circle cx="8.5" cy="12.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="16" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16" r="0.7" fill="currentColor" stroke="none" />
      <path d="M14.7 16h2.3" />
      <path d="M8.5 18.4h6.5" strokeWidth="0.7" opacity="0.5" />
    </svg>
  );
}

/** Trending down / 機会損失の可視化 — 右肩下がりの折れ線 + 軸 */
export function TrendDownLineIcon({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className} aria-hidden="true">
      <path d="M3.5 5v15h17" />
      <path d="M6 9.5l3.5 3 3-2.5 4 4.5 4-6" />
      <path d="M20 11.5V5h-6.5" />
      <circle cx="6" cy="9.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="12.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="14.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="8.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** File export / PDF レポート — 折り返し付きの紙、罫線 + 矢印 */
export function FileExportIcon({ className }: IconProps) {
  return (
    <svg {...COMMON} className={className} aria-hidden="true">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 12h5" strokeWidth="0.7" opacity="0.6" />
      <path d="M9.5 14.5h5" strokeWidth="0.7" opacity="0.6" />
      <path d="M9.5 17h3" strokeWidth="0.7" opacity="0.6" />
      {/* down-export 矢印 */}
      <path d="M16.5 16.5v3.5" />
      <path d="M15 18.7l1.5 1.5 1.5-1.5" />
    </svg>
  );
}
