import type { Metadata } from "next";
import { COOKIE_POLICY_CONTENT, LEGAL_LAST_UPDATED } from "@/config/legal";
import { SITE_CONFIG } from "@/config/site";
import { LegalDocument } from "@/components/public";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Cookie Policy",
  description: COOKIE_POLICY_CONTENT.description,
  path: "/cookie-policy"
});

export default function CookiePolicyPage() {
  return (
    <LegalDocument
      label={COOKIE_POLICY_CONTENT.label}
      title={COOKIE_POLICY_CONTENT.title}
      intro={COOKIE_POLICY_CONTENT.intro}
      updatedAt={LEGAL_LAST_UPDATED}
      supportEmail={SITE_CONFIG.supportEmail}
      sections={COOKIE_POLICY_CONTENT.sections}
    />
  );
}
