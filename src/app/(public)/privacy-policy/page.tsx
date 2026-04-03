import type { Metadata } from "next";
import { LEGAL_LAST_UPDATED, PRIVACY_POLICY_CONTENT } from "@/config/legal";
import { LegalDocument } from "@/components/public";
import { createPageMetadata } from "@/lib/seo";
import { getSiteContentSection } from "@/server/site-content";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description: PRIVACY_POLICY_CONTENT.description,
  path: "/privacy-policy"
});

export default async function PrivacyPolicyPage() {
  const footerContent = await getSiteContentSection("footer");

  return (
    <LegalDocument
      label={PRIVACY_POLICY_CONTENT.label}
      title={PRIVACY_POLICY_CONTENT.title}
      intro={PRIVACY_POLICY_CONTENT.intro}
      updatedAt={LEGAL_LAST_UPDATED}
      supportEmail={footerContent.supportEmail}
      sections={PRIVACY_POLICY_CONTENT.sections}
    />
  );
}
