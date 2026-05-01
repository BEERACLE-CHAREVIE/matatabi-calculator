import type { ReactNode } from "react";

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
      className="bg-line/10 px-4 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-10 max-w-3xl space-y-3 sm:mb-12">
          <p className="text-sm font-medium uppercase tracking-warning text-accent">
            What You Get
          </p>
          <h2
            id="value-heading"
            className="text-balance text-2xl font-bold leading-tight text-ink sm:text-3xl lg:text-4xl"
          >
            診断するだけで、3 つの数字が手に入ります
          </h2>
        </div>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.title}
              className="flex h-full flex-col gap-3 rounded-xl border border-line/40 bg-canvas p-6 shadow-card"
            >
              <div
                aria-hidden="true"
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ink/5 text-ink"
              >
                {item.icon}
              </div>
              <h3 className="text-base font-semibold leading-snug text-ink sm:text-lg">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-ink/75">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
