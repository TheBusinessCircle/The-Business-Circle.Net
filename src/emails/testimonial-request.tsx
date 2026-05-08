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
    return "If our Growth Architect work helped you find clarity, improve positioning, strengthen conversion, or make a cleaner growth decision, I would be grateful for a few words.";
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
      <EmailParagraph>
        I hope you are well. This is a simple request for a short testimonial for {proofLabel}.
      </EmailParagraph>
      <EmailParagraph>
        No need to over-polish it. A few honest sentences about what became clearer, easier, or more useful is enough.
      </EmailParagraph>

      {contextNote?.trim() ? (
        <EmailPanel title="Context">
          <EmailMutedText>{contextNote.trim()}</EmailMutedText>
        </EmailPanel>
      ) : null}
    </BcnEmailLayout>
  );
}
