import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

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
      className="bg-canvas px-4 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-10 max-w-3xl space-y-3 sm:mb-12">
          <p className="text-sm font-medium uppercase tracking-warning text-accent">
            Issues
          </p>
          <h2
            id="problem-heading"
            className="text-balance text-2xl font-bold leading-tight text-ink sm:text-3xl lg:text-4xl"
          >
            こんな違和感、ありませんか？
          </h2>
        </div>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {items.map((item) => (
            <li key={item.title}>
              <Card className="h-full space-y-3">
                <div
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-line/20 text-accent"
                >
                  {item.icon}
                </div>
                <h3 className="text-base font-semibold leading-snug text-ink sm:text-lg">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-ink/75">
                  {item.body}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
