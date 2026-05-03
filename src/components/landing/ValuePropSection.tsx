import type { ReactNode } from "react";
import { SectionEyebrow } from "./SectionEyebrow";

export type ValueItem = {
  title: string;
  body: string;
  icon: ReactNode;
  /** 編集レイアウトで使う代表数値 (例: "3 年", "2,400h", "A4 1 枚") */
  metric?: string;
  metricUnit?: string;
};

export type ValuePropSectionProps = {
  items: ReadonlyArray<ValueItem>;
};

/**
 * 提供価値セクション。
 * 1 件目は左半分を占有する "Feature card"、残り 2 件は右半分の縦積み。
 * 編集デザインでありがちな非対称グリッドで「読み物としての価値訴求」を演出。
 */
export function ValuePropSection({ items }: ValuePropSectionProps) {
  const [primary, ...rest] = items;
  return (
    <section
      aria-labelledby="value-heading"
      className="relative overflow-hidden bg-[linear-gradient(180deg,_#efeeea_0%,_#f3f1ec_100%)] px-4 py-24 sm:px-8 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0 opacity-50"
      />

      {/* 大きな半透明数字を背景に流す (編集デザインのテクスチャ) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-12 select-none font-display text-[18rem] font-light leading-none text-ink/[0.04] sm:-right-24 sm:text-[24rem] lg:-right-32 lg:text-[28rem]"
      >
        03
      </div>

      <div className="relative mx-auto max-w-screen-xl">
        <div className="mb-16 grid gap-8 lg:mb-20 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-16">
          <div className="flex flex-col gap-5">
            <SectionEyebrow number="03" label="What You Get" />
            <h2
              id="value-heading"
              className="text-balance font-mincho text-[1.9rem] font-medium leading-[1.25] text-ink sm:text-4xl lg:text-[3rem] lg:leading-[1.2]"
            >
              診断するだけで、<br className="hidden sm:block" />
              <span className="fig-mono text-accent">3</span> つの数字が手に入る。
            </h2>
          </div>
          <p className="max-w-xl text-base leading-[1.85] text-ink/72 lg:justify-self-end lg:text-right">
            「止血できる金額」「逃している利益」「投資回収の月数」。
            稟議も、経営会議も、ベンダー交渉も、ここから始められます。
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:gap-7">
          {/* === Primary feature card === */}
          {primary ? (
            <article className="group relative flex flex-col gap-7 overflow-hidden rounded-[24px] border border-line/55 bg-canvas p-8 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-floating sm:p-10 lg:p-12">
              <span
                aria-hidden="true"
                className="bg-grain absolute inset-0 opacity-40"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl"
              />

              <div className="relative flex items-start justify-between">
                <span
                  aria-hidden="true"
                  className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-ink/15 bg-ink text-canvas shadow-card-hover"
                >
                  {primary.icon}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/55">
                  · Feature 01
                </span>
              </div>

              {primary.metric ? (
                <div className="relative flex items-baseline gap-3">
                  <span className="fig-mono text-[3.6rem] font-light leading-none text-ink sm:text-[4.2rem]">
                    {primary.metric}
                  </span>
                  {primary.metricUnit ? (
                    <span className="font-mincho text-[15px] text-ink/65">
                      {primary.metricUnit}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="relative flex flex-col gap-3">
                <h3 className="font-mincho text-xl font-semibold leading-snug text-ink sm:text-[22px]">
                  {primary.title}
                </h3>
                <p className="max-w-md text-[15px] leading-[1.85] text-ink/75">
                  {primary.body}
                </p>
              </div>
            </article>
          ) : null}

          {/* === Secondary cards === */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 lg:gap-7">
            {rest.map((item, index) => (
              <article
                key={item.title}
                className="group relative flex flex-1 flex-col gap-5 overflow-hidden rounded-[20px] border border-line/55 bg-canvas/85 p-7 backdrop-blur transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-floating"
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-line/55 bg-paper-warm text-ink/80 transition-colors duration-300 group-hover:border-ink group-hover:bg-ink group-hover:text-canvas"
                  >
                    {item.icon}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">
                    · Feature 0{index + 2}
                  </span>
                </div>

                {item.metric ? (
                  <div className="flex items-baseline gap-2">
                    <span className="fig-mono text-[2rem] font-light leading-none text-ink sm:text-[2.4rem]">
                      {item.metric}
                    </span>
                    {item.metricUnit ? (
                      <span className="font-mincho text-[13px] text-ink/60">
                        {item.metricUnit}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  <h3 className="font-mincho text-[17px] font-semibold leading-snug text-ink sm:text-[18px]">
                    {item.title}
                  </h3>
                  <p className="text-[14px] leading-[1.85] text-ink/72">
                    {item.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
