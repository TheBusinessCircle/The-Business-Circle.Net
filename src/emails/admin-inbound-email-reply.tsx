import React from "react";
import { BcnEmailLayout, EmailMessageBlock, EmailNote } from "@/emails/bcn-email-layout";

type AdminInboundEmailReplyEmailProps = {
  recipientName: string;
  message: string;
  originalSubject: string;
  adminName?: string | null;
};

export function AdminInboundEmailReplyEmail({
  recipientName,
  message,
  originalSubject,
  adminName
}: AdminInboundEmailReplyEmailProps) {
  return (
    <BcnEmailLayout
      previewText="A reply from The Business Circle Network."
      eyebrow="BCN REPLY"
      heading="A reply from The Business Circle Network"
      lead={
        <>
          Hi {recipientName}, {adminName?.trim() || "the BCN team"} has replied to your message.
        </>
      }
      note={<EmailNote>Original subject: {originalSubject}</EmailNote>}
    >
      <EmailMessageBlock>{message}</EmailMessageBlock>
    </BcnEmailLayout>
  );
}
