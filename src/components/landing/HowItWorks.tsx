import { SectionEyebrow } from "./SectionEyebrow";

export type Step = {
  stepNumber: number;
  title: string;
  body: string;
  /** 各ステップに添える短いサブラベル（例: "Input", "Output", "Export"） */
  subLabel?: string;
};

export type HowItWorksProps = {
  steps: ReadonlyArray<Step>;
};

/**
 * 編集型ステップ。横並びの "running rule" + 大きな番号 + 縦書きサブラベル。
 * モバイルは縦積みで、各ステップ間に細い縦線を通す。
 */
export function HowItWorks({ steps }: HowItWorksProps) {
  return (
    <section
      aria-labelledby="how-heading"
      className="relative overflow-hidden bg-canvas px-4 py-24 sm:px-8 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0 opacity-60"
      />

      <div className="relative mx-auto max-w-screen-xl">
        <div className="mb-16 grid gap-8 lg:mb-24 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-16">
          <div className="flex flex-col gap-5">
            <SectionEyebrow number="04" label="How It Works" />
            <h2
              id="how-heading"
              className="text-balance font-mincho text-[1.9rem] font-medium leading-[1.25] text-ink sm:text-4xl lg:text-[3rem] lg:leading-[1.2]"
            >
              <span className="fig-mono text-accent">3</span> ステップで、
              <br className="hidden sm:block" />
              数字に変わる。
            </h2>
          </div>
          <p className="max-w-xl text-base leading-[1.85] text-ink/72 lg:justify-self-end lg:text-right">
            入力 → ダッシュボード → PDF。中断して数字を直しても、すべて
            ブラウザ内で完結します。送信も、登録も、ありません。
          </p>
        </div>

        {/* 上端の連続 rule (デスクトップのみ) */}
        <div
          aria-hidden="true"
          className="relative mb-10 hidden h-px bg-line/40 lg:block"
        >
          <span className="absolute -top-1.5 left-0 inline-flex h-3 w-3 rounded-full border border-line/60 bg-canvas" />
          <span className="absolute -top-1.5 right-0 inline-flex h-3 w-3 rounded-full border border-line/60 bg-canvas" />
        </div>

        <ol className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-12">
          {steps.map((step, index) => (
            <li
              key={step.stepNumber}
              className="relative flex flex-col gap-6"
            >
              {/* デスクトップ: ドットコネクタ */}
              <span
                aria-hidden="true"
                className="absolute -top-[44px] left-0 hidden h-3 w-3 -translate-y-px rounded-full bg-accent shadow-[0_0_0_4px_#F8F6F2,0_0_0_5px_#9CAEB8] lg:block"
              />

              {/* ステップ番号 + 縦書きラベル */}
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-start">
                  <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink/55">
                    Step
                  </span>
                  <span className="fig-mono text-[5.4rem] font-light leading-none text-ink sm:text-[6rem]">
                    {String(step.stepNumber).padStart(2, "0")}
                  </span>
                </div>
                {step.subLabel ? (
                  <span
                    aria-hidden="true"
                    className="mt-2 hidden font-mono text-[10px] uppercase tracking-[0.32em] text-ink/40 lg:block"
                  >
                    <span className="tate-gaki block">{step.subLabel}</span>
                  </span>
                ) : null}
              </div>

              <span
                aria-hidden="true"
                className="block h-px w-16 bg-accent"
              />

              <div className="flex flex-col gap-3">
                <h3 className="font-mincho text-[19px] font-semibold leading-snug text-ink sm:text-[20px]">
                  {step.title}
                </h3>
                <p className="max-w-md text-[14px] leading-[1.85] text-ink/72">
                  {step.body}
                </p>
              </div>

              {/* モバイル: 次のステップへの縦線 */}
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="ml-2 mt-2 h-10 w-px bg-line/40 lg:hidden"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
