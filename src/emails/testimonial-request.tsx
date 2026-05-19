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
  companyName?: string | null;
  auditBusinessName?: string | null;
  contextNote?: string | null;
  subjectContext: "bcn" | "growth" | "general";
};

function leadForContext(context: TestimonialRequestEmailProps["subjectContext"]) {
  if (context === "bcn") {
    return "You have been invited to leave a testimonial for The Business Circle Network.";
  }

  if (context === "growth") {
    return "You have been invited to leave a testimonial about your audit or Growth Architect experience.";
  }

  return "You have been invited to leave a testimonial for The Business Circle Network.";
}

export function TestimonialRequestEmail({
  recipientName,
  proofLabel,
  testimonialUrl,
  companyName,
  auditBusinessName,
  contextNote,
  subjectContext
}: TestimonialRequestEmailProps) {
  const firstName = recipientName.trim().split(/\s+/)[0] || recipientName;
  const contextItems = [
    companyName?.trim() ? `Company: ${companyName.trim()}` : null,
    auditBusinessName?.trim() ? `Audit/business: ${auditBusinessName.trim()}` : null,
    contextNote?.trim() ? contextNote.trim() : null
  ].filter((item): item is string => Boolean(item));

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
            After writing it, you can optionally copy the same words into a Google review.
          </EmailNote>
        </>
      }
    >
      <EmailParagraph>Hi {firstName},</EmailParagraph>
      <EmailParagraph>
        The secure button opens your testimonial page for {proofLabel}. You can write a few honest
        sentences, choose which details may be shown, and send it for review.
      </EmailParagraph>
      <EmailParagraph>
        If you are happy to leave a public Google review too, you will be able to copy your
        testimonial from the page and paste it into Google.
      </EmailParagraph>

      {contextItems.length ? (
        <EmailPanel title="Context">
          {contextItems.map((item) => (
            <EmailMutedText key={item}>{item}</EmailMutedText>
          ))}
        </EmailPanel>
      ) : null}
    </BcnEmailLayout>
  );
}
