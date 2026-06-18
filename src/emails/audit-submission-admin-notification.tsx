import React from "react";
import {
  BcnEmailLayout,
  EmailDetailsList,
  EmailMutedText,
  EmailPanel
} from "@/emails/bcn-email-layout";

type AuditSubmissionAdminNotificationEmailProps = {
  name: string;
  email: string;
  businessName?: string | null;
  website?: string | null;
  score: number;
  resultType: string;
  recommendedTier: string;
  marketingEmailOptIn: boolean;
  sourcePath?: string | null;
};

export function AuditSubmissionAdminNotificationEmail({
  name,
  email,
  businessName,
  website,
  score,
  resultType,
  recommendedTier,
  marketingEmailOptIn,
  sourcePath
}: AuditSubmissionAdminNotificationEmailProps) {
  return (
    <BcnEmailLayout
      previewText="A Founder Audit result has been submitted."
      eyebrow="FOUNDER AUDIT"
      heading="Audit result captured"
      lead="A Founder Audit lead capture form has been submitted and the result was shown on-site."
    >
      <EmailPanel title="Audit lead">
        <EmailDetailsList
          items={[
            { label: "Name", value: name },
            { label: "Email", value: email },
            { label: "Business", value: businessName || "N/A" },
            { label: "Website", value: website || "N/A" },
            { label: "Score", value: `${score} of 30` },
            { label: "Result", value: resultType },
            { label: "Recommended tier", value: recommendedTier },
            { label: "Source", value: sourcePath || "/audit" },
            { label: "Marketing opt-in", value: marketingEmailOptIn ? "Yes" : "No" }
          ]}
        />
      </EmailPanel>

      <EmailPanel title="Follow-up rule">
        <EmailMutedText>
          Essential follow-up about the audit submission is permitted. BCN updates, offers and
          growth-tip emails require the marketing opt-in value to be Yes.
        </EmailMutedText>
      </EmailPanel>
    </BcnEmailLayout>
  );
}
