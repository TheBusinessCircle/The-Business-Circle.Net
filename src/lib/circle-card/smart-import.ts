import type {
  CircleCardLinkType,
  CircleCardSocialPlatform
} from "@/lib/circle-card/schema";

export const CIRCLE_CARD_SMART_IMPORT_SOCIAL_PLATFORMS = [
  "linkedin",
  "instagram",
  "tiktok",
  "facebook",
  "x",
  "youtube",
  "discord"
] as const satisfies readonly CircleCardSocialPlatform[];

export type CircleCardSmartImportSocialPlatform =
  (typeof CIRCLE_CARD_SMART_IMPORT_SOCIAL_PLATFORMS)[number];

export type CircleCardSmartImportDetectedPlatform =
  | CircleCardSmartImportSocialPlatform
  | "website"
  | "portfolio"
  | "blog";

export type CircleCardSmartImportMetadata = {
  inputUrl: string;
  url: string;
  ok: boolean;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  siteName?: string | null;
  favicon?: string | null;
  canonicalUrl?: string | null;
  detectedPlatform: CircleCardSmartImportDetectedPlatform;
  handleGuess?: string | null;
  error?: string | null;
};

const SOCIAL_PLATFORM_LABELS: Record<CircleCardSmartImportSocialPlatform, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X",
  youtube: "YouTube",
  discord: "Discord"
};

export function getCircleCardSmartImportPlatformLabel(
  platform: CircleCardSmartImportDetectedPlatform
) {
  if (platform === "website") {
    return "Website";
  }

  if (platform === "portfolio") {
    return "Portfolio";
  }

  if (platform === "blog") {
    return "Blog";
  }

  return SOCIAL_PLATFORM_LABELS[platform];
}

export function detectCircleCardSmartImportPlatform(
  value: string
): CircleCardSmartImportDetectedPlatform {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host.includes("linkedin.com")) {
      return "linkedin";
    }

    if (host.includes("instagram.com")) {
      return "instagram";
    }

    if (host.includes("tiktok.com")) {
      return "tiktok";
    }

    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return "youtube";
    }

    if (host === "x.com" || host.endsWith(".x.com") || host.includes("twitter.com")) {
      return "x";
    }

    if (host.includes("facebook.com") || host === "fb.com") {
      return "facebook";
    }

    if (
      host === "discord.gg" ||
      host === "discord.com" ||
      host.endsWith(".discord.com") ||
      host === "discordapp.com" ||
      host.endsWith(".discordapp.com")
    ) {
      return "discord";
    }

    if (host.includes("medium.com") || host.includes("substack.com")) {
      return "blog";
    }

    if (
      host.includes("behance.net") ||
      host.includes("dribbble.com") ||
      host.includes("github.com") ||
      host.includes("portfolio")
    ) {
      return "portfolio";
    }
  } catch {
    return "website";
  }

  return "website";
}

function cleanPathSegment(value: string | undefined) {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value)
      .replace(/^@+/, "")
      .replace(/[-_]+/g, " ")
      .trim();
  } catch {
    return value.replace(/^@+/, "").replace(/[-_]+/g, " ").trim();
  }
}

export function guessCircleCardSmartImportHandle(value: string) {
  try {
    const url = new URL(value);
    const platform = detectCircleCardSmartImportPlatform(url.toString());
    const segments = url.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const first = segments[0]?.toLowerCase();

    if (platform === "linkedin") {
      const handle = first === "in" || first === "company" ? segments[1] : segments[0];
      return cleanPathSegment(handle) || null;
    }

    if (platform === "youtube") {
      if (segments[0]?.startsWith("@")) {
        return `@${cleanPathSegment(segments[0])}`;
      }

      if ((first === "c" || first === "user") && segments[1]) {
        return cleanPathSegment(segments[1]);
      }

      return null;
    }

    if (platform === "facebook") {
      if (first === "profile.php") {
        return null;
      }

      const handle = first === "pages" || first === "groups" ? segments[1] : segments[0];
      return cleanPathSegment(handle) || null;
    }

    if (platform === "discord") {
      if (url.hostname.toLowerCase().replace(/^www\./, "") === "discord.gg") {
        return segments[0] ? `Invite: ${cleanPathSegment(segments[0])}` : null;
      }

      if (first === "invite" && segments[1]) {
        return `Invite: ${cleanPathSegment(segments[1])}`;
      }

      if (first === "users" && segments[1]) {
        return `@${cleanPathSegment(segments[1])}`;
      }

      return null;
    }

    if (CIRCLE_CARD_SMART_IMPORT_SOCIAL_PLATFORMS.includes(platform as CircleCardSmartImportSocialPlatform)) {
      const ignoredSegments = new Set(["i", "intent", "share", "status", "video", "reel", "p"]);
      const handle = segments.find((segment) => !ignoredSegments.has(segment.toLowerCase()));
      const cleaned = cleanPathSegment(handle);

      return cleaned ? `@${cleaned}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function suggestCircleCardSmartImportLinkType(
  item: Pick<CircleCardSmartImportMetadata, "detectedPlatform" | "title" | "url">
): CircleCardLinkType {
  const title = item.title?.toLowerCase() ?? "";
  const url = item.url.toLowerCase();

  if (title.includes("book") || title.includes("calendly") || url.includes("calendly.com")) {
    return "BOOK_CALL";
  }

  if (title.includes("shop") || title.includes("store") || url.includes("shopify")) {
    return "SHOP";
  }

  if (title.includes("download") || title.includes("guide") || title.includes("pdf")) {
    return "DOWNLOAD";
  }

  if (title.includes("offer") || title.includes("course") || title.includes("programme")) {
    return "LATEST_OFFER";
  }

  if (
    item.detectedPlatform === "discord" ||
    title.includes("community") ||
    title.includes("newsletter") ||
    title.includes("discord")
  ) {
    return "COMMUNITY";
  }

  if (item.detectedPlatform === "portfolio") {
    return "PORTFOLIO";
  }

  return "GENERAL";
}

export function buildCircleCardSmartImportLinkLabel(item: CircleCardSmartImportMetadata) {
  const title = item.title?.trim();

  if (title) {
    return title.slice(0, 90);
  }

  const platformLabel = getCircleCardSmartImportPlatformLabel(item.detectedPlatform);

  if (item.handleGuess) {
    return `${platformLabel}: ${item.handleGuess}`.slice(0, 90);
  }

  try {
    return new URL(item.url).hostname.replace(/^www\./, "").slice(0, 90);
  } catch {
    return platformLabel;
  }
}

export function buildCircleCardSmartImportDescription(item: CircleCardSmartImportMetadata) {
  return item.description?.trim().slice(0, 220) ?? "";
}
