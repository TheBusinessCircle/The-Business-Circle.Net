import React from "react";
import {
  BcnEmailLayout,
  EmailMutedText,
  EmailPanel,
  EmailParagraph
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
      brand="circle-card"
      previewText="Welcome to Circle Card. Complete your profile to start sharing."
      eyebrow="CIRCLE CARD"
      heading="Welcome to Circle Card"
      lead={
        <>
          Hi {firstName}, your free Circle Card account has been created. Start by completing
          the details that make your card useful when someone opens it.
        </>
      }
      ctaLabel="Complete Your Circle Card"
      ctaUrl={dashboardUrl}
      fallbackUrl={dashboardUrl}
    >
      <EmailPanel title="What is Circle Card?">
        <EmailMutedText>
          Circle Card is your public relationship card: a clean profile, contact route, QR link
          and featured links in one place.
        </EmailMutedText>
      </EmailPanel>
      <EmailPanel title="How does it help?">
        <EmailMutedText>
          It gives new contacts a simple way to understand who you are, what you do, and where
          they should go next.
        </EmailMutedText>
      </EmailPanel>
      <EmailParagraph>
        Start with a profile image, business details, one featured link and a share action.
      </EmailParagraph>
    </BcnEmailLayout>
  );
}
