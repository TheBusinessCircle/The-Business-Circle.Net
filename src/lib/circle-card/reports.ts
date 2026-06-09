import { z } from "zod";

export const CIRCLE_CARD_REPORT_REASONS = [
  "INAPPROPRIATE_CONTENT",
  "NUDE_OR_SEXUAL_CONTENT",
  "SCAM_OR_FRAUD",
  "FAKE_BUSINESS",
  "SPAM",
  "HARASSMENT",
  "IMPERSONATION",
  "MALICIOUS_FILE",
  "SUSPICIOUS_FILE",
  "UNSAFE_FILE",
  "OTHER"
] as const;

export type CircleCardReportReasonValue = (typeof CIRCLE_CARD_REPORT_REASONS)[number];

export const CIRCLE_CARD_REPORT_STATUSES = [
  "OPEN",
  "REVIEWING",
  "RESOLVED",
  "DISMISSED"
] as const;

export type CircleCardReportStatusValue = (typeof CIRCLE_CARD_REPORT_STATUSES)[number];

export const CIRCLE_CARD_REPORT_REASON_OPTIONS: Array<{
  value: CircleCardReportReasonValue;
  label: string;
}> = [
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "NUDE_OR_SEXUAL_CONTENT", label: "Nude or sexual content" },
  { value: "SCAM_OR_FRAUD", label: "Scam or fraud" },
  { value: "FAKE_BUSINESS", label: "Fake business" },
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "IMPERSONATION", label: "Impersonation" },
  { value: "MALICIOUS_FILE", label: "Malicious file" },
  { value: "SUSPICIOUS_FILE", label: "Suspicious file" },
  { value: "UNSAFE_FILE", label: "Unsafe file" },
  { value: "OTHER", label: "Other" }
];

export const CIRCLE_CARD_REPORT_STATUS_LABELS: Record<
  CircleCardReportStatusValue,
  string
> = {
  OPEN: "Open",
  REVIEWING: "Reviewing",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed"
};

const reasonLabels = new Map(
  CIRCLE_CARD_REPORT_REASON_OPTIONS.map((option) => [option.value, option.label])
);

export function circleCardReportReasonLabel(reason: CircleCardReportReasonValue | string) {
  return reasonLabels.get(reason as CircleCardReportReasonValue) ?? "Other";
}

export function circleCardReportStatusLabel(status: CircleCardReportStatusValue | string) {
  return CIRCLE_CARD_REPORT_STATUS_LABELS[status as CircleCardReportStatusValue] ?? status;
}

export const circleCardReportSubmitSchema = z.object({
  cardId: z.string().cuid(),
  reason: z.enum(CIRCLE_CARD_REPORT_REASONS),
  details: z.string().trim().max(1600).optional().or(z.literal(""))
});

export const circleCardModerationUpdateSchema = z.object({
  reportId: z.string().cuid(),
  intent: z.enum(["notes", "review", "resolve", "dismiss"]),
  adminNotes: z.string().trim().max(2400).optional().or(z.literal(""))
});
