import React from "react";
import { BcnEmailLayout, EmailNote } from "@/emails/bcn-email-layout";

type BillingReceiptEmailProps = {
  firstName: string;
  amount: string;
  planName: string;
  dashboardUrl: string;
};

export function BillingReceiptEmail({
  firstName,
  amount,
  planName,
  dashboardUrl
}: BillingReceiptEmailProps) {
  return (
    <BcnEmailLayout
      previewText="Your BCN billing receipt is ready."
      eyebrow="BILLING RECEIPT"
      heading="Your payment has been received"
      lead={
        <>
          Hi {firstName}, we have received your payment of {amount} for {planName}.
        </>
      }
      ctaLabel="Open your dashboard"
      ctaUrl={dashboardUrl}
      fallbackUrl={dashboardUrl}
      note={
        <EmailNote>
          Thank you for being part of The Business Circle Network.
        </EmailNote>
      }
    />
  );
}
