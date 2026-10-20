import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
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

function PrivacyPolicyPage() {
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

export default function LegalPage(){return <>{isBcnV2Enabled() && <section className="v2-wrap v2-prose v2-card" style={{marginTop:30,marginBottom:30}}><h2>BCN free tools, profiles and introductions</h2><p>Calculators and quotes operate in the current browser page. We do not send the figures or customer quote details to BCN analytics. Optional analytics require consent. New business profiles stay private unless you request publication and pass moderation. Help requests are processed by The Business Circle to respond to your request, with separate named-provider permission before contact details or the brief are shared. No unrelated marketing permission is inferred. Closed help requests have a 12-month retention target, subject to dispute or legal holds; payment evidence follows applicable accounting retention. Contact contact@thebusinesscircle.net to exercise your rights or withdraw introduction permission before sharing.</p><p>Supplement dated 20 October 2026. Existing terms below remain available for historical agreements.</p></section>}<PrivacyPolicyPage/></>;}
