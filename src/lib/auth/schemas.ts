import { BusinessStage, BusinessStatus } from "@prisma/client";
import { z } from "zod";
import { TERMS_LABEL } from "@/config/legal";

const passwordRequirements =
  "Password must include uppercase, lowercase, number, and symbol characters.";

export const membershipTierValues = ["FOUNDATION", "INNER_CIRCLE", "CORE"] as const;
export const membershipTierSchema = z.enum(membershipTierValues);
export const membershipBillingIntervalValues = ["monthly", "annual"] as const;
export const membershipBillingIntervalSchema = z.enum(membershipBillingIntervalValues);

const coreAccessConfirmationMessage =
  "Please confirm that you are actively running a business or generating revenue to continue to Core.";
const acceptedTermsMessage = `You must accept the ${TERMS_LABEL} to continue.`;

export const emailSchema = z.string().trim().email().max(254);

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(72, "Password cannot exceed 72 characters.")
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, passwordRequirements);

export const credentialsSignInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72)
});

const registerMemberBaseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  tier: membershipTierSchema,
  billingInterval: membershipBillingIntervalSchema.default("monthly"),
  coreAccessConfirmed: z.boolean().optional().default(false),
  acceptedTerms: z.boolean().optional().default(false),
  acceptedRules: z.boolean().optional().default(false),
  businessName: z.string().trim().max(140).optional().or(z.literal("")),
  businessStatus: z.nativeEnum(BusinessStatus).optional().or(z.literal("")),
  companyNumber: z.string().trim().max(64).optional().or(z.literal("")),
  businessStage: z.nativeEnum(BusinessStage).optional().or(z.literal("")),
  inviteCode: z.string().trim().max(64).optional()
});

export const registerMemberSchema = registerMemberBaseSchema.superRefine((input, context) => {
  if (input.tier === "CORE" && !input.coreAccessConfirmed) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["coreAccessConfirmed"],
      message: coreAccessConfirmationMessage
    });
  }

  if (!input.acceptedTerms) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["acceptedTerms"],
      message: acceptedTermsMessage
    });
  }

});

export const registerMemberFormSchema = registerMemberBaseSchema
  .extend({
    confirmPassword: passwordSchema
  })
  .superRefine((input, context) => {
    if (input.tier === "CORE" && !input.coreAccessConfirmed) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coreAccessConfirmed"],
        message: coreAccessConfirmationMessage
      });
    }

    if (!input.acceptedTerms) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["acceptedTerms"],
        message: acceptedTermsMessage
      });
    }

    if (input.password !== input.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords must match."
      });
    }
  });

export const passwordResetRequestSchema = z.object({
  email: emailSchema
});

export const passwordResetTokenSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{64}$/i, "Reset token format is invalid.");

export const passwordResetConfirmSchema = z
  .object({
    email: emailSchema,
    token: passwordResetTokenSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"]
  });

export type CredentialsSignInInput = z.infer<typeof credentialsSignInSchema>;
export type RegisterMemberInput = z.infer<typeof registerMemberSchema>;
export type RegisterMemberFormInput = z.infer<typeof registerMemberFormSchema>;
export type MembershipTierValue = z.infer<typeof membershipTierSchema>;
export type MembershipBillingIntervalValue = z.infer<typeof membershipBillingIntervalSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
