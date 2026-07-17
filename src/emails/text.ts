import { BCN_EMAIL_FOOTER_NAME } from "@/emails/theme";
import { resolveEmailBrandIdentity, type EmailBrandKey } from "@/lib/email/brand";

type BuildBrandedEmailTextInput = {
  greeting?: string | null;
  eyebrow?: string | null;
  heading: string;
  bodyLines: string[];
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  fallbackNotice?: string | null;
  noteLines?: string[];
  footerName?: string;
};

export function buildBrandedEmailText(input: BuildBrandedEmailTextInput) {
  const lines: string[] = [];

  if (input.greeting?.trim()) {
    lines.push(input.greeting.trim(), "");
  }

  if (input.eyebrow?.trim()) {
    lines.push(input.eyebrow.trim().toUpperCase());
  }

  lines.push(input.heading.trim(), "");
  lines.push(...input.bodyLines.map((line) => line.trim()));

  if (input.ctaLabel?.trim() && input.ctaUrl?.trim()) {
    lines.push("", input.ctaLabel.trim(), input.ctaUrl.trim());
  } else if (input.ctaUrl?.trim()) {
    lines.push("", input.ctaUrl.trim());
  }

  if (input.fallbackNotice?.trim()) {
    lines.push("", input.fallbackNotice.trim());
  }

  if (input.noteLines?.length) {
    lines.push("", ...input.noteLines.map((line) => line.trim()));
  }

  lines.push("", input.footerName?.trim() || BCN_EMAIL_FOOTER_NAME);

  return lines.join("\n");
}

export function buildEmailBrandText(
  brand: EmailBrandKey,
  input: BuildBrandedEmailTextInput
) {
  if (brand === "bcn") {
    return buildBrandedEmailText(input);
  }

  const identity = resolveEmailBrandIdentity(brand);
  return buildBrandedEmailText({
    ...input,
    noteLines: [
      ...(input.noteLines ?? []),
      `Support: ${identity.supportEmail}`,
      `${identity.productName} is operated by ${identity.legalOperatorName}.`
    ],
    footerName: identity.productName
  });
}
