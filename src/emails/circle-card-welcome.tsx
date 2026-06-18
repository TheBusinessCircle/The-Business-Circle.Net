import React from "react";
import {
  BcnEmailLayout,
  EmailMutedText,
  EmailPanel
} from "@/emails/bcn-email-layout";

type CircleCardWelcomeEmailProps = {
  firstName: string;
  dashboardUrl: string;
};

export function CircleCardWelcomeEmail({
  firstName,
  dashboardUrl
}: CircleCardWelcomeEmailProps) {
  return (
    <BcnEmailLayout
      previewText="Your free Circle Card account is ready."
      eyebrow="CIRCLE CARD"
      heading="Your Circle Card is ready"
      lead={
        <>
          Hi {firstName}, your free Circle Card account has been created. You can now set up
          your public card, QR sharing, Circle Wallet and basic activity tracking.
        </>
      }
      ctaLabel="Open Circle Card"
      ctaUrl={dashboardUrl}
      fallbackUrl={dashboardUrl}
    >
      <EmailPanel title="What is included">
        <EmailMutedText>
          Circle Card Free is separate from BCN membership. Member rooms, resources and paid
          membership features open only when a valid BCN entitlement exists.
        </EmailMutedText>
      </EmailPanel>
    </BcnEmailLayout>
  );
}
