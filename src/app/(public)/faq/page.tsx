import type { Metadata } from "next";
import { FAQSection, JsonLd } from "@/components/public";
import { createPageMetadata } from "@/lib/seo";
import { buildFaqSchema } from "@/lib/structured-data";
import { getSiteContentSection } from "@/server/site-content";

export const metadata: Metadata = createPageMetadata({
  title: "Frequently Asked Questions",
  description:
    "Clear answers about The Business Circle membership, access, billing, community fit, and what happens after checkout.",
  path: "/faq"
});

function dedupeFaqItems(
  items: Array<{
    question: string;
    answer: string;
  }>
) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.question.trim().toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export default async function FaqPage() {
  const [homeContent, membershipContent] = await Promise.all([
    getSiteContentSection("home"),
    getSiteContentSection("membership")
  ]);

  const faqItems = dedupeFaqItems([...membershipContent.faqs, ...homeContent.faqs]).slice(0, 8);

  return (
    <div className="space-y-10 pb-16">
      <JsonLd data={buildFaqSchema(faqItems)} />

      <section className="public-panel space-y-4 p-8 sm:p-10">
        <p className="premium-kicker">FAQ</p>
        <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">
          Clear answers before you join.
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted">
          This page covers the most useful questions around membership fit, secure Stripe checkout,
          account access, upgrades, and how the community works once you are inside.
        </p>
      </section>

      <FAQSection
        title="Questions founders usually ask"
        description="Short, direct answers designed to make the next step clearer."
        items={faqItems}
      />
    </div>
  );
}
