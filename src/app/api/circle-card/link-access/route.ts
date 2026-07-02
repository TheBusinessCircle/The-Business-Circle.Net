import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isTrustedOrigin } from "@/lib/security/origin";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  rateLimitHeaders
} from "@/lib/security/rate-limit";
import { prisma } from "@/lib/prisma";
import { resolveCircleCardFileAction } from "@/lib/circle-card/file-actions";
import {
  isSafeCircleCardExternalUrl,
  isSafeCircleCardLinkDestination
} from "@/lib/circle-card/schema";
import {
  createCircleCardActivityForCardOwner,
  readCircleCardVisitorIdFromCookieHeader,
  trackCircleCardEvent
} from "@/server/circle-card";
import { buildCircleCardFileResponse } from "@/server/circle-card/file-response.service";
import {
  createCircleCardLinkAccessToken,
  verifyCircleCardAccessCode,
  verifyCircleCardLinkAccessToken
} from "@/server/circle-card/link-access.service";
import { readCircleCardLinkFile } from "@/server/circle-card/upload.service";

export const runtime = "nodejs";

const linkAccessPayloadSchema = z.object({
  linkId: z.string().cuid(),
  code: z.string().trim().regex(/^\d{4}$/)
});

function anonymousRateKey(request: Request, linkId: string) {
  const visitorId = readCircleCardVisitorIdFromCookieHeader(request.headers.get("cookie"));
  const ip = clientIpFromHeaders(request.headers);
  const hash = createHash("sha256")
    .update(`${visitorId || "no-visitor"}:${ip}`)
    .digest("hex")
    .slice(0, 24);

  return `api:circle-card-link-access:${linkId}:${hash}`;
}

function localCircleCardFileName(fileUrl: string | null | undefined) {
  if (!fileUrl || !isSafeCircleCardLinkDestination(fileUrl)) {
    return null;
  }

  const match = fileUrl.match(/^\/api\/circle-card\/link-file\/([^/?#]+)$/);
  return match?.[1] ?? null;
}

function linkAccessMetadata(input: {
  linkId: string;
  label: string;
  type: string;
  destinationType?: "file" | "url" | "missing";
  actionMode?: string | null;
  resolvedAction?: "VIEW" | "DOWNLOAD";
}) {
  return {
    source: "private_link_access",
    linkId: input.linkId,
    label: input.label,
    type: input.type,
    visibility: "PRIVATE_CODE",
    destinationType: input.destinationType,
    actionMode: input.actionMode,
    resolvedAction: input.resolvedAction
  };
}

async function findPrivatePublicLink(linkId: string) {
  return prisma.circleCardLink.findFirst({
    where: {
      id: linkId,
      isActive: true,
      visibility: "PRIVATE_CODE",
      card: {
        isPublished: true,
        user: {
          suspended: false
        }
      }
    },
    select: {
      id: true,
      cardId: true,
      type: true,
      label: true,
      url: true,
      fileUrl: true,
      fileName: true,
      fileMimeType: true,
      actionMode: true,
      accessCodeHash: true
    }
  });
}

export async function POST(request: Request) {
  let headers: HeadersInit | undefined;

  try {
    if (!isTrustedOrigin(request, { allowMissingOrigin: true })) {
      return NextResponse.json({ ok: false, error: "Unable to verify this request." }, { status: 403 });
    }

    const rawPayload = (await request.json().catch(() => ({}))) as unknown;
    const parsed = linkAccessPayloadSchema.safeParse(rawPayload);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Enter the 4-digit access code." }, { status: 400 });
    }

    const rate = await consumeRateLimit({
      key: anonymousRateKey(request, parsed.data.linkId),
      limit: 8,
      windowMs: 10 * 60 * 1000
    });
    headers = rateLimitHeaders(rate);

    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many attempts. Please wait and try again." },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(rate.retryAfterSeconds)
          }
        }
      );
    }

    const visitorId = readCircleCardVisitorIdFromCookieHeader(request.headers.get("cookie"));
    const link = await findPrivatePublicLink(parsed.data.linkId);

    if (!link?.accessCodeHash) {
      return NextResponse.json({ ok: false, error: "That private link is not available." }, { status: 404, headers });
    }

    const matched = await verifyCircleCardAccessCode(parsed.data.code, link.accessCodeHash);

    if (!matched) {
      await trackCircleCardEvent({
        cardId: link.cardId,
        eventType: "CUSTOM_LINK_UNLOCK_FAILED",
        visitorId,
        metadata: linkAccessMetadata({
          linkId: link.id,
          label: link.label,
          type: link.type,
          destinationType: link.fileUrl ? "file" : link.url ? "url" : "missing"
        })
      });

      return NextResponse.json({ ok: false, error: "That code is not correct." }, { status: 401, headers });
    }

    const safeFileUrl = isSafeCircleCardLinkDestination(link.fileUrl) ? link.fileUrl : null;
    const safeUrl = isSafeCircleCardExternalUrl(link.url) ? link.url : null;
    const destinationType = safeFileUrl ? "file" : safeUrl ? "url" : "missing";
    const resolvedAction = resolveCircleCardFileAction(link);

    if (destinationType === "missing") {
      return NextResponse.json(
        { ok: false, error: "This private link does not have a destination yet." },
        { status: 404, headers }
      );
    }

    await Promise.all([
      trackCircleCardEvent({
        cardId: link.cardId,
        eventType: "CUSTOM_LINK_UNLOCK_SUCCESS",
        visitorId,
        metadata: linkAccessMetadata({
          linkId: link.id,
          label: link.label,
          type: link.type,
          destinationType,
          actionMode: link.actionMode,
          resolvedAction
        })
      }),
      trackCircleCardEvent({
        cardId: link.cardId,
        eventType: "CUSTOM_LINK_CLICK",
        visitorId,
        metadata: linkAccessMetadata({
          linkId: link.id,
          label: link.label,
          type: link.type,
          destinationType,
          actionMode: link.actionMode,
          resolvedAction
        })
      }),
      createCircleCardActivityForCardOwner({
        cardId: link.cardId,
        type: "PRIVATE_LINK_UNLOCKED",
        title: "Private link unlocked",
        message: `${link.label} was unlocked with its access code.`,
        entityType: "CUSTOM_LINK",
        entityId: link.id,
        metadata: {
          source: "private_link_access",
          linkId: link.id,
          label: link.label,
          type: link.type,
          destinationType,
          actionMode: link.actionMode,
          resolvedAction
        }
      })
    ]);

    return NextResponse.json(
      {
        ok: true,
        action: resolvedAction,
        accessUrl: `/api/circle-card/link-access?token=${encodeURIComponent(
          createCircleCardLinkAccessToken(link.id)
        )}`
      },
      { headers }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to unlock this link." }, { status: 500, headers });
  }
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const verified = verifyCircleCardLinkAccessToken(token);

  if (!verified) {
    return NextResponse.json({ error: "Private link access has expired." }, { status: 401 });
  }

  const link = await findPrivatePublicLink(verified.linkId);

  if (!link) {
    return NextResponse.json({ error: "Private link not found." }, { status: 404 });
  }

  const fileName = localCircleCardFileName(link.fileUrl);

  if (fileName) {
    const file = await readCircleCardLinkFile(fileName);

    if (!file) {
      return NextResponse.json({ error: "Circle Card file not found." }, { status: 404 });
    }

    return buildCircleCardFileResponse({
      bytes: file.bytes,
      mimeType: file.mimeType,
      fallbackFilename: file.originalFilename,
      fileName: link.fileName,
      fileMimeType: link.fileMimeType,
      fileUrl: link.fileUrl,
      actionMode: link.actionMode,
      cacheControl: "private, max-age=60"
    }).response;
  }

  const destination = isSafeCircleCardExternalUrl(link.fileUrl)
    ? link.fileUrl
    : isSafeCircleCardExternalUrl(link.url)
      ? link.url
      : null;

  if (destination && isSafeCircleCardExternalUrl(destination)) {
    return NextResponse.redirect(destination);
  }

  return NextResponse.json({ error: "Private link destination is not available." }, { status: 404 });
}
