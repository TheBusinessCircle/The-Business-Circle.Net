import type { Metadata } from "next";
import { LEGAL_LAST_UPDATED, PRIVACY_POLICY_CONTENT } from "@/config/legal";
import { SITE_CONFIG } from "@/config/site";
import { LegalDocument } from "@/components/public";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description: PRIVACY_POLICY_CONTENT.description,
  path: "/privacy-policy"
});

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      label={PRIVACY_POLICY_CONTENT.label}
      title={PRIVACY_POLICY_CONTENT.title}
      intro={PRIVACY_POLICY_CONTENT.intro}
      updatedAt={LEGAL_LAST_UPDATED}
      supportEmail={SITE_CONFIG.supportEmail}
      sections={PRIVACY_POLICY_CONTENT.sections}
    />
  );
}
