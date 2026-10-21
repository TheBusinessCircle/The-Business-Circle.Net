import { z } from "zod";
import { helpCategories } from "./validation";
export const ideaStages = [
  "IDEA",
  "VALIDATING",
  "LAUNCHING",
  "RUNNING",
  "GROWING",
] as const;
export const supportKinds = [
  "FREE",
  "DISCOUNTED",
  "PAID",
  "SKILL_SWAP",
] as const;
export const supportLabels = {
  FREE: "Free help",
  DISCOUNTED: "Discounted service",
  PAID: "Paid service",
  SKILL_SWAP: "Skill swap",
};
const id = z.string().cuid();
export const ideaFields = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    title: z.string().trim().min(15).max(140),
    stage: z.enum(ideaStages),
    category: z.enum(helpCategories),
    idea: z.string().trim().min(50).max(2000),
    helpNeeded: z.string().trim().min(50).max(2000),
    nextMilestone: z.string().trim().min(20).max(500),
    location: z.string().trim().min(2).max(160),
    supportTypes: z
      .array(z.enum(supportKinds))
      .min(1)
      .max(4)
      .transform((v) => [...new Set(v)]),
    publicConsent: z.literal(true),
    practicalHelpOnly: z.literal(true),
  })
  .strict();
const money = z.number().int().min(0).max(10000000);
export const offerFields = z
  .object({
    requestId: id,
    displayName: z.string().trim().min(2).max(80),
    kind: z.enum(supportKinds),
    scope: z.string().trim().min(40).max(2000),
    timing: z.string().trim().min(5).max(300),
    pricePence: money,
    usualPricePence: money.nullable(),
    priceTerms: z.string().trim().min(10).max(500),
    agreesToContact: z.literal(true),
    honestPricing: z.literal(true),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (["FREE", "SKILL_SWAP"].includes(v.kind) && v.pricePence !== 0)
      ctx.addIssue({
        code: "custom",
        path: ["pricePence"],
        message: "Free help and skill swaps cannot include a cash price.",
      });
    if (["PAID", "DISCOUNTED"].includes(v.kind) && v.pricePence <= 0)
      ctx.addIssue({
        code: "custom",
        path: ["pricePence"],
        message: "State the actual price for a paid service.",
      });
    if (
      v.kind === "DISCOUNTED" &&
      (v.usualPricePence === null || v.usualPricePence <= v.pricePence)
    )
      ctx.addIssue({
        code: "custom",
        path: ["usualPricePence"],
        message:
          "A discount needs a genuine usual price above the offered price.",
      });
    if (v.kind !== "DISCOUNTED" && v.usualPricePence !== null)
      ctx.addIssue({
        code: "custom",
        path: ["usualPricePence"],
        message: "Only discounted services should show a usual price.",
      });
  });
export const ideaCommand = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), data: ideaFields }).strict(),
  z.object({ action: z.literal("edit"), id, data: ideaFields }).strict(),
  z.object({ action: z.literal("offer"), data: offerFields }).strict(),
  z.object({ action: z.literal("accept"), offerId: id }).strict(),
  z.object({ action: z.literal("close"), id }).strict(),
  z
    .object({
      action: z.literal("complete"),
      id,
      outcome: z.string().trim().min(20).max(500),
    })
    .strict(),
  z.object({ action: z.literal("withdraw-offer"), offerId: id }).strict(),
  z
    .object({
      action: z.literal("report"),
      id,
      offerId: id.optional(),
      detail: z.string().trim().min(10).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("moderate"),
      entity: z.enum(["request", "offer", "report"]),
      id,
      decision: z.enum(["approve", "reject", "resolve"]),
      note: z.string().trim().min(5).max(500),
    })
    .strict(),
]);
export type IdeaCommand = z.infer<typeof ideaCommand>;
export function ideaIsOpen(
  item: { status: string; expiresAt: Date },
  now = new Date(),
) {
  return item.status === "APPROVED" && item.expiresAt > now;
}
export function offerPrice(item: {
  kind: string;
  pricePence: number;
  usualPricePence: number | null;
}) {
  const gbp = (n: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(n / 100);
  if (item.kind === "FREE") return "Free help · £0";
  if (item.kind === "SKILL_SWAP") return "Skill swap · no cash price";
  return item.kind === "DISCOUNTED"
    ? `${gbp(item.pricePence)} · usual price ${gbp(item.usualPricePence ?? 0)}`
    : `${gbp(item.pricePence)} · paid service`;
}
