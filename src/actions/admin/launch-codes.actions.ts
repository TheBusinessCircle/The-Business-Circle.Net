"use server";

import { LaunchCodeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import {
  activateLaunchCode,
  archiveLaunchCode,
  createLaunchCode,
  pauseLaunchCode,
  seedDefaultLaunchCodes,
  updateLaunchCode
} from "@/server/admin/launch-codes.service";

function readNumber(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? new Date(text) : null;
}

export async function seedDefaultLaunchCodesAction() {
  await requireAdmin();
  await seedDefaultLaunchCodes();
  revalidatePath("/admin/launch-codes");
}

export async function createLaunchCodeAction(formData: FormData) {
  const session = await requireAdmin();
  await createLaunchCode({
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    platform: String(formData.get("platform") ?? ""),
    maxRedemptions: readNumber(formData.get("maxRedemptions"), 25),
    trialDays: readNumber(formData.get("trialDays"), 90),
    startsAt: readDate(formData.get("startsAt")),
    endsAt: readDate(formData.get("endsAt")),
    description: String(formData.get("description") ?? ""),
    createdById: session.user.id
  });
  revalidatePath("/admin/launch-codes");
}

export async function updateLaunchCodeAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await updateLaunchCode(id, {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    platform: String(formData.get("platform") ?? ""),
    maxRedemptions: readNumber(formData.get("maxRedemptions"), 25),
    trialDays: readNumber(formData.get("trialDays"), 90),
    startsAt: readDate(formData.get("startsAt")),
    endsAt: readDate(formData.get("endsAt")),
    description: String(formData.get("description") ?? ""),
    status: String(formData.get("status") || "") as LaunchCodeStatus | undefined
  });
  revalidatePath("/admin/launch-codes");
}

export async function pauseLaunchCodeAction(formData: FormData) {
  await requireAdmin();
  await pauseLaunchCode(String(formData.get("id") ?? ""));
  revalidatePath("/admin/launch-codes");
}

export async function activateLaunchCodeAction(formData: FormData) {
  await requireAdmin();
  await activateLaunchCode(String(formData.get("id") ?? ""));
  revalidatePath("/admin/launch-codes");
}

export async function archiveLaunchCodeAction(formData: FormData) {
  await requireAdmin();
  await archiveLaunchCode(String(formData.get("id") ?? ""));
  revalidatePath("/admin/launch-codes");
}
