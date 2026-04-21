import React from "react";
import {
  BcnEmailLayout,
  EmailDetailsList,
  EmailMessageBlock,
  EmailMutedText,
  EmailPanel
} from "@/emails/bcn-email-layout";

type ContactNotificationEmailProps = {
  name: string;
  email: string;
  company: string;
  subject: string;
  sourcePath: string;
  message: string;
};

export function ContactNotificationEmail({
  name,
  email,
  company,
  subject,
  sourcePath,
  message
}: ContactNotificationEmailProps) {
  return (
    <BcnEmailLayout
      previewText="A new contact enquiry has arrived in BCN."
      eyebrow="CONTACT ENQUIRY"
      heading="A new enquiry has been received"
      lead="A new website contact submission has come into The Business Circle Network."
    >
      <EmailPanel title="Submission details">
        <EmailDetailsList
          items={[
            { label: "Name", value: name },
            { label: "Email", value: email },
            { label: "Company", value: company },
            { label: "Subject", value: subject },
            { label: "Source", value: sourcePath }
          ]}
        />
      </EmailPanel>

      <EmailPanel title="Message">
        <EmailMutedText>The submitted message is included below.</EmailMutedText>
      </EmailPanel>
      <EmailMessageBlock>{message}</EmailMessageBlock>
    </BcnEmailLayout>
  );
}
