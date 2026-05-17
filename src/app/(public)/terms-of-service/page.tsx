import type { Metadata } from "next";
import {
  TERMS_LAST_UPDATED,
  TERMS_OF_SERVICE_CONTENT
} from "@/config/legal";
import { SITE_CONFIG } from "@/config/site";
import { LegalDocument } from "@/components/public";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service",
  description: TERMS_OF_SERVICE_CONTENT.description,
  path: "/terms-of-service"
});

export default function TermsOfServicePage() {
  return (
    <LegalDocument
      label={TERMS_OF_SERVICE_CONTENT.label}
      title={TERMS_OF_SERVICE_CONTENT.title}
      intro={TERMS_OF_SERVICE_CONTENT.intro}
      updatedAt={TERMS_LAST_UPDATED}
      supportEmail={SITE_CONFIG.supportEmail}
      sections={TERMS_OF_SERVICE_CONTENT.sections}
    />
  );
}
