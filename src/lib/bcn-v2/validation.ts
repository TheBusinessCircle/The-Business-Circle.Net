import { z } from "zod";
export const helpCategories = [
  "website",
  "accounting",
  "design",
  "bookkeeping",
  "software",
  "marketing",
  "other",
] as const;
const safeText = (max: number) => z.string().trim().min(2).max(max);
export const website = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use an HTTPS website address or leave blank.");
export const helpSchema = z
  .object({
    name: safeText(100),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    business: safeText(160),
    category: z.enum(helpCategories),
    summary: z.string().trim().min(20).max(4000),
    consent: z.literal(true),
    website: z.string().max(0).optional(),
  })
  .strict();
export const profileSchema = z
  .object({
    business: safeText(160),
    category: z.enum(helpCategories),
    location: safeText(160),
    description: z.string().trim().min(20).max(1500),
    website,
    publicConsent: z.boolean(),
    acceptsMessages: z.boolean().default(false),
  })
  .strict();
export const providerSchema = profileSchema
  .omit({ publicConsent: true, acceptsMessages: true })
  .extend({
    approved: z.boolean(),
    publicListingConsent: z.boolean(),
    agreementReference: z.string().trim().max(200),
    relatedBusinessDisclosure: z.string().trim().max(500),
  })
  .strict();
export const adminHelpSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("review"), id: z.string().cuid() }),
  z.object({
    action: z.literal("propose"),
    id: z.string().cuid(),
    providerId: z.string().cuid(),
    agreedFeePence: z.number().int().min(0).max(10000000),
  }),
  z.object({ action: z.literal("introduce"), id: z.string().cuid() }),
  z.object({
    action: z.literal("close"),
    id: z.string().cuid(),
    outcome: z.string().trim().min(5).max(1000),
  }),
  z.object({
    action: z.literal("reject"),
    id: z.string().cuid(),
    outcome: z.string().trim().min(5).max(1000),
  }),
]);
export function safeAffiliateDestination(offer: {
  active: boolean;
  approvedAt: Date | null;
  destination: string;
  allowedHost: string;
  approvalReference: string;
  disclosure: string;
}) {
  if (
    !offer.active ||
    !offer.approvedAt ||
    !offer.approvalReference ||
    !offer.disclosure
  )
    return null;
  try {
    const url = new URL(offer.destination);
    return url.protocol === "https:" &&
      url.hostname === offer.allowedHost &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
