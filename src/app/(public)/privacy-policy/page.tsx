import type { Metadata } from "next";
import { LEGAL_LAST_UPDATED, PRIVACY_POLICY_CONTENT } from "@/config/legal";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { LegalDocument } from "@/components/public";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";
import { createPageMetadata } from "@/lib/seo";

const pageMetadataInput = {
  title: "Privacy Policy",
  description: PRIVACY_POLICY_CONTENT.description,
  path: "/privacy-policy"
};

export function generateMetadata(): Metadata {
  return getRuntimeBrand().key === "circle-card"
    ? createCircleCardPageMetadata(pageMetadataInput, "circle-card")
    : createPageMetadata(pageMetadataInput);
}

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      label={PRIVACY_POLICY_CONTENT.label}
      title={PRIVACY_POLICY_CONTENT.title}
      intro={PRIVACY_POLICY_CONTENT.intro}
      updatedAt={LEGAL_LAST_UPDATED}
      supportEmail={getRuntimeBrand().supportEmail}
      sections={PRIVACY_POLICY_CONTENT.sections}
    />
  );
}
