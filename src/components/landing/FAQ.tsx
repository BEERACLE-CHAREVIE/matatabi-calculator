import { Accordion, type AccordionItem } from "@/components/ui/Accordion";

export type FAQProps = {
  items: ReadonlyArray<AccordionItem>;
};

export function FAQ({ items }: FAQProps) {
  return (
    <section
      aria-labelledby="faq-heading"
      className="bg-canvas px-4 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 space-y-3 text-center sm:mb-12 sm:text-left">
          <p className="text-sm font-medium uppercase tracking-warning text-accent">
            FAQ
          </p>
          <h2
            id="faq-heading"
            className="text-balance text-2xl font-bold leading-tight text-ink sm:text-3xl lg:text-4xl"
          >
            よくあるご質問
          </h2>
        </div>
        <Accordion items={items} />
      </div>
    </section>
  );
}
