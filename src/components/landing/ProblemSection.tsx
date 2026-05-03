import type { ReactNode } from "react";
import { SectionEyebrow } from "./SectionEyebrow";

export type ProblemItem = {
  title: string;
  body: string;
  icon: ReactNode;
  /**
   * 編集デザインで各カードに紐付ける "代表数値"。
   * 例: "¥34M / 年", "1.2 ヶ月", "Vendor lock-in"。
   * 未指定の場合は番号 (01, 02, ...) のみ表示。
   */
  metric?: string;
  metricCaption?: string;
};

export type ProblemSectionProps = {
  items: ReadonlyArray<ProblemItem>;
};

export function ProblemSection({ items }: ProblemSectionProps) {
  return (
    <section
      aria-labelledby="problem-heading"
      className="relative overflow-hidden bg-canvas px-4 py-24 sm:px-8 sm:py-32"
    >
      {/* ベース紙テクスチャ */}
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0 opacity-70"
      />

      <div className="relative mx-auto max-w-screen-xl">
        {/* ヘッダ: 編集風タイトルブロック */}
        <div className="mb-16 grid gap-8 lg:mb-20 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-16">
          <div className="flex flex-col gap-5">
            <SectionEyebrow number="02" label="Symptoms" />
            <h2
              id="problem-heading"
              className="text-balance font-mincho text-[1.9rem] font-medium leading-[1.25] text-ink sm:text-4xl lg:text-[3rem] lg:leading-[1.2]"
            >
              こんな違和感、<br className="hidden sm:block" />
              ありませんか？
            </h2>
          </div>
          <p className="max-w-xl text-base leading-[1.85] text-ink/72 sm:text-[15px] lg:justify-self-end lg:text-right">
            ベンダー任せの運用、月次の止まらない出血、決裁を待つ 1 ヶ月。
            あなたの会社で「説明できない費用」と「逃している利益」を、
            本診断は <span className="font-mono text-ink/85">5 つの質問</span> で炙り出します。
          </p>
        </div>

        {/* カード群 */}
        <ul className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          {items.map((item, index) => (
            <li key={item.title}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-line/55 bg-canvas/80 backdrop-blur-[1px] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-line hover:shadow-floating">
                {/* 上端の細いカラーバー (奇数: accent / 偶数: ink) */}
                <span
                  aria-hidden="true"
                  className={[
                    "absolute inset-x-0 top-0 h-[3px]",
                    index % 2 === 0 ? "bg-accent" : "bg-ink/70",
                  ].join(" ")}
                />

                {/* 番号 (大) と icon */}
                <div className="flex items-start justify-between gap-4 px-7 pt-9 sm:px-8 sm:pt-10">
                  <span className="fig-mono text-[2.6rem] font-light leading-none text-line/85 transition-colors duration-300 group-hover:text-ink sm:text-[3rem]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    aria-hidden="true"
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line/55 bg-paper-warm text-ink/75 transition-colors duration-300 group-hover:border-accent group-hover:bg-canvas group-hover:text-accent"
                  >
                    {item.icon}
                  </span>
                </div>

                {/* 細い rule */}
                <span
                  aria-hidden="true"
                  className="mx-7 my-6 h-px bg-line/50 sm:mx-8"
                />

                <div className="flex flex-1 flex-col gap-3 px-7 pb-9 sm:px-8 sm:pb-10">
                  <h3 className="font-mincho text-[17px] font-semibold leading-snug text-ink sm:text-[18px]">
                    {item.title}
                  </h3>
                  <p className="text-[14px] leading-[1.85] text-ink/72">
                    {item.body}
                  </p>

                  {item.metric ? (
                    <div className="mt-4 flex items-baseline gap-3 border-t border-line/40 pt-4">
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/45">
                        Avg.
                      </span>
                      <span className="fig-mono text-[18px] font-medium text-ink sm:text-[20px]">
                        {item.metric}
                      </span>
                      {item.metricCaption ? (
                        <span className="font-mincho text-[12px] text-ink/55">
                          {item.metricCaption}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
