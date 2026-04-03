import type { Metadata } from "next";
import { COOKIE_POLICY_CONTENT, LEGAL_LAST_UPDATED } from "@/config/legal";
import { LegalDocument } from "@/components/public";
import { createPageMetadata } from "@/lib/seo";
import { getSiteContentSection } from "@/server/site-content";

export const metadata: Metadata = createPageMetadata({
  title: "Cookie Policy",
  description: COOKIE_POLICY_CONTENT.description,
  path: "/cookie-policy"
});

export default async function CookiePolicyPage() {
  const footerContent = await getSiteContentSection("footer");

  return (
    <LegalDocument
      label={COOKIE_POLICY_CONTENT.label}
      title={COOKIE_POLICY_CONTENT.title}
      intro={COOKIE_POLICY_CONTENT.intro}
      updatedAt={LEGAL_LAST_UPDATED}
      supportEmail={footerContent.supportEmail}
      sections={COOKIE_POLICY_CONTENT.sections}
    />
  );
}
