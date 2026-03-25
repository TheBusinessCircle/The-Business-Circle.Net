"use server";

import {
  ChannelAccessLevel,
  MembershipTier,
  Prisma
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { slugify } from "@/lib/utils";

const createChannelSchema = z.object({
  returnPath: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(700).optional().or(z.literal("")),
  accessTier: z.nativeEnum(MembershipTier)
});

const updateChannelSchema = z.object({
  returnPath: z.string().optional(),
  channelId: z.string().cuid(),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(700).optional().or(z.literal("")),
  accessTier: z.nativeEnum(MembershipTier)
});

const deleteChannelSchema = z.object({
  returnPath: z.string().optional(),
  channelId: z.string().cuid()
});

const reorderChannelSchema = z.object({
  returnPath: z.string().optional(),
  channelId: z.string().cuid(),
  direction: z.enum(["up", "down"])
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

function revalidateCommunitySurface() {
  revalidatePath("/admin/channels");
  revalidatePath("/community");
}

function deriveChannelSlug(inputSlug: string, name: string): string {
  const slug = slugify(inputSlug || name).replace(/(^-|-$)/g, "");
  if (!slug) {
    throw new Error("invalid-slug");
  }

  return slug.slice(0, 120);
}

function resolveTierSettings(tier: MembershipTier): {
  accessTier: MembershipTier;
  accessLevel: ChannelAccessLevel;
  isPrivate: boolean;
} {
  if (tier === MembershipTier.CORE) {
    return {
      accessTier: MembershipTier.CORE,
      accessLevel: ChannelAccessLevel.INNER_CIRCLE,
      isPrivate: true
    };
  }

  if (tier === MembershipTier.INNER_CIRCLE) {
    return {
      accessTier: MembershipTier.INNER_CIRCLE,
      accessLevel: ChannelAccessLevel.INNER_CIRCLE,
      isPrivate: true
    };
  }

  return {
    accessTier: MembershipTier.FOUNDATION,
    accessLevel: ChannelAccessLevel.MEMBERS,
    isPrivate: false
  };
}

async function normalizeChannelPositions(tx: Prisma.TransactionClient) {
  const channels = await tx.channel.findMany({
    where: {
      isArchived: false
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      position: true
    }
  });

  await Promise.all(
    channels.map((channel, index) => {
      if (channel.position === index) {
        return Promise.resolve();
      }

      return tx.channel.update({
        where: { id: channel.id },
        data: { position: index }
      });
    })
  );
}

export async function createChannelAction(formData: FormData) {
  const session = await requireAdmin();

  const parsed = createChannelSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    name: String(formData.get("name") || ""),
    slug: String(formData.get("slug") || ""),
    description: String(formData.get("description") || ""),
    accessTier: String(formData.get("accessTier") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/admin/channels"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid");
  }

  let slug = "";
  try {
    slug = deriveChannelSlug(parsed.data.slug || "", parsed.data.name);
  } catch {
    redirectWithError(returnPath, "invalid-slug");
  }

  const settings = resolveTierSettings(parsed.data.accessTier);

  try {
    await db.$transaction(async (tx) => {
      const nextPosition = await tx.channel.count({
        where: {
          isArchived: false
        }
      });

      await tx.channel.create({
        data: {
          name: parsed.data.name,
          slug,
          description: parsed.data.description || null,
          accessTier: settings.accessTier,
          accessLevel: settings.accessLevel,
          isPrivate: settings.isPrivate,
          isArchived: false,
          position: nextPosition,
          createdById: session.user.id,
          allowAutomatedPrompts: true
        }
      });

      await normalizeChannelPositions(tx);
    });

    revalidateCommunitySurface();
    redirectWithNotice(returnPath, "channel-created");
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectWithError(returnPath, "slug-exists");
    }

    throw error;
  }
}

export async function updateChannelAction(formData: FormData) {
  await requireAdmin();

  const parsed = updateChannelSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    channelId: String(formData.get("channelId") || ""),
    name: String(formData.get("name") || ""),
    slug: String(formData.get("slug") || ""),
    description: String(formData.get("description") || ""),
    accessTier: String(formData.get("accessTier") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/admin/channels"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid");
  }

  let slug = "";
  try {
    slug = deriveChannelSlug(parsed.data.slug || "", parsed.data.name);
  } catch {
    redirectWithError(returnPath, "invalid-slug");
  }

  const settings = resolveTierSettings(parsed.data.accessTier);

  try {
    await db.$transaction(async (tx) => {
      const existing = await tx.channel.findUnique({
        where: { id: parsed.data.channelId },
        select: { id: true, isArchived: true }
      });

      if (!existing || existing.isArchived) {
        throw new Error("not-found");
      }

      await tx.channel.update({
        where: { id: parsed.data.channelId },
        data: {
          name: parsed.data.name,
          slug,
          description: parsed.data.description || null,
          accessTier: settings.accessTier,
          accessLevel: settings.accessLevel,
          isPrivate: settings.isPrivate
        }
      });

      await normalizeChannelPositions(tx);
    });

    revalidateCommunitySurface();
    redirectWithNotice(returnPath, "channel-updated");
  } catch (error) {
    if (error instanceof Error && error.message === "not-found") {
      redirectWithError(returnPath, "not-found");
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectWithError(returnPath, "slug-exists");
    }

    throw error;
  }
}

export async function deleteChannelAction(formData: FormData) {
  await requireAdmin();

  const parsed = deleteChannelSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    channelId: String(formData.get("channelId") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/admin/channels"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid");
  }

  try {
    await db.$transaction(async (tx) => {
      const existing = await tx.channel.findUnique({
        where: { id: parsed.data.channelId },
        select: { id: true, isArchived: true }
      });

      if (!existing || existing.isArchived) {
        throw new Error("not-found");
      }

      await tx.channel.delete({
        where: { id: parsed.data.channelId }
      });

      await normalizeChannelPositions(tx);
    });

    revalidateCommunitySurface();
    redirectWithNotice(returnPath, "channel-deleted");
  } catch (error) {
    if (error instanceof Error && error.message === "not-found") {
      redirectWithError(returnPath, "not-found");
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirectWithError(returnPath, "not-found");
    }

    throw error;
  }
}

export async function reorderChannelAction(formData: FormData) {
  await requireAdmin();

  const parsed = reorderChannelSchema.safeParse({
    returnPath: String(formData.get("returnPath") || ""),
    channelId: String(formData.get("channelId") || ""),
    direction: String(formData.get("direction") || "")
  });

  const returnPath = resolveReturnPath(
    parsed.success ? parsed.data.returnPath : undefined,
    "/admin/channels"
  );

  if (!parsed.success) {
    redirectWithError(returnPath, "invalid");
  }

  try {
    await db.$transaction(async (tx) => {
      const channels = await tx.channel.findMany({
        where: {
          isArchived: false
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true
        }
      });

      const currentIndex = channels.findIndex(
        (channel) => channel.id === parsed.data.channelId
      );

      if (currentIndex < 0) {
        throw new Error("not-found");
      }

      const targetIndex =
        parsed.data.direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= channels.length) {
        await normalizeChannelPositions(tx);
        return;
      }

      const orderedIds = channels.map((channel) => channel.id);
      const [item] = orderedIds.splice(currentIndex, 1);
      orderedIds.splice(targetIndex, 0, item);

      await Promise.all(
        orderedIds.map((channelId, position) =>
          tx.channel.update({
            where: { id: channelId },
            data: { position }
          })
        )
      );
    });

    revalidateCommunitySurface();
    redirectWithNotice(returnPath, "channel-reordered");
  } catch (error) {
    if (error instanceof Error && error.message === "not-found") {
      redirectWithError(returnPath, "not-found");
    }

    throw error;
  }
}

