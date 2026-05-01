import { Accordion, type AccordionItem } from "@/components/ui/Accordion";
import { SectionEyebrow } from "./SectionEyebrow";

export type FAQProps = {
  items: ReadonlyArray<AccordionItem>;
};

export function FAQ({ items }: FAQProps) {
  return (
    <section
      aria-labelledby="faq-heading"
      className="relative bg-line/10 px-4 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 flex flex-col items-start gap-4 sm:mb-16 sm:gap-5">
          <SectionEyebrow number="05" label="FAQ" />
          <h2
            id="faq-heading"
            className="text-balance text-2xl font-bold leading-tight text-ink sm:text-3xl lg:text-4xl"
          >
            よくあるご質問。
          </h2>
        </div>
        <Accordion items={items} />
      </div>
    </section>
  );
}
