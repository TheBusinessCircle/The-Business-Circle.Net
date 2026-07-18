import type { Metadata } from "next";
import {
  TERMS_LAST_UPDATED,
  TERMS_OF_SERVICE_CONTENT
} from "@/config/legal";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { LegalDocument } from "@/components/public";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";
import { createPageMetadata } from "@/lib/seo";

const pageMetadataInput = {
  title: "Terms of Service",
  description: TERMS_OF_SERVICE_CONTENT.description,
  path: "/terms-of-service"
};

export function generateMetadata(): Metadata {
  return getRuntimeBrand().key === "circle-card"
    ? createCircleCardPageMetadata(pageMetadataInput, "circle-card")
    : createPageMetadata(pageMetadataInput);
}

export default function TermsOfServicePage() {
  return (
    <LegalDocument
      label={TERMS_OF_SERVICE_CONTENT.label}
      title={TERMS_OF_SERVICE_CONTENT.title}
      intro={TERMS_OF_SERVICE_CONTENT.intro}
      updatedAt={TERMS_LAST_UPDATED}
      supportEmail={getRuntimeBrand().supportEmail}
      sections={TERMS_OF_SERVICE_CONTENT.sections}
    />
  );
}
