import React from "react";
import { MEMBERSHIP_PLANS } from "@/config/membership";
import { BcnEmailLayout, EmailNote } from "@/emails/bcn-email-layout";

type WelcomeMemberEmailProps = {
  firstName: string;
  tier: keyof typeof MEMBERSHIP_PLANS;
  dashboardUrl: string;
};

export function WelcomeMemberEmail({
  firstName,
  tier,
  dashboardUrl
}: WelcomeMemberEmailProps) {
  return (
    <BcnEmailLayout
      previewText="Your BCN membership is live and ready for you."
      eyebrow="WELCOME TO BCN"
      heading="Your membership is now live"
      lead={
        <>
          Hi {firstName}, welcome to The Business Circle Network. Your membership tier is{" "}
          {MEMBERSHIP_PLANS[tier].name}.
        </>
      }
      ctaLabel="Open your dashboard"
      ctaUrl={dashboardUrl}
      fallbackUrl={dashboardUrl}
      note={
        <EmailNote>
          Start with one clear move inside the platform and let the rest build from there.
        </EmailNote>
      }
    />
  );
}
