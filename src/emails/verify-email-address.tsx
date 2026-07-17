import React from "react";
import {
  BcnEmailLayout,
  EmailNote
} from "@/emails/bcn-email-layout";
import type { RuntimeBrandKey } from "@/config/runtime-brand";

type VerifyEmailAddressEmailProps = {
  brand: RuntimeBrandKey;
  firstName: string;
  verificationUrl: string;
  ttlHours: number;
};

export function VerifyEmailAddressEmail({
  brand,
  firstName,
  verificationUrl,
  ttlHours
}: VerifyEmailAddressEmailProps) {
  return (
    <BcnEmailLayout
      brand={brand}
      previewText={
        brand === "circle-card"
          ? "Confirm your email address to complete your Circle Card account."
          : "Confirm your email address to unlock your full Business Circle member access."
      }
      eyebrow="EMAIL VERIFICATION"
      heading="Confirm your email address"
      lead={
        <>
          {brand === "circle-card" ? (
            <>
              Hi {firstName}, you are one step away from completing your Circle Card account.
              Confirm your email address to continue to your card, wallet and relationship tools.
            </>
          ) : (
            <>
              Hi {firstName}, you are one step away from full access to The Business Circle
              Network. Confirm your email address to unlock your member access and continue inside
              the platform.
            </>
          )}
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
