import type { Metadata } from "next";
import { LEGAL_LAST_UPDATED, TERMS_OF_SERVICE_CONTENT } from "@/config/legal";
import { LegalDocument } from "@/components/public";
import { createPageMetadata } from "@/lib/seo";
import { getSiteContentSection } from "@/server/site-content";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service",
  description: TERMS_OF_SERVICE_CONTENT.description,
  path: "/terms-of-service"
});

export default async function TermsOfServicePage() {
  const footerContent = await getSiteContentSection("footer");

  return (
    <LegalDocument
      label={TERMS_OF_SERVICE_CONTENT.label}
      title={TERMS_OF_SERVICE_CONTENT.title}
      intro={TERMS_OF_SERVICE_CONTENT.intro}
      updatedAt={LEGAL_LAST_UPDATED}
      supportEmail={footerContent.supportEmail}
      sections={TERMS_OF_SERVICE_CONTENT.sections}
    />
  );
}
