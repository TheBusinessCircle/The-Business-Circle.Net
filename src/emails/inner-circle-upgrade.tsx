import React from "react";
import { BcnEmailLayout, EmailNote } from "@/emails/bcn-email-layout";

type InnerCircleUpgradeEmailProps = {
  firstName: string;
  innerCircleUrl: string;
};

export function InnerCircleUpgradeEmail({
  firstName,
  innerCircleUrl
}: InnerCircleUpgradeEmailProps) {
  return (
    <BcnEmailLayout
      previewText="Your Inner Circle access is now active."
      eyebrow="INNER CIRCLE"
      heading="Your Inner Circle access is now active"
      lead={
        <>
          Hi {firstName}, your upgrade is complete. You can now access private channels, premium
          resources, and the deeper BCN Inner Circle experience.
        </>
      }
      ctaLabel="Enter Inner Circle"
      ctaUrl={innerCircleUrl}
      fallbackUrl={innerCircleUrl}
      note={
        <EmailNote>
          Use the link above to step straight into the member environment.
        </EmailNote>
      }
    />
  );
}
