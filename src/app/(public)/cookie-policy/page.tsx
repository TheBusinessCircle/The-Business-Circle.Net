import type { Metadata } from "next";
import { COOKIE_POLICY_CONTENT, LEGAL_LAST_UPDATED } from "@/config/legal";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { LegalDocument } from "@/components/public";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";
import { createPageMetadata } from "@/lib/seo";

const pageMetadataInput = {
  title: "Cookie Policy",
  description: COOKIE_POLICY_CONTENT.description,
  path: "/cookie-policy"
};

export function generateMetadata(): Metadata {
  return getRuntimeBrand().key === "circle-card"
    ? createCircleCardPageMetadata(pageMetadataInput, "circle-card")
    : createPageMetadata(pageMetadataInput);
}

export default function CookiePolicyPage() {
  return (
    <LegalDocument
      label={COOKIE_POLICY_CONTENT.label}
      title={COOKIE_POLICY_CONTENT.title}
      intro={COOKIE_POLICY_CONTENT.intro}
      updatedAt={LEGAL_LAST_UPDATED}
      supportEmail={getRuntimeBrand().supportEmail}
      sections={COOKIE_POLICY_CONTENT.sections}
    />
  );
}
