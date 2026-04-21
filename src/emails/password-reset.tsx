import React from "react";
import { BcnEmailLayout, EmailNote } from "@/emails/bcn-email-layout";

type PasswordResetEmailProps = {
  firstName: string;
  resetUrl: string;
  ttlMinutes: number;
};

export function PasswordResetEmail({
  firstName,
  resetUrl,
  ttlMinutes
}: PasswordResetEmailProps) {
  return (
    <BcnEmailLayout
      previewText="Use this secure link to reset your BCN password."
      eyebrow="PASSWORD RESET"
      heading="Reset your password"
      lead={
        <>
          Hi {firstName}, we received a request to reset your password. Use the secure link below
          to choose a new one and return to the platform.
        </>
      }
      ctaLabel="Reset your password"
      ctaUrl={resetUrl}
      fallbackUrl={resetUrl}
      note={
        <>
          <EmailNote>This reset link expires in {ttlMinutes} minutes.</EmailNote>
          <EmailNote>If you did not request this, you can safely ignore this email.</EmailNote>
        </>
      }
    />
  );
}
