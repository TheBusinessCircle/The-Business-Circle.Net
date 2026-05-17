import {
  BcnEmailLayout,
  EmailMutedText,
  EmailNote,
  EmailPanel,
  EmailParagraph
} from "@/emails/bcn-email-layout";

type TestimonialRequestEmailProps = {
  recipientName: string;
  proofLabel: string;
  testimonialUrl: string;
  contextNote?: string | null;
  subjectContext: "bcn" | "growth" | "general";
};

function leadForContext(context: TestimonialRequestEmailProps["subjectContext"]) {
  if (context === "bcn") {
    return "If The Business Circle has helped you find clearer conversations, stronger direction, or a better room for business thinking, I would be grateful for a few words.";
  }

  if (context === "growth") {
    return "Thank you again for trusting me to review your business. If the audit gave you clearer direction, stronger priorities, or a better understanding of where your website, message, trust signals, visibility, or customer journey can improve, I would really appreciate a short testimonial.";
  }

  return "If your experience with The Business Circle Network has been useful, I would be grateful for a few words.";
}

export function TestimonialRequestEmail({
  recipientName,
  proofLabel,
  testimonialUrl,
  contextNote,
  subjectContext
}: TestimonialRequestEmailProps) {
  const firstName = recipientName.trim().split(/\s+/)[0] || recipientName;

  return (
    <BcnEmailLayout
      previewText="A short testimonial request from The Business Circle Network."
      eyebrow="Testimonial request"
      heading="Could you share a few words?"
      lead={leadForContext(subjectContext)}
      ctaLabel="Share your testimonial"
      ctaUrl={testimonialUrl}
      fallbackUrl={testimonialUrl}
      note={
        <>
          <EmailNote>
            Your response is reviewed before anything is displayed publicly.
          </EmailNote>
          <EmailNote>
            You can choose which name and business details may be shown.
          </EmailNote>
        </>
      }
    >
      <EmailParagraph>Hi {firstName},</EmailParagraph>
      {subjectContext === "growth" ? (
        <>
          <EmailParagraph>
            You can share what made the audit useful, what became clearer, whether the breakdown
            felt practical, or whether you would recommend it to another business owner.
          </EmailParagraph>
          <EmailParagraph>
            Nothing will be published publicly without approval.
          </EmailParagraph>
        </>
      ) : (
        <>
          <EmailParagraph>
            I hope you are well. This is a simple request for a short testimonial for {proofLabel}.
          </EmailParagraph>
          <EmailParagraph>
            No need to over-polish it. A few honest sentences about what became clearer, easier, or more useful is enough.
          </EmailParagraph>
        </>
      )}

      {contextNote?.trim() ? (
        <EmailPanel title="Context">
          <EmailMutedText>{contextNote.trim()}</EmailMutedText>
        </EmailPanel>
      ) : null}
    </BcnEmailLayout>
  );
}
