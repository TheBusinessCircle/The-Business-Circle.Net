import { BusinessStage, BusinessStatus } from "@prisma/client";
import { z } from "zod";

const passwordRequirements =
  "Password must include uppercase, lowercase, number, and symbol characters.";

export const membershipTierValues = ["FOUNDATION", "INNER_CIRCLE", "CORE"] as const;
export const membershipTierSchema = z.enum(membershipTierValues);

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

export const registerMemberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  tier: membershipTierSchema,
  businessName: z.string().trim().max(140).optional().or(z.literal("")),
  businessStatus: z.nativeEnum(BusinessStatus).optional().or(z.literal("")),
  companyNumber: z.string().trim().max(64).optional().or(z.literal("")),
  businessStage: z.nativeEnum(BusinessStage).optional().or(z.literal("")),
  inviteCode: z.string().trim().max(64).optional()
});

export const registerMemberFormSchema = registerMemberSchema
  .extend({
    confirmPassword: passwordSchema
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"]
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
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;

