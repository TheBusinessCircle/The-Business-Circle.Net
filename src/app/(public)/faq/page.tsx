import type { Metadata } from "next";
import { FAQSection, JsonLd } from "@/components/public";
import { createPageMetadata } from "@/lib/seo";
import { buildFaqSchema } from "@/lib/structured-data";
import { getSiteContentSection } from "@/server/site-content";

export const metadata: Metadata = createPageMetadata({
  title: "Frequently Asked Questions",
  description:
    "Direct answers for business owners building with intent about membership fit, secure checkout, access, and what happens after you enter the environment.",
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
          Questions worth settling before you enter.
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted">
          Direct answers for business owners building with intent on room fit, secure Stripe
          checkout, account access, upgrades, and how the environment works once you are inside.
        </p>
      </section>

      <FAQSection
        title="Direct answers before you step inside"
        description="Short answers designed to make the next decision clearer, faster, and more confident."
        items={faqItems}
      />
    </div>
  );
}
