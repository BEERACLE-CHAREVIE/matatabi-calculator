import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { SectionEyebrow } from "./SectionEyebrow";

export type ProblemItem = {
  title: string;
  body: string;
  icon: ReactNode;
};

export type ProblemSectionProps = {
  items: ReadonlyArray<ProblemItem>;
};

export function ProblemSection({ items }: ProblemSectionProps) {
  return (
    <section
      aria-labelledby="problem-heading"
      className="relative bg-canvas px-4 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-12 grid gap-6 sm:mb-16 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-10">
          <SectionEyebrow number="02" label="Issues" />
          <h2
            id="problem-heading"
            className="text-balance text-2xl font-bold leading-tight text-ink sm:text-3xl lg:text-4xl"
          >
            こんな違和感、ありませんか？
          </h2>
        </div>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {items.map((item, index) => (
            <li key={item.title}>
              <Card className="relative h-full space-y-4 overflow-hidden p-7 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-card-hover">
                <span
                  aria-hidden="true"
                  className="absolute right-5 top-5 text-xs font-semibold tabular-nums tracking-warning text-line"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div
                  aria-hidden="true"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-line/20 text-accent"
                >
                  {item.icon}
                </div>
                <h3 className="text-base font-semibold leading-snug text-ink sm:text-lg">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-ink/75">{item.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
