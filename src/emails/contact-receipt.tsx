import React from "react";
import { BcnEmailLayout, EmailNote } from "@/emails/bcn-email-layout";

type ContactReceiptEmailProps = {
  firstName: string;
  subject: string;
  sourcePath: string;
};

export function ContactReceiptEmail({
  firstName,
  subject,
  sourcePath
}: ContactReceiptEmailProps) {
  return (
    <BcnEmailLayout
      previewText="We have received your message and will respond shortly."
      eyebrow="MESSAGE RECEIVED"
      heading="We have received your message"
      lead={
        <>
          Hi {firstName}, thank you for contacting The Business Circle Network. We have received
          your message and a member of our team will come back to you shortly.
        </>
      }
      note={
        <>
          <EmailNote>Subject: {subject}</EmailNote>
          <EmailNote>Source: {sourcePath}</EmailNote>
        </>
      }
    />
  );
}
