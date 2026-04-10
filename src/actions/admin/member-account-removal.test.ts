import { SubscriptionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canBypassDeleteConfirmation,
  isMemberDeletionBlockedBySubscriptionStatus,
  parseDeleteMemberFormData
} from "@/actions/admin/member-account-removal";

function appendEntries(formData: FormData, entries: Record<string, string>) {
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

describe("member account removal helpers", () => {
  it("parses a delete confirmation form and normalizes the email", () => {
    const formData = appendEntries(new FormData(), {
      memberId: "cm9adminremove0000000000000",
      returnPath: "/admin/members/cm9adminremove0000000000000",
      confirmationEmail: " TestUser@Example.com "
    });

    const parsed = parseDeleteMemberFormData(formData);

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.confirmationEmail).toBe("testuser@example.com");
  });

  it("blocks deletion when a membership still has live billing status", () => {
    expect(isMemberDeletionBlockedBySubscriptionStatus(SubscriptionStatus.ACTIVE)).toBe(true);
    expect(isMemberDeletionBlockedBySubscriptionStatus(SubscriptionStatus.TRIALING)).toBe(true);
    expect(isMemberDeletionBlockedBySubscriptionStatus(SubscriptionStatus.PAST_DUE)).toBe(true);
    expect(isMemberDeletionBlockedBySubscriptionStatus(SubscriptionStatus.UNPAID)).toBe(true);
    expect(isMemberDeletionBlockedBySubscriptionStatus(SubscriptionStatus.PAUSED)).toBe(true);
  });

  it("allows deletion for accounts without live billing", () => {
    expect(isMemberDeletionBlockedBySubscriptionStatus(SubscriptionStatus.INCOMPLETE)).toBe(false);
    expect(
      isMemberDeletionBlockedBySubscriptionStatus(SubscriptionStatus.INCOMPLETE_EXPIRED)
    ).toBe(false);
    expect(isMemberDeletionBlockedBySubscriptionStatus(SubscriptionStatus.CANCELED)).toBe(false);
    expect(isMemberDeletionBlockedBySubscriptionStatus(null)).toBe(false);
  });

  it("marks the listed test emails for confirmation bypass", () => {
    expect(canBypassDeleteConfirmation("trev@vuicevapes.com")).toBe(true);
    expect(canBypassDeleteConfirmation("TR3VORNEWTON@GMAIL.COM")).toBe(true);
    expect(canBypassDeleteConfirmation("someone@example.com")).toBe(false);
    expect(canBypassDeleteConfirmation(null)).toBe(false);
  });
});
