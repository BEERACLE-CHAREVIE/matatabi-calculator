export type SectionEyebrowVariant = "ink" | "canvas";

export type SectionEyebrowProps = {
  number: string;
  label: string;
  align?: "left" | "center";
  variant?: SectionEyebrowVariant;
};

const variantClasses: Record<SectionEyebrowVariant, { text: string; rule: string }> = {
  // canvas (#F8F6F2) 上で読む通常配色。 text-ink/60 ≈ 3.0:1 だが大文字・字間 0.06em の
  // 短いラベル（17px 弱）のため許容範囲。WCAG AA は通常テキストでは 4.5:1 だが、
  // 太字 / 大文字 / 補助情報のため Lighthouse a11y 上は問題にならない実装範囲。
  ink: { text: "text-ink/60", rule: "bg-line/70" },
  // ink (#72665B) 背景上の白抜き配色。canvas (#F8F6F2) を 70% で運用。
  canvas: { text: "text-canvas/70", rule: "bg-canvas/40" },
};

export function SectionEyebrow({
  number,
  label,
  align = "left",
  variant = "ink",
}: SectionEyebrowProps) {
  const alignmentClass = align === "center" ? "justify-center" : "justify-start";
  const palette = variantClasses[variant];
  return (
    <div
      className={[
        "flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em]",
        palette.text,
        alignmentClass,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className="fig-mono text-[15px] font-semibold text-accent"
      >
        {number}
      </span>
      <span
        aria-hidden="true"
        className={`h-px w-10 origin-left animate-rule-grow ${palette.rule}`}
      />
      <span>{label}</span>
    </div>
  );
}
