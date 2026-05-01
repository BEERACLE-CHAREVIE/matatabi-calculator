import type { ReactNode } from "react";
import { SectionEyebrow } from "./SectionEyebrow";

export type ValueItem = {
  title: string;
  body: string;
  icon: ReactNode;
};

export type ValuePropSectionProps = {
  items: ReadonlyArray<ValueItem>;
};

export function ValuePropSection({ items }: ValuePropSectionProps) {
  return (
    <section
      aria-labelledby="value-heading"
      className="relative bg-line/10 px-4 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-12 grid gap-6 sm:mb-16 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-10">
          <SectionEyebrow number="03" label="What You Get" />
          <h2
            id="value-heading"
            className="text-balance text-2xl font-bold leading-tight text-ink sm:text-3xl lg:text-4xl"
          >
            診断するだけで、3 つの数字が手に入ります。
          </h2>
        </div>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {items.map((item, index) => (
            <li
              key={item.title}
              className="group relative flex h-full flex-col gap-4 rounded-2xl border border-line/40 bg-canvas p-7 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-card-hover"
            >
              <span
                aria-hidden="true"
                className="text-3xl font-bold tabular-nums text-line/80 transition-colors duration-200 group-hover:text-accent sm:text-4xl"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div
                aria-hidden="true"
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ink/[0.06] text-ink"
              >
                {item.icon}
              </div>
              <h3 className="text-base font-semibold leading-snug text-ink sm:text-lg">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-ink/75">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
