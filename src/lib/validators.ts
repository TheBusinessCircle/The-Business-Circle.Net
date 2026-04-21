import { BusinessStage, BusinessStatus, MemberRoleTag } from "@prisma/client";
import { z } from "zod";
import { credentialsSignInSchema, registerMemberSchema } from "@/lib/auth/schemas";

export const signInSchema = credentialsSignInSchema;

export const registerSchema = registerMemberSchema;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalUrl = z.string().trim().url().max(2048).optional().or(z.literal(""));
const optionalJsonArray = z.string().trim().max(8000).optional().or(z.literal(""));
const optionalProfileImage = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => {
      if (!value) {
        return true;
      }

      if (value.startsWith("/uploads/profiles/")) {
        return true;
      }

      return z.string().url().safeParse(value).success;
    },
    {
      message: "Profile image must be a full URL or an uploaded profile image path."
    }
  )
  .optional()
  .or(z.literal(""));
const requiredText = (min: number, max: number) => z.string().trim().min(min).max(max);

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(320),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(2000)
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  profileImage: optionalProfileImage,
  memberRoleTag: z.nativeEnum(MemberRoleTag),
  headline: optionalText(120),
  bio: optionalText(1200),
  location: optionalText(100),
  experience: optionalText(120),
  website: optionalUrl,
  instagram: optionalUrl,
  linkedin: optionalUrl,
  tiktok: optionalUrl,
  facebook: optionalUrl,
  youtube: optionalUrl,
  customLinks: optionalJsonArray,
  collaborationNeeds: optionalText(600),
  collaborationOffers: optionalText(600),
  partnershipInterests: optionalText(600),
  collaborationTags: optionalText(300),
  companyName: optionalText(120),
  businessStatus: z.nativeEnum(BusinessStatus).optional().or(z.literal("")),
  companyNumber: optionalText(64),
  businessDescription: optionalText(1200),
  industry: optionalText(100),
  services: optionalText(400),
  businessStage: z.enum(["IDEA", "STARTUP", "GROWTH", "SCALE", "ESTABLISHED"]).optional().or(z.literal(""))
});

export const resourceSchema = z.object({
  title: z.string().min(4).max(180),
  slug: z.string().max(220).optional().or(z.literal("")),
  summary: z.string().min(12).max(4000),
  intent: z.enum(["save_draft", "publish"]),
  accessTier: z.enum(["FOUNDATION", "INNER_CIRCLE", "CORE"]),
  categoryId: z.string().cuid(),
  tagsInput: optionalText(400),
  stageLabelsInput: optionalText(400),
  estimatedReadMinutes: z.coerce.number().int().min(1).max(240).optional(),
  coverImage: z.string().url().optional().or(z.literal(""))
});

export const resourceBlockSchema = z.object({
  id: z.string().cuid().optional(),
  type: z.enum(["TEXT", "CHECKLIST", "STEPS", "IMAGE", "VIDEO", "QUOTE", "CALLOUT", "DOWNLOAD", "LINKS"]),
  position: z.number().int().min(0),
  content: z.record(z.any())
});

export const channelSchema = z.object({
  name: z.string().min(3).max(60),
  slug: z.string().min(3).max(60),
  description: z.string().max(240).optional(),
  accessTier: z.enum(["FOUNDATION", "INNER_CIRCLE", "CORE"]),
  position: z.coerce.number().int().min(0),
  isPrivate: z.coerce.boolean()
});

export const eventSchema = z.object({
  title: z.string().min(4).max(140),
  description: z.string().max(1200).optional(),
  startAt: z.string().min(1),
  endAt: z.string().optional(),
  hostName: z.string().max(120).optional(),
  meetingLink: z.string().url().optional().or(z.literal("")),
  accessTier: z.enum(["FOUNDATION", "INNER_CIRCLE", "CORE"])
});

export const messageSchema = z.object({
  content: z.string().min(1).max(1200),
  parentMessageId: z.string().cuid().optional()
});

export const messageDeleteSchema = z.object({
  messageId: z.string().cuid()
});

export const founderServiceRequestSchema = z.object({
  serviceSlug: z.string().trim().min(3).max(120),
  sourcePage: optionalText(120),
  sourceSection: optionalText(120),
  fullName: requiredText(2, 120),
  email: z.string().trim().email().max(320),
  businessName: requiredText(2, 140),
  businessStage: z.nativeEnum(BusinessStage),
  website: requiredText(3, 2048),
  helpSummary: requiredText(10, 2000)
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type ContactFormInput = z.infer<typeof contactSchema>;
export type FounderServiceRequestFormValues = z.infer<typeof founderServiceRequestSchema>;

