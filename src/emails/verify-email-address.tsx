import React from "react";
import {
  BcnEmailLayout,
  EmailNote
} from "@/emails/bcn-email-layout";

type VerifyEmailAddressEmailProps = {
  firstName: string;
  verificationUrl: string;
  ttlHours: number;
};

export function VerifyEmailAddressEmail({
  firstName,
  verificationUrl,
  ttlHours
}: VerifyEmailAddressEmailProps) {
  return (
    <BcnEmailLayout
      previewText="Confirm your email address to unlock your full Business Circle member access."
      eyebrow="EMAIL VERIFICATION"
      heading="Confirm your email address"
      lead={
        <>
          Hi {firstName}, you are one step away from full access to The Business Circle Network.
          Confirm your email address to unlock your member access and continue inside the
          platform.
        </>
      }
      ctaLabel="Verify your email"
      ctaUrl={verificationUrl}
      fallbackUrl={verificationUrl}
      note={
        <>
          <EmailNote>This verification link expires in {ttlHours} hours.</EmailNote>
          <EmailNote>
            For security, only the most recent verification email remains valid. Older links
            expire automatically.
          </EmailNote>
        </>
      }
    />
  );
}
