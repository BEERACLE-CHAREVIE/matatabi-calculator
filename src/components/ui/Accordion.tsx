import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type AccordionItem = {
  id: string;
  question: string;
  answer: string;
};

export type AccordionProps = {
  items: ReadonlyArray<AccordionItem>;
  className?: string;
};

export function Accordion({ items, className }: AccordionProps) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item, index) => (
        <li key={item.id}>
          <details
            id={item.id}
            className="group rounded-2xl border border-line/55 bg-canvas/85 backdrop-blur-[1px] shadow-card transition-[box-shadow,border-color] open:border-line open:shadow-floating"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-6 py-5 [&::-webkit-details-marker]:hidden">
              <div className="flex items-baseline gap-4">
                <span
                  aria-hidden="true"
                  className="fig-mono text-[12px] text-ink/50"
                >
                  Q.{String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-mincho text-[15px] font-medium leading-snug text-ink sm:text-base">
                  {item.question}
                </span>
              </div>
              <ChevronDown
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-ink/55 transition-transform duration-300 group-open:rotate-180"
              />
            </summary>
            <div className="border-t border-line/40 px-6 py-5">
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="fig-mono mt-0.5 text-[12px] text-accent"
                >
                  A.
                </span>
                <p className="text-[14px] leading-[1.9] text-ink/80">
                  {item.answer}
                </p>
              </div>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
