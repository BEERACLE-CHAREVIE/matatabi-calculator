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
      {items.map((item) => (
        <li key={item.id}>
          <details
            id={item.id}
            className="group rounded-xl border border-line/50 bg-canvas shadow-card transition-shadow open:shadow-card-hover"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <ChevronDown
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-ink/60 transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <div className="px-6 pb-5 text-sm leading-relaxed text-ink/80">
              {item.answer}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
