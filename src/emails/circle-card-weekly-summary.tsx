import React from "react";
import {
  BcnEmailLayout,
  EmailDetailsList,
  EmailMutedText,
  EmailPanel,
  EmailParagraph
} from "@/emails/bcn-email-layout";

type CircleCardWeeklySummaryEmailProps = {
  firstName: string;
  completionScore: number;
  cardViews: number;
  shares: number;
  walletContacts: number;
  nextBestAction: string;
  completeProfileUrl: string;
  shareCardUrl: string;
};

function numberLabel(value: number) {
  return value.toLocaleString("en-GB");
}

export function CircleCardWeeklySummaryEmail({
  firstName,
  completionScore,
  cardViews,
  shares,
  walletContacts,
  nextBestAction,
  completeProfileUrl,
  shareCardUrl
}: CircleCardWeeklySummaryEmailProps) {
  return (
    <BcnEmailLayout
      brand="circle-card"
      previewText="Your Circle Card weekly summary is ready."
      eyebrow="CIRCLE CARD WEEKLY SUMMARY"
      heading="Your Circle Card this week"
      lead={
        <>
          Hi {firstName}, here is a short service summary for your Circle Card activity and
          next setup step.
        </>
      }
      ctaLabel="Complete Profile"
      ctaUrl={completeProfileUrl}
      fallbackUrl={completeProfileUrl}
      footerText="Circle Card"
    >
      <EmailPanel title="This week">
        <EmailDetailsList
          items={[
            { label: "Profile completion", value: `${completionScore}%` },
            { label: "Card views", value: numberLabel(cardViews) },
            { label: "Shares", value: numberLabel(shares) },
            { label: "Wallet contacts", value: numberLabel(walletContacts) }
          ]}
        />
      </EmailPanel>

      <EmailPanel title="Next best action">
        <EmailMutedText>{nextBestAction}</EmailMutedText>
      </EmailPanel>

      <EmailPanel title="Share card">
        <EmailMutedText>Share your Circle Card with someone you met recently.</EmailMutedText>
        <p style={{ margin: 0, wordBreak: "break-all" }}>
          <a
            href={shareCardUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#d6a84f", fontSize: "13px", lineHeight: 1.6 }}
          >
            {shareCardUrl}
          </a>
        </p>
      </EmailPanel>

      <EmailParagraph>
        This is a service email for your Circle Card account. It is not a marketing newsletter.
      </EmailParagraph>
    </BcnEmailLayout>
  );
}
