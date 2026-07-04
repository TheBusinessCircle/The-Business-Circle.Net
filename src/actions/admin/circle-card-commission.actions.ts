"use server";

import { CircleCardAmbassadorType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  generateCurrentMonthCircleCardCommissionLedger,
  requireCircleCardCommissionOwner,
  updateCircleCardAmbassadorProfile,
  updateCircleCardCommissionStatus
} from "@/server/circle-card/commission.service";

const ADMIN_CIRCLE_CARD_PATH = "/admin/circle-card";

export async function generateCircleCardCommissionLedgerAction() {
  await requireCircleCardCommissionOwner();
  await generateCurrentMonthCircleCardCommissionLedger();
  revalidatePath(ADMIN_CIRCLE_CARD_PATH);
  revalidatePath("/dashboard/circle-card");
}

export async function updateCircleCardAmbassadorProfileAction(formData: FormData) {
  await requireCircleCardCommissionOwner();
  const userId = String(formData.get("userId") ?? "").trim();
  const requestedType = String(formData.get("type") ?? "STANDARD");
  if (!userId) throw new Error("A user ID is required.");
  if (!Object.values(CircleCardAmbassadorType).includes(requestedType as CircleCardAmbassadorType)) {
    throw new Error("Invalid ambassador type.");
  }

  await updateCircleCardAmbassadorProfile({
    userId,
    type: requestedType as CircleCardAmbassadorType,
    freeProGranted: formData.get("freeProGranted") === "on",
    active: formData.get("active") === "on"
  });
  revalidatePath(ADMIN_CIRCLE_CARD_PATH);
  revalidatePath("/dashboard/circle-card");
}

export async function markCircleCardCommissionPaidAction(formData: FormData) {
  const session = await requireCircleCardCommissionOwner();
  const ledgerId = String(formData.get("ledgerId") ?? "").trim();
  if (!ledgerId) throw new Error("A commission row is required.");
  await updateCircleCardCommissionStatus({
    ledgerId,
    status: "PAID",
    reviewedById: session.user.id,
    reason: String(formData.get("reason") ?? "Manual payment confirmation")
  });
  revalidatePath(ADMIN_CIRCLE_CARD_PATH);
  revalidatePath("/dashboard/circle-card");
}

export async function voidCircleCardCommissionAction(formData: FormData) {
  const session = await requireCircleCardCommissionOwner();
  const ledgerId = String(formData.get("ledgerId") ?? "").trim();
  if (!ledgerId) throw new Error("A commission row is required.");
  await updateCircleCardCommissionStatus({
    ledgerId,
    status: "VOID",
    reviewedById: session.user.id,
    reason: String(formData.get("reason") ?? "Voided by platform owner")
  });
  revalidatePath(ADMIN_CIRCLE_CARD_PATH);
  revalidatePath("/dashboard/circle-card");
}
