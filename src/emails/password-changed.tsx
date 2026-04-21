import React from "react";
import { BcnEmailLayout, EmailNote } from "@/emails/bcn-email-layout";

type PasswordChangedEmailProps = {
  firstName: string;
  loginUrl: string;
};

export function PasswordChangedEmail({
  firstName,
  loginUrl
}: PasswordChangedEmailProps) {
  return (
    <BcnEmailLayout
      previewText="Your BCN password has been updated."
      eyebrow="SECURITY UPDATE"
      heading="Your password was changed"
      lead={
        <>
          Hi {firstName}, your password has been changed successfully. You can now sign back in to
          The Business Circle Network using the link below.
        </>
      }
      ctaLabel="Sign in"
      ctaUrl={loginUrl}
      fallbackUrl={loginUrl}
      note={
        <EmailNote>
          If this was not you, contact support immediately so we can help secure your account.
        </EmailNote>
      }
    />
  );
}
