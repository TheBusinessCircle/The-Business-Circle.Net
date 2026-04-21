import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { BusinessStage, BusinessStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validators";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/security/logging";
import { isTrustedOrigin } from "@/lib/security/origin";
import { isCloudinaryConfigured, uploadImageToCloudinary } from "@/lib/media/cloudinary";

const PROFILE_UPLOAD_DIR = join(process.cwd(), "public", "uploads", "profiles");
const MAX_PROFILE_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const CLOUDINARY_PROFILE_FOLDER =
  process.env.CLOUDINARY_PROFILE_FOLDER?.trim() || "business-circle/profiles";

const PROFILE_FORM_FIELDS = [
  "name",
  "profileImage",
  "memberRoleTag",
  "headline",
  "bio",
  "location",
  "experience",
  "website",
  "instagram",
  "linkedin",
  "tiktok",
  "facebook",
  "youtube",
  "customLinks",
  "collaborationNeeds",
  "collaborationOffers",
  "partnershipInterests",
  "collaborationTags",
  "companyName",
  "businessStatus",
  "companyNumber",
  "businessDescription",
  "industry",
  "services",
  "businessStage"
] as const;

function toNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseTagList(value?: string) {
  if (!value) {
    return [];
  }

  return Array.from(new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)));
}

function parseCustomLinks(value?: string) {
  if (!value?.trim()) {
    return [];
  }

  const parsed = JSON.parse(value) as unknown;
  const validated = z.array(z.string().trim().url().max(2048)).max(20).safeParse(parsed);

  if (!validated.success) {
    throw new Error("invalid-custom-links");
  }

  return Array.from(new Set(validated.data.map((item) => item.trim())));
}

function isFileValue(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function isImageFile(file: File) {
  if (file.type) {
    return file.type.startsWith("image/");
  }

  const extension = extname(file.name).toLowerCase();
  return [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
    ".bmp",
    ".avif"
  ].includes(extension);
}

function imageExtension(file: File) {
  const byName = extname(file.name).toLowerCase();
  if (/^\.[a-z0-9]{2,5}$/.test(byName)) {
    return byName;
  }

  const typeMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
    "image/avif": ".avif"
  };

  return typeMap[file.type] ?? ".jpg";
}

async function persistUploadedImageLocally(file: File, userId: string) {
  if (file.size > MAX_PROFILE_IMAGE_UPLOAD_BYTES) {
    throw new Error("profile-image-too-large");
  }

  if (!isImageFile(file)) {
    throw new Error("invalid-profile-image");
  }

  await mkdir(PROFILE_UPLOAD_DIR, { recursive: true });
  const extension = imageExtension(file);
  const filename = `${userId}-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
  const absolutePath = join(PROFILE_UPLOAD_DIR, filename);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, bytes);
  return `/uploads/profiles/${filename}`;
}

async function persistProfileImageUpload(file: File, userId: string) {
  if (file.size > MAX_PROFILE_IMAGE_UPLOAD_BYTES) {
    throw new Error("profile-image-too-large");
  }

  if (!isImageFile(file)) {
    throw new Error("invalid-profile-image");
  }

  if (isCloudinaryConfigured()) {
    return uploadImageToCloudinary({
      file,
      folder: CLOUDINARY_PROFILE_FOLDER,
      publicIdPrefix: userId
    });
  }

  return persistUploadedImageLocally(file, userId);
}

async function parseProfileRequestPayload(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const payload = Object.fromEntries(
      PROFILE_FORM_FIELDS.map((field) => [field, String(formData.get(field) || "")])
    );
    const uploadCandidate = formData.get("profileImageUpload");
    const profileImageUpload =
      isFileValue(uploadCandidate) && uploadCandidate.size > 0 ? uploadCandidate : null;

    return { payload, profileImageUpload };
  }

  const payload = (await request.json().catch(() => ({}))) as unknown;
  return { payload, profileImageUpload: null };
}

export async function PATCH(request: Request) {
  let headers: HeadersInit | undefined;

  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json(
        { error: "Untrusted request origin." },
        { status: 403 }
      );
    }

    const authResult = await requireApiUser({ requiredTier: "FOUNDATION" });
    if ("response" in authResult) {
      return authResult.response;
    }

    const profileRate = await consumeRateLimit({
      key: `api:profile:update:${authResult.user.id}`,
      limit: 40,
      windowMs: 10 * 60 * 1000
    });
    headers = rateLimitHeaders(profileRate);

    if (!profileRate.allowed) {
      return NextResponse.json(
        { error: "Too many profile updates. Please wait and try again." },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(profileRate.retryAfterSeconds)
          }
        }
      );
    }

    const { payload, profileImageUpload } = await parseProfileRequestPayload(request);
    const parsed = profileSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid profile payload." },
        { status: 400, headers }
      );
    }

    let uploadedProfileImage: string | null = null;
    if (profileImageUpload) {
      try {
        uploadedProfileImage = await persistProfileImageUpload(profileImageUpload, authResult.user.id);
      } catch (error) {
        if (error instanceof Error && error.message === "profile-image-too-large") {
          return NextResponse.json(
            { error: "Profile image must be 5MB or smaller." },
            { status: 400, headers }
          );
        }

        if (error instanceof Error && error.message === "invalid-profile-image") {
          return NextResponse.json(
            { error: "Profile image must be a valid image file." },
            { status: 400, headers }
          );
        }

        throw error;
      }
    }

    const data = parsed.data;
    const stage = data.businessStage && data.businessStage.length ? (data.businessStage as BusinessStage) : null;
    const businessStatus =
      data.businessStatus && data.businessStatus.length
        ? (data.businessStatus as BusinessStatus)
        : null;
    const website = toNull(data.website);
    const resolvedProfileImage = uploadedProfileImage || toNull(data.profileImage);
    let customLinks: string[];

    try {
      customLinks = parseCustomLinks(data.customLinks);
    } catch (error) {
      if (error instanceof Error && error.message === "invalid-custom-links") {
        return NextResponse.json(
          { error: "Other links must be a valid list of URLs." },
          { status: 400, headers }
        );
      }

      throw error;
    }

    await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        name: data.name.trim(),
        image: resolvedProfileImage,
        memberRoleTag: data.memberRoleTag,
        profile: {
          upsert: {
            create: {
              headline: toNull(data.headline),
              bio: toNull(data.bio),
              location: toNull(data.location),
              experience: toNull(data.experience),
              website,
              instagram: toNull(data.instagram),
              linkedin: toNull(data.linkedin),
              tiktok: toNull(data.tiktok),
              facebook: toNull(data.facebook),
              youtube: toNull(data.youtube),
              customLinks,
              collaborationNeeds: toNull(data.collaborationNeeds),
              collaborationOffers: toNull(data.collaborationOffers),
              partnershipInterests: toNull(data.partnershipInterests),
              collaborationTags: parseTagList(data.collaborationTags),
              business: {
                create: {
                  companyName: toNull(data.companyName),
                  status: businessStatus,
                  companyNumber: toNull(data.companyNumber),
                  description: toNull(data.businessDescription),
                  industry: toNull(data.industry),
                  services: toNull(data.services),
                  website,
                  stage
                }
              }
            },
            update: {
              headline: toNull(data.headline),
              bio: toNull(data.bio),
              location: toNull(data.location),
              experience: toNull(data.experience),
              website,
              instagram: toNull(data.instagram),
              linkedin: toNull(data.linkedin),
              tiktok: toNull(data.tiktok),
              facebook: toNull(data.facebook),
              youtube: toNull(data.youtube),
              customLinks,
              collaborationNeeds: toNull(data.collaborationNeeds),
              collaborationOffers: toNull(data.collaborationOffers),
              partnershipInterests: toNull(data.partnershipInterests),
              collaborationTags: parseTagList(data.collaborationTags),
              business: {
                upsert: {
                  create: {
                    companyName: toNull(data.companyName),
                    status: businessStatus,
                    companyNumber: toNull(data.companyNumber),
                    description: toNull(data.businessDescription),
                    industry: toNull(data.industry),
                    services: toNull(data.services),
                    website,
                    stage
                  },
                  update: {
                    companyName: toNull(data.companyName),
                    status: businessStatus,
                    companyNumber: toNull(data.companyNumber),
                    description: toNull(data.businessDescription),
                    industry: toNull(data.industry),
                    services: toNull(data.services),
                    website,
                    stage
                  }
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    logServerError("profile-update-failed", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500, headers }
    );
  }
}
