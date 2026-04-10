import { SubscriptionStatus } from "@prisma/client";
import { z } from "zod";
import { canBypassDeleteConfirmation } from "@/actions/admin/member-account-removal.shared";

const deleteMemberFormSchema = z.object({
  memberId: z.string().cuid(),
  returnPath: z.string().optional(),
  confirmationEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase())
});

const DELETION_BLOCKED_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.UNPAID,
  SubscriptionStatus.PAUSED
]);

function stringEntry(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

export function parseDeleteMemberFormData(formData: FormData) {
  return deleteMemberFormSchema.safeParse({
    memberId: stringEntry(formData, "memberId"),
    returnPath: stringEntry(formData, "returnPath"),
    confirmationEmail: stringEntry(formData, "confirmationEmail")
  });
}

export function isMemberDeletionBlockedBySubscriptionStatus(
  status: SubscriptionStatus | null | undefined
) {
  if (!status) {
    return false;
  }

  return DELETION_BLOCKED_SUBSCRIPTION_STATUSES.has(status);
}

export { canBypassDeleteConfirmation };
