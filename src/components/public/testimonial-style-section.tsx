import { Quote } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SectionHeading } from "@/components/public/section-heading";

export type TestimonialItem = {
  quote: string;
  name: string;
  title: string;
};

type TestimonialStyleSectionProps = {
  label?: string;
  title: string;
  description?: string;
  testimonials: TestimonialItem[];
};

export function TestimonialStyleSection({
  label,
  title,
  description,
  testimonials
}: TestimonialStyleSectionProps) {
  return (
    <section className="space-y-8">
      <SectionHeading align="center" label={label} title={title} description={description} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {testimonials.map((item) => (
          <Card key={`${item.name}-${item.title}`} className="interactive-card border-border/80 bg-card/65">
            <CardHeader>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gold/35 bg-gold/10 text-gold">
                <Quote size={16} />
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted">&quot;{item.quote}&quot;</p>
              <div>
                <p className="font-medium text-silver">{item.name}</p>
                <p className="text-xs tracking-wide text-muted uppercase">{item.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
