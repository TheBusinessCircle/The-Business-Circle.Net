import type { Metadata } from "next";
import {
  TestimonialCategory,
  TestimonialDisplayLocation,
  TestimonialProofType
} from "@prisma/client";
import { AnswerBlock, FAQSection, JsonLd, TwoPathCta } from "@/components/public";
import { TestimonialSection } from "@/components/public/testimonial-section";
import { createPageMetadata } from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFaqSchema,
  buildServiceSchema,
  buildWebPageSchema
} from "@/lib/structured-data";
import { FounderAuditClient } from "./founder-audit-client";

export const metadata: Metadata = createPageMetadata({
  title: "Founder Audit | Find Your Best Business Circle Tier",
  description:
    "A focused clarity checkpoint for business owners to understand where they currently sit and which room inside The Business Circle fits them best.",
  path: "/audit"
});

const AUDIT_FAQS = [
  {
    question: "What is the Founder Audit?",
    answer:
      "The Founder Audit is a short guided assessment that helps business owners understand which level of The Business Circle Network may fit them best."
  },
  {
    question: "Is the Founder Audit a full business diagnosis?",
    answer:
      "No. It is a simple starting point for membership fit and business environment context. It is not a complete diagnosis of your company."
  },
  {
    question: "What happens after the Founder Audit?",
    answer:
      "You receive a recommended membership room and can review the membership options before deciding whether to join."
  }
] as const;

export default function AuditPage() {
  return (
    <div className="public-page-stack">
      <JsonLd
        data={buildCollectionPageSchema({
          title: "Founder Audit | The Business Circle Network",
          description:
            "A focused clarity checkpoint for business owners to understand where they currently sit and which room inside The Business Circle fits them best.",
          path: "/audit",
          keywords: [
            "founder audit",
            "business clarity checkpoint",
            "business owners network",
            "The Business Circle membership"
          ],
          itemPaths: ["/membership", "/about", "/join-mobile"]
        })}
      />
      <JsonLd
        data={buildWebPageSchema({
          title: "Founder Audit",
          description:
            "A short guided assessment that helps owners understand which BCN membership room may fit.",
          path: "/audit",
          primaryQuestion: "What is the Founder Audit?",
          primaryAnswer:
            "The Founder Audit is a short guided assessment that helps business owners understand which level of The Business Circle Network may fit them best. It is designed as a simple starting point for owners who want better context before joining."
        })}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/home" },
          { name: "Founder Audit", path: "/audit" }
        ])}
      />
      <JsonLd data={buildFaqSchema([...AUDIT_FAQS])} />
      <JsonLd
        data={buildServiceSchema({
          name: "Founder Audit",
          description:
            "A short clarity checkpoint that helps business owners understand which Business Circle room may fit their current stage.",
          path: "/audit",
          serviceType: "Founder clarity assessment",
          audience: "Business owners considering a private founder-led business environment"
        })}
      />
      <FounderAuditClient />
      <AnswerBlock
        question="What is the Founder Audit?"
        answer="The Founder Audit is a short guided assessment that helps business owners understand which level of The Business Circle Network may fit them best. It is designed as a simple starting point for owners who want better context before joining."
      />
      <TwoPathCta
        source="audit"
        title="Prefer to compare the rooms directly?"
        description="The audit gives a recommendation, but you can also review Foundation, Inner Circle and Core yourself before joining."
      />
      <FAQSection
        label="Founder Audit"
        title="Clear answers before you start"
        description="The audit is a soft-entry tool for fit, not a gimmick or a hard sell."
        items={[...AUDIT_FAQS]}
      />
      <TestimonialSection
        proofType={TestimonialProofType.GROWTH_ARCHITECT}
        location={TestimonialDisplayLocation.AUDIT_PAGE}
        category={[TestimonialCategory.FOUNDER_AUDIT, TestimonialCategory.GROWTH_ARCHITECT]}
        eyebrow="FOUNDER WORDS"
        title="Shared by people who have experienced the work"
        intro="Approved words from business owners who have used a founder audit, strategy conversation, or Growth Architect work."
        limit={6}
      />
    </div>
  );
}
