import { Accordion, type AccordionItem } from "@/components/ui/Accordion";
import { SectionEyebrow } from "./SectionEyebrow";

export type FAQProps = {
  items: ReadonlyArray<AccordionItem>;
};

export function FAQ({ items }: FAQProps) {
  return (
    <section
      aria-labelledby="faq-heading"
      className="relative overflow-hidden bg-paper-warm px-4 py-24 sm:px-8 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0 opacity-60"
      />

      {/* 装飾: 大きな疑問符 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-6 top-12 select-none font-display text-[18rem] font-light italic leading-none text-ink/[0.04] sm:text-[24rem] lg:-left-10 lg:text-[26rem]"
      >
        ?
      </div>

      <div className="relative mx-auto max-w-3xl">
        <div className="mb-12 flex flex-col items-start gap-5 sm:mb-16">
          <SectionEyebrow number="05" label="FAQ" />
          <h2
            id="faq-heading"
            className="text-balance font-mincho text-[1.9rem] font-medium leading-[1.25] text-ink sm:text-4xl lg:text-[2.6rem]"
          >
            よくある、ご質問。
          </h2>
          <p className="max-w-2xl text-[15px] leading-[1.85] text-ink/72">
            ブラウザ内で完結すること、無料・登録不要であることを軸に、
            実際にお問い合わせの多い項目をまとめました。
          </p>
        </div>
        <Accordion items={items} />
      </div>
    </section>
  );
}
