import { ChevronDown } from "lucide-react";
import { SectionHeading } from "@/components/public/section-heading";

export type FaqItem = {
  question: string;
  answer: string;
};

type FAQSectionProps = {
  id?: string;
  label?: string;
  title: string;
  description?: string;
  items: FaqItem[];
};

export function FAQSection({
  id,
  label,
  title,
  description,
  items
}: FAQSectionProps) {
  return (
    <section id={id} className="public-section">
      <SectionHeading
        align="center"
        label={label}
        title={title}
        description={description}
      />
      <div className="mx-auto max-w-4xl space-y-4">
        {items.map((item) => (
          <details
            key={item.question}
            className="group public-panel overflow-hidden p-0 transition-colors group-open:border-gold/20"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 lg:px-7 lg:py-5">
              <span className="font-medium text-foreground">{item.question}</span>
              <span className="surface-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 transition-transform duration-200 group-open:rotate-180">
                <ChevronDown size={16} />
              </span>
            </summary>
            <div className="border-t border-border/70 px-5 py-4 text-base leading-relaxed text-white/75 sm:px-6 lg:px-7 lg:py-5">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
