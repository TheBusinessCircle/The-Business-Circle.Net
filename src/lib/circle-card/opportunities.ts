import { z } from "zod";

export const CIRCLE_CARD_OPPORTUNITY_STATUSES = [
  "LEAD",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST"
] as const;

export const CIRCLE_CARD_OPPORTUNITY_SOURCE_TYPES = [
  "MANUAL",
  "REFERRAL",
  "INTRODUCTION",
  "RECOMMENDATION",
  "DISCOVERY",
  "CONNECTION"
] as const;

export const CIRCLE_CARD_OPPORTUNITY_CURRENCY_OPTIONS = ["GBP", "USD", "EUR"] as const;
export const CIRCLE_CARD_OPPORTUNITY_OPEN_STATUSES = [
  "LEAD",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION"
] as const;

export type CircleCardOpportunityStatus = (typeof CIRCLE_CARD_OPPORTUNITY_STATUSES)[number];
export type CircleCardOpportunitySourceType =
  (typeof CIRCLE_CARD_OPPORTUNITY_SOURCE_TYPES)[number];

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalDateInput = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .or(z.literal(""));
const optionalMoney = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || /^\d{1,9}(?:\.\d{1,2})?$/.test(value), {
    message: "Use a positive value with up to 2 decimal places."
  });
const currencyInput = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value.toUpperCase() : "GBP"))
  .refine((value) => /^[A-Z]{3}$/.test(value), {
    message: "Use a 3-letter currency code."
  });
const statusInput = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : "LEAD"),
  z.enum(CIRCLE_CARD_OPPORTUNITY_STATUSES)
);
const sourceTypeInput = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : "MANUAL"),
  z.enum(CIRCLE_CARD_OPPORTUNITY_SOURCE_TYPES)
);

export const circleCardOpportunityCreateSchema = z.object({
  walletContactId: z.string().cuid().optional().or(z.literal("")),
  title: z.string().trim().min(2).max(160),
  description: optionalText(1400),
  status: statusInput,
  potentialValue: optionalMoney,
  currency: currencyInput,
  sourceType: sourceTypeInput,
  nextFollowUpAt: optionalDateInput,
  notes: optionalText(2400),
  returnPath: optionalText(600)
});

export const circleCardOpportunityUpdateSchema = z.object({
  opportunityId: z.string().cuid(),
  title: z.string().trim().min(2).max(160),
  description: optionalText(1400),
  status: statusInput,
  potentialValue: optionalMoney,
  currency: currencyInput,
  sourceType: sourceTypeInput,
  lastActivityAt: optionalDateInput,
  nextFollowUpAt: optionalDateInput,
  notes: optionalText(2400),
  returnPath: optionalText(600)
});

export const circleCardOpportunityStatusSchema = z.object({
  opportunityId: z.string().cuid(),
  status: statusInput,
  returnPath: optionalText(600)
});

export function circleCardOpportunityStatusLabel(value: string | null | undefined) {
  switch (value) {
    case "LEAD":
      return "Lead";
    case "QUALIFIED":
      return "Qualified";
    case "PROPOSAL_SENT":
      return "Proposal Sent";
    case "NEGOTIATION":
      return "Negotiation";
    case "WON":
      return "Won";
    case "LOST":
      return "Lost";
    default:
      return "Opportunity";
  }
}

export function circleCardOpportunitySourceTypeLabel(value: string | null | undefined) {
  switch (value) {
    case "REFERRAL":
      return "Referral";
    case "INTRODUCTION":
      return "Introduction";
    case "RECOMMENDATION":
      return "Recommendation";
    case "DISCOVERY":
      return "Discovery";
    case "CONNECTION":
      return "Connection";
    case "MANUAL":
    default:
      return "Manual";
  }
}

export function isCircleCardOpportunityOpenStatus(value: string | null | undefined) {
  return value !== "WON" && value !== "LOST";
}
