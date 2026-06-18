import React from "react";
import {
  BcnEmailLayout,
  EmailDetailsList,
  EmailMutedText,
  EmailPanel
} from "@/emails/bcn-email-layout";

type LeadAdminNotificationEmailProps = {
  name: string;
  email: string;
  businessName?: string | null;
  website?: string | null;
  sourceLabel: string;
  consentStatus: string;
  marketingEmailOptIn: boolean;
  tags: string[];
  score?: number | null;
  status: string;
  createdAt: string;
};

export function LeadAdminNotificationEmail({
  name,
  email,
  businessName,
  website,
  sourceLabel,
  consentStatus,
  marketingEmailOptIn,
  tags,
  score,
  status,
  createdAt
}: LeadAdminNotificationEmailProps) {
  return (
    <BcnEmailLayout
      previewText="A new BCN lead has been captured."
      eyebrow="LEAD GENERATION"
      heading="New lead captured"
      lead="A new lead has been captured in the admin Lead Generation section."
    >
      <EmailPanel title="Lead details">
        <EmailDetailsList
          items={[
            { label: "Name", value: name },
            { label: "Email", value: email },
            { label: "Business", value: businessName || "N/A" },
            { label: "Website", value: website || "N/A" },
            { label: "Source", value: sourceLabel },
            { label: "Consent", value: consentStatus },
            { label: "Marketing opt-in", value: marketingEmailOptIn ? "Yes" : "No" },
            { label: "Status", value: status },
            { label: "Score", value: typeof score === "number" ? String(score) : "N/A" },
            { label: "Created", value: createdAt },
            { label: "Tags", value: tags.length ? tags.join(", ") : "None" }
          ]}
        />
      </EmailPanel>

      <EmailPanel title="Consent reminder">
        <EmailMutedText>
          Marketing emails are allowed only when the marketing opt-in value is Yes. Service
          emails are allowed where needed for account, membership or submission operation.
        </EmailMutedText>
      </EmailPanel>
    </BcnEmailLayout>
  );
}
