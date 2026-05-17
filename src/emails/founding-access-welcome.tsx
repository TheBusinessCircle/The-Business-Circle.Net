import React from "react";
import { MEMBERSHIP_PLANS } from "@/config/membership";
import {
  BcnEmailLayout,
  EmailDetailsList,
  EmailNote,
  EmailPanel,
  EmailParagraph
} from "@/emails/bcn-email-layout";

type FoundingAccessWelcomeEmailProps = {
  firstName: string;
  tier: keyof typeof MEMBERSHIP_PLANS;
  dashboardUrl: string;
  trialDays: number;
  founderDiscountPercent?: number | null;
};

export function FoundingAccessWelcomeEmail({
  firstName,
  tier,
  dashboardUrl,
  trialDays,
  founderDiscountPercent
}: FoundingAccessWelcomeEmailProps) {
  return (
    <BcnEmailLayout
      previewText="Your Founding Access place is confirmed."
      eyebrow="FOUNDING ACCESS"
      heading="Your founding access is live"
      lead={
        <>
          Hi {firstName}, your Founding Access place in The Business Circle Network is
          confirmed.
        </>
      }
      ctaLabel="Open your dashboard"
      ctaUrl={dashboardUrl}
      fallbackUrl={dashboardUrl}
      note={
        <EmailNote>
          Founder rate is locked while your subscription remains active.
        </EmailNote>
      }
    >
      <EmailParagraph>
        Your selected tier is {MEMBERSHIP_PLANS[tier].name}. You have {trialDays} days included,
        then your selected tier continues unless cancelled.
      </EmailParagraph>
      <EmailPanel title="Access summary">
        <EmailDetailsList
          items={[
            {
              label: "Tier",
              value: MEMBERSHIP_PLANS[tier].name
            },
            {
              label: "Included access",
              value: `${trialDays} days`
            },
            {
              label: "After trial",
              value: founderDiscountPercent
                ? `${founderDiscountPercent}% founder rate while active`
                : "Continues on your selected tier unless cancelled"
            }
          ]}
        />
      </EmailPanel>
    </BcnEmailLayout>
  );
}
