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
    <section id={id} className="space-y-8">
      <SectionHeading
        align="center"
        label={label}
        title={title}
        description={description}
      />
      <div className="mx-auto max-w-4xl space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="group public-panel overflow-hidden p-0"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left sm:px-6">
              <span className="font-medium text-foreground">{item.question}</span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/35 text-silver transition-transform duration-200 group-open:rotate-180">
                <ChevronDown size={16} />
              </span>
            </summary>
            <div className="border-t border-border/70 px-5 py-5 text-sm leading-relaxed text-muted sm:px-6">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
