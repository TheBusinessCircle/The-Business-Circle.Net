import type { Metadata } from "next";
import {
  BCN_RULES_CONTENT,
  BCN_RULES_LAST_UPDATED
} from "@/config/legal";
import { LegalDocument } from "@/components/public";
import { SITE_CONFIG } from "@/config/site";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "BCN Rules",
  description: BCN_RULES_CONTENT.description,
  path: "/rules"
});

export default function RulesPage() {
  return (
    <LegalDocument
      label={BCN_RULES_CONTENT.label}
      title={BCN_RULES_CONTENT.title}
      intro={BCN_RULES_CONTENT.intro}
      updatedAt={BCN_RULES_LAST_UPDATED}
      supportEmail={SITE_CONFIG.supportEmail}
      sections={BCN_RULES_CONTENT.sections}
    />
  );
}
