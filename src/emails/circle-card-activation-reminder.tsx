import React from "react";
import {
  BcnEmailLayout,
  EmailMutedText,
  EmailPanel,
  EmailParagraph
} from "@/emails/bcn-email-layout";

type CircleCardActivationReminderEmailProps = {
  firstName: string;
  dashboardUrl: string;
  completionScore: number;
  missingItems: string[];
};

export function CircleCardActivationReminderEmail({
  firstName,
  dashboardUrl,
  completionScore,
  missingItems
}: CircleCardActivationReminderEmailProps) {
  const visibleMissingItems = missingItems.slice(0, 4);

  return (
    <BcnEmailLayout
      previewText="Finish your Circle Card setup."
      eyebrow="CIRCLE CARD SETUP"
      heading="Complete your Circle Card"
      lead={
        <>
          Hi {firstName}, your Circle Card is {completionScore}% complete. Finish the next setup
          steps so your card is ready to share.
        </>
      }
      ctaLabel="Complete Your Circle Card"
      ctaUrl={dashboardUrl}
      fallbackUrl={dashboardUrl}
    >
      {visibleMissingItems.length ? (
        <EmailPanel title="Next setup steps">
          {visibleMissingItems.map((item) => (
            <EmailMutedText key={item}>{item}</EmailMutedText>
          ))}
        </EmailPanel>
      ) : null}
      <EmailParagraph>
        This is a setup email for your Circle Card account, not a marketing newsletter.
      </EmailParagraph>
    </BcnEmailLayout>
  );
}
