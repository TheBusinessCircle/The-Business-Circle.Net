import React from "react";
import {
  BcnEmailLayout,
  EmailMutedText,
  EmailPanel
} from "@/emails/bcn-email-layout";

type FutureFollowUpPlaceholderEmailProps = {
  firstName: string;
};

export function FutureFollowUpPlaceholderEmail({
  firstName
}: FutureFollowUpPlaceholderEmailProps) {
  return (
    <BcnEmailLayout
      previewText="Future BCN follow-up placeholder."
      eyebrow="FOLLOW-UP"
      heading="Future follow-up placeholder"
      lead={
        <>
          Hi {firstName}, this template is reserved for future follow-up sequences after consent
          rules and content are approved.
        </>
      }
    >
      <EmailPanel title="Consent requirement">
        <EmailMutedText>
          Do not use this template for marketing unless the lead has a recorded marketing opt-in.
        </EmailMutedText>
      </EmailPanel>
    </BcnEmailLayout>
  );
}
