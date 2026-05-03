/**
 * NumericTicker — セクション間に挟む水平スクロールの ROI ティッカー。
 * 装飾要素なので role="presentation" 相当の aria-hidden で SR から除外。
 * 1 行分のテキストを 2 セット並べて translateX(-50%) で無限ループさせる。
 */
type TickerEntry = {
  label: string;
  value: string;
  unit?: string;
};

const DEFAULT_ENTRIES: ReadonlyArray<TickerEntry> = [
  { label: "想定 止血額", value: "¥2,400,000", unit: "/ 年" },
  { label: "改修待ち削減", value: "−18 日", unit: "/ 件" },
  { label: "機会損失", value: "¥3,600,000", unit: "/ 年" },
  { label: "PDF 出力", value: "A4 1 枚", unit: "/ 即時" },
  { label: "所要時間", value: "5 分", unit: "/ 完結" },
  { label: "投資回収", value: "11.4 ヶ月", unit: "/ 中央値" },
  { label: "対象規模", value: "20 〜 300 名", unit: "/ 中小" },
];

export type NumericTickerProps = {
  entries?: ReadonlyArray<TickerEntry>;
  className?: string;
};

export function NumericTicker({ entries = DEFAULT_ENTRIES, className }: NumericTickerProps) {
  const all = [...entries, ...entries];
  return (
    <div
      aria-hidden="true"
      className={[
        "relative overflow-hidden border-y border-line/40 bg-paper-warm",
        className ?? "",
      ].join(" ")}
    >
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-60" />
      {/* 端のグラデーションフェード */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-paper-warm to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-paper-warm to-transparent sm:w-24" />

      <div className="ticker-track flex w-max animate-ticker py-5 sm:py-6">
        {all.map((entry, index) => (
          <div
            key={`${entry.label}-${index}`}
            className="flex shrink-0 items-baseline gap-3 border-l border-line/30 px-8 first:border-l-0 sm:px-12"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/55 sm:text-xs">
              {entry.label}
            </span>
            <span className="fig-mono text-lg font-medium text-ink sm:text-xl">
              {entry.value}
            </span>
            {entry.unit ? (
              <span className="font-mincho text-xs text-ink/55 sm:text-sm">
                {entry.unit}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
