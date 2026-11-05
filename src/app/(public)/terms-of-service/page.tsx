import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import type { Metadata } from "next";
import {
  TERMS_LAST_UPDATED,
  TERMS_OF_SERVICE_CONTENT
} from "@/config/legal";
import { SITE_CONFIG } from "@/config/site";
import { LegalDocument } from "@/components/public";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service",
  description: TERMS_OF_SERVICE_CONTENT.description,
  path: "/terms-of-service"
});

function TermsOfServicePage() {
  return (
    <LegalDocument
      label={TERMS_OF_SERVICE_CONTENT.label}
      title={TERMS_OF_SERVICE_CONTENT.title}
      intro={TERMS_OF_SERVICE_CONTENT.intro}
      updatedAt={TERMS_LAST_UPDATED}
      supportEmail={SITE_CONFIG.supportEmail}
      sections={TERMS_OF_SERVICE_CONTENT.sections}
    />
  );
}

export default function LegalPage(){return <>{isBcnV2Enabled() && <section className="v2-wrap v2-prose v2-card" style={{marginTop:30,marginBottom:30}}><h2>Free public features and existing memberships</h2><p>The new public tools, guides, directory browsing, profile creation and help requests are free. A quote is a proposal, not an invoice. Calculators are general planning tools, not personalised tax, legal or financial advice. Providers agree work and prices directly with you. BCN does not guarantee a match, response time or provider performance. Any potential referral fee and related-business connection will be disclosed before you approve an introduction. Existing membership agreements and valid entitlements are not cancelled or altered by the free public launch.</p><h2>Build it together and free conversations</h2><p>Participation is for adults aged 18 or over with a verified account. Practical requests and offers require moderation and acceptance of BCN rules. No fundraising, loans, investment requests, spam or misleading promotions are permitted. Describe only help you are entitled and able to offer. Free help must have no compulsory purchase. Discount claims must use a genuine usual price for the same scope; paid prices must include applicable VAT and compulsory charges. Choosing an offer opens a private conversation, not an order or payment. Any contract for work is agreed directly between participants; agree scope, price, delivery, cancellation terms, confidentiality and ownership in writing before work starts. Do not assume an idea posted publicly is confidential. BCN may remove unsuitable content and investigate reports. Moderation does not certify competence or guarantee safety or results. No automatic commission is charged on board offers in this release. Existing contractual membership rights remain preserved.</p><p>Supplement dated 21 October 2026. Existing terms below remain available for historical agreements.</p></section>}<TermsOfServicePage/></>;}
