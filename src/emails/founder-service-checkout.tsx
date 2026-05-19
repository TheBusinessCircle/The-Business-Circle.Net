import React from "react";
import {
  BcnEmailLayout,
  EmailDetailsList,
  EmailMessageBlock,
  EmailMutedText,
  EmailNote,
  EmailPanel
} from "@/emails/bcn-email-layout";
import { formatFounderServicePrice } from "@/lib/founder";

export type FounderServiceCheckoutEmailProps = {
  recipientName: string;
  body: string;
  serviceName: string;
  priceAmount: number;
  currency?: string;
  discountCode?: string | null;
  checkoutUrl: string;
  ctaLabel: string;
};

export function FounderServiceCheckoutEmail({
  recipientName,
  body,
  serviceName,
  priceAmount,
  currency = "GBP",
  discountCode,
  checkoutUrl,
  ctaLabel
}: FounderServiceCheckoutEmailProps) {
  return (
    <BcnEmailLayout
      previewText={`Your ${serviceName} checkout link from The Business Circle Network.`}
      eyebrow="Founder Services"
      heading="Your checkout link is ready"
      lead={`Hi ${recipientName.split(" ")[0] || recipientName}, here is the secure checkout link for ${serviceName}.`}
      ctaLabel={ctaLabel}
      ctaUrl={checkoutUrl}
      fallbackLabel="Secure checkout link"
      fallbackUrl={checkoutUrl}
      footerText="The Business Circle Network LTD"
      note={
        <EmailNote>
          If you have any questions before going ahead, just reply to this email and Trevor
          will pick it up.
        </EmailNote>
      }
    >
      <EmailMessageBlock>{body}</EmailMessageBlock>

      <EmailPanel title="Service summary">
        <EmailDetailsList
          items={[
            { label: "Service", value: serviceName },
            { label: "Price", value: formatFounderServicePrice(priceAmount, currency) },
            { label: "Discount", value: discountCode || "No discount code applied" }
          ]}
        />
        <EmailMutedText>
          Once payment is complete, Trevor will move the enquiry into the next admin stage.
        </EmailMutedText>
      </EmailPanel>
    </BcnEmailLayout>
  );
}
