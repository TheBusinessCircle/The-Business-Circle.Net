import type { Metadata } from "next";
import {
  BCN_RULES_CONTENT,
  BCN_RULES_LAST_UPDATED
} from "@/config/legal";
import { LegalDocument } from "@/components/public";
import { createPageMetadata } from "@/lib/seo";
import { getSiteContentSection } from "@/server/site-content";

export const metadata: Metadata = createPageMetadata({
  title: "BCN Rules",
  description: BCN_RULES_CONTENT.description,
  path: "/rules"
});

export default async function RulesPage() {
  const footerContent = await getSiteContentSection("footer");

  return (
    <LegalDocument
      label={BCN_RULES_CONTENT.label}
      title={BCN_RULES_CONTENT.title}
      intro={BCN_RULES_CONTENT.intro}
      updatedAt={BCN_RULES_LAST_UPDATED}
      supportEmail={footerContent.supportEmail}
      sections={BCN_RULES_CONTENT.sections}
    />
  );
}
