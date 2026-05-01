import { ArrowDown, ArrowRight } from "lucide-react";
import { SectionEyebrow } from "./SectionEyebrow";

export type Step = {
  stepNumber: number;
  title: string;
  body: string;
};

export type HowItWorksProps = {
  steps: ReadonlyArray<Step>;
};

export function HowItWorks({ steps }: HowItWorksProps) {
  return (
    <section
      aria-labelledby="how-heading"
      className="relative bg-canvas px-4 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-12 grid gap-6 sm:mb-16 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-10">
          <SectionEyebrow number="04" label="How It Works" />
          <h2
            id="how-heading"
            className="text-balance text-2xl font-bold leading-tight text-ink sm:text-3xl lg:text-4xl"
          >
            3 ステップで完了。
          </h2>
        </div>
        <ol className="flex flex-col items-stretch gap-10 sm:flex-row sm:items-start sm:gap-6">
          {steps.map((step, index) => (
            <li
              key={step.stepNumber}
              className="relative flex flex-1 flex-col gap-4 sm:items-start"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-xl font-bold text-canvas">
                  {step.stepNumber}
                </div>
                <span
                  aria-hidden="true"
                  className="text-xs font-medium uppercase tracking-warning text-ink/50"
                >
                  Step {String(step.stepNumber).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-base font-semibold leading-snug text-ink sm:text-lg">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-ink/75">{step.body}</p>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="mt-2 flex w-full items-center justify-center text-line sm:absolute sm:right-0 sm:top-6 sm:mt-0 sm:w-auto sm:translate-x-1/2"
                >
                  <ArrowDown className="h-6 w-6 sm:hidden" />
                  <ArrowRight className="hidden h-6 w-6 sm:block" />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
