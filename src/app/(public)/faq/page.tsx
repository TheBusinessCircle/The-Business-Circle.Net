import type { Metadata } from "next";
import { FAQSection, JsonLd } from "@/components/public";
import { PublicTopVisual, SectionFeatureImage } from "@/components/visual-media";
import { createPageMetadata } from "@/lib/seo";
import { buildFaqSchema } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { getSiteContentSection } from "@/server/site-content";
import { getVisualMediaPlacement } from "@/server/visual-media";

export const metadata: Metadata = createPageMetadata({
  title: "Frequently Asked Questions",
  description:
    "Direct answers for business owners building with intent about membership fit, billing, cancellation, access, privacy, and what happens after you join The Business Circle.",
  path: "/faq"
});

const FAQ_SUPPORT_ITEMS = [
  {
    question: "Can I cancel my membership?",
    answer:
      "Yes. Membership is designed to be clear and adult. You can cancel according to your billing terms, and access continues for the paid period already covered."
  },
  {
    question: "What happens after I pay?",
    answer:
      "Your account access opens, your membership level is applied, and you can complete your profile, enter the right spaces, access resources, and start using the environment properly."
  },
  {
    question: "Is my profile public?",
    answer:
      "No. BCN is a private environment. Public pages explain the platform, but member profiles and deeper interaction stay inside the network according to access level."
  },
  {
    question: "Who can contact me inside BCN?",
    answer:
      "Contact happens inside a structured private environment. The point is relevant owner-to-owner connection, not inbox noise or public social visibility."
  },
  {
    question: "How do 1-to-1 calls work?",
    answer:
      "Calls are there to support useful owner-to-owner conversation when the fit and timing are right. Access to deeper call layers depends on your tier."
  },
  {
    question: "How do group calls work?",
    answer:
      "Group conversations are built around focused business discussion, not generic webinars. They are designed to help owners work through pressure, decisions, and direction in a better room."
  },
  {
    question: "What resources do I get access to?",
    answer:
      "Resources are structured around practical business support: frameworks, prompts, insight, and materials that help owners think clearly and move well. Access depth depends on tier."
  },
  {
    question: "Is this suitable for startups?",
    answer:
      "It can be, if the founder is serious and wants structure, better conversations, and stronger business direction rather than surface-level networking."
  },
  {
    question: "Is this suitable for established businesses?",
    answer:
      "Yes. More established operators often need stronger context, a quieter room, and better proximity around consequential decisions. That is a core part of what BCN is built to support."
  },
  {
    question: "What makes this different from a normal networking group?",
    answer:
      "BCN is a structured private environment, not a loose networking circle. The focus is on quality of room, standards, access, and better business conversations rather than generic visibility."
  }
] as const;

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
  const [homeContent, membershipContent, publicTopPlacement, faqTrustPlacement] = await Promise.all([
    getSiteContentSection("home"),
    getSiteContentSection("membership"),
    getVisualMediaPlacement("global.public.top"),
    getVisualMediaPlacement("faq.section.trust")
  ]);

  const faqItems = dedupeFaqItems([
    ...FAQ_SUPPORT_ITEMS,
    ...membershipContent.faqs,
    ...homeContent.faqs
  ]);

  return (
    <div className="space-y-20 pb-28 lg:space-y-28 lg:pb-36">
      <JsonLd data={buildFaqSchema(faqItems)} />

      <PublicTopVisual
        placement={publicTopPlacement}
        eyebrow="FAQ"
        title="Questions worth settling before you enter."
        description="Clear answers on room fit, access, billing, privacy, and what changes once you step inside."
        tone="anchored"
      />

      <section className="public-panel relative overflow-hidden px-6 py-28 sm:px-8 lg:px-10 lg:py-36">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.48)_100%),linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.62)_100%)]" />
        <div className="relative space-y-6">
          <p className="premium-kicker">FAQ</p>
          <h1 className="max-w-4xl font-display text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
            Questions worth settling before you enter.
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-white/80">
            Clear answers for business owners who want to understand billing, access, privacy, calls,
            resources, and the quality of the environment before they join.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <div
          className={cn(
            "gap-6 xl:items-center",
            faqTrustPlacement?.isActive && faqTrustPlacement.imageUrl
              ? "grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.56fr)]"
              : "space-y-6"
          )}
        >
          <div className="space-y-4">
            <p className="premium-kicker">Trust And Standards</p>
            <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
              Private access. Clear standards. No unnecessary friction.
            </h2>
            <p className="max-w-3xl text-base leading-relaxed text-muted">
              The Business Circle is designed to feel premium, calm, and well run. Billing is
              clear, access is structured, and the quality of the room matters as much as the
              features inside it.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Private environment, not public social exposure",
                "Clear membership and access paths",
                "Billing handled securely through Stripe",
                "Standards and moderation protect room quality"
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.2rem] border border-border/80 bg-background/24 px-4 py-3 text-sm text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          {faqTrustPlacement?.isActive && faqTrustPlacement.imageUrl ? (
            <SectionFeatureImage
              placement={faqTrustPlacement}
              tone="story"
              className="min-h-[17rem]"
            />
          ) : null}
        </div>
      </section>

      <FAQSection
        title="Direct answers before you step inside"
        description="Short answers designed to make the next decision clearer, faster, and more confident."
        items={faqItems}
      />
    </div>
  );
}
