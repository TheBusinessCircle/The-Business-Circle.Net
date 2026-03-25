"use server";

import {
  EventAccessLevel,
  MembershipTier,
  Prisma
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const baseEventSchema = z.object({
  returnPath: z.string().optional(),
  title: z.string().trim().min(4).max(140),
  description: z.string().trim().max(2400).optional().or(z.literal("")),
  hostName: z.string().trim().max(120).optional().or(z.literal("")),
  startAt: z.string().trim().min(1),
  endAt: z.string().trim().optional().or(z.literal("")),
  timezone: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  accessTier: z.nativeEnum(MembershipTier).optional(),
  accessLevel: z.nativeEnum(EventAccessLevel),
  deliveryMode: z.enum(["online", "offline"]),
  meetingLink: z.string().trim().url().max(2048).optional().or(z.literal("")),
  replayUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
  location: z.string().trim().max(180).optional().or(z.literal(""))
});

const createEventSchema = baseEventSchema;

const updateEventSchema = baseEventSchema.extend({
  eventId: z.string().cuid()
});

const deleteEventSchema = z.object({
  returnPath: z.string().optional(),
  eventId: z.string().cuid()
});

function appendQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function resolveReturnPath(value: string | undefined, fallback: string): string {
  return safeRedirectPath(value, fallback);
}

function redirectWithError(path: string, errorCode: string): never {
  redirect(appendQueryParam(path, "error", errorCode));
}

function redirectWithNotice(path: string, noticeCode: string): never {
  redirect(appendQueryParam(path, "notice", noticeCode));
}

function parseDateTimeLocal(value: string, fallbackError: string): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(fallbackError);
  }

  return date;
}

function isValidTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat("en-GB", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function resolveAccessTier(
  level: EventAccessLevel,
  requestedTier: MembershipTier | undefined
): MembershipTier {
  if (level === EventAccessLevel.PUBLIC || level === EventAccessLevel.MEMBERS) {
    return MembershipTier.FOUNDATION;
  }

  if (requestedTier === MembershipTier.CORE) {
    return MembershipTier.CORE;
  }

  return MembershipTier.INNER_CIRCLE;
}

function resolvePayloadFromParsed(
  parsed:
    | z.infer<typeof createEventSchema>
    | z.infer<typeof updateEventSchema>,
  returnPath: string
) {
  const timezone = parsed.timezone?.trim() || "Europe/London";
  if (!isValidTimeZone(timezone)) {
    redirectWithError(returnPath, "invalid-timezone");
  }

  let startAt: Date;
  try {
    startAt = parseDateTimeLocal(parsed.startAt, "invalid-start-date");
  } catch {
    redirectWithError(returnPath, "invalid-start-date");
  }

  let endAt: Date | null = null;
  if (parsed.endAt?.trim()) {
    try {
      endAt = parseDateTimeLocal(parsed.endAt, "invalid-end-date");
    } catch {
      redirectWithError(returnPath, "invalid-end-date");
    }
  }

  if (endAt && endAt <= startAt) {
    redirectWithError(returnPath, "invalid-range");
  }

  const meetingLink =
    parsed.deliveryMode === "online" ? (parsed.meetingLink || "").trim() : "";

  if (parsed.deliveryMode === "online" && !meetingLink) {
    redirectWithError(returnPath, "meeting-link-required");
  }

  return {
    title: parsed.title,
    description: parsed.description || null,
    hostName: parsed.hostName || null,
    startAt,
    endAt,
    timezone,
    accessLevel: parsed.accessLevel,
    accessTier: resolveAccessTier(parsed.accessLevel, parsed.accessTier),
    meetingLink: meetingLink || null,
    replayUrl: parsed.replayUrl || null,
    location: parsed.location || null
  };
}

function revalidateEventSurfaces() {
  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  revalidatePath("/community");
  revalidatePath("/events");
  revalidatePath("/inner-circle");
}

export async function createEventAction(formData: FormData) {
  await requireAdmin();

  const parsed = createEventSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    title: String(formData.get("title") || ""),
    description: String(formData.get("description") || ""),
    hostName: String(formData.get("hostName") || ""),
    startAt: String(formData.get("startAt") || ""),
    endAt: String(formData.get("endAt") || ""),
    timezone: String(formData.get("timezone") || ""),
    accessTier: String(formData.get("accessTier") || ""),
    accessLevel: String(formData.get("accessLevel") || ""),
    deliveryMode: String(formData.get("deliveryMode") || ""),
    meetingLink: String(formData.get("meetingLink") || ""),
    replayUrl: String(formData.get("replayUrl") || ""),
    location: String(formData.get("location") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/admin/events"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid");
  }

  const payload = resolvePayloadFromParsed(parsed.data, returnPath);

  try {
    await db.event.create({
      data: {
        ...payload,
        isCancelled: false
      }
    });

    revalidateEventSurfaces();
    redirectWithNotice(returnPath, "event-created");
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectWithError(returnPath, "duplicate");
    }

    throw error;
  }
}

export async function updateEventAction(formData: FormData) {
  await requireAdmin();

  const parsed = updateEventSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    eventId: String(formData.get("eventId") || ""),
    title: String(formData.get("title") || ""),
    description: String(formData.get("description") || ""),
    hostName: String(formData.get("hostName") || ""),
    startAt: String(formData.get("startAt") || ""),
    endAt: String(formData.get("endAt") || ""),
    timezone: String(formData.get("timezone") || ""),
    accessTier: String(formData.get("accessTier") || ""),
    accessLevel: String(formData.get("accessLevel") || ""),
    deliveryMode: String(formData.get("deliveryMode") || ""),
    meetingLink: String(formData.get("meetingLink") || ""),
    replayUrl: String(formData.get("replayUrl") || ""),
    location: String(formData.get("location") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/admin/events"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid");
  }

  const payload = resolvePayloadFromParsed(parsed.data, returnPath);

  try {
    await db.event.update({
      where: {
        id: parsed.data.eventId
      },
      data: payload
    });

    revalidateEventSurfaces();
    redirectWithNotice(returnPath, "event-updated");
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirectWithError(returnPath, "not-found");
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectWithError(returnPath, "duplicate");
    }

    throw error;
  }
}

export async function deleteEventAction(formData: FormData) {
  await requireAdmin();

  const parsed = deleteEventSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    eventId: String(formData.get("eventId") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/admin/events"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid");
  }

  try {
    await db.event.delete({
      where: {
        id: parsed.data.eventId
      }
    });

    revalidateEventSurfaces();
    redirectWithNotice("/admin/events", "event-deleted");
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirectWithError(returnPath, "not-found");
    }

    throw error;
  }
}

