import type { Metadata } from "next";
import { JsonLd } from "@/components/public";
import { createPageMetadata } from "@/lib/seo";
import { buildCollectionPageSchema } from "@/lib/structured-data";
import { FounderAuditClient } from "./founder-audit-client";

export const metadata: Metadata = createPageMetadata({
  title: "Founder Audit | The Business Circle Network",
  description:
    "A focused clarity checkpoint for business owners to understand where they currently sit and which room inside The Business Circle fits them best.",
  path: "/audit"
});

export default function AuditPage() {
  return (
    <div className="public-page-stack">
      <JsonLd
        data={buildCollectionPageSchema({
          title: "Founder Audit | The Business Circle Network",
          description:
            "A focused clarity checkpoint for business owners to understand where they currently sit and which room inside The Business Circle fits them best.",
          path: "/audit",
          keywords: [
            "founder audit",
            "business clarity checkpoint",
            "business owners network",
            "The Business Circle membership"
          ],
          itemPaths: ["/membership", "/about", "/join-mobile"]
        })}
      />
      <FounderAuditClient />
    </div>
  );
}
