export type TrafficSource =
  | "Direct"
  | "LinkedIn"
  | "Facebook"
  | "Google"
  | "TikTok"
  | "Reddit"
  | "Other";

export function parseTrafficSource(referrer?: string | null, path?: string | null): TrafficSource {
  const campaignSource = readCampaignSource(path);
  if (campaignSource) {
    return campaignSource;
  }

  if (!referrer) {
    return "Direct";
  }

  let host = referrer.toLowerCase();
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    // Keep the lower-cased raw referrer for simple substring checks.
  }

  if (host.includes("linkedin.")) {
    return "LinkedIn";
  }
  if (host.includes("facebook.") || host.includes("fb.")) {
    return "Facebook";
  }
  if (host.includes("google.")) {
    return "Google";
  }
  if (host.includes("tiktok.")) {
    return "TikTok";
  }
  if (host.includes("reddit.")) {
    return "Reddit";
  }

  return "Other";
}

function readCampaignSource(path?: string | null): TrafficSource | null {
  if (!path?.includes("?")) {
    return null;
  }

  try {
    const search = new URL(path, "https://thebusinesscircle.net").searchParams;
    const source = search.get("utm_source")?.toLowerCase();
    if (!source) {
      return null;
    }

    if (source.includes("linkedin")) {
      return "LinkedIn";
    }
    if (source.includes("facebook") || source === "fb") {
      return "Facebook";
    }
    if (source.includes("google")) {
      return "Google";
    }
    if (source.includes("tiktok")) {
      return "TikTok";
    }
    if (source.includes("reddit")) {
      return "Reddit";
    }
  } catch {
    return null;
  }

  return "Other";
}

export function parseUtmValue(path: string | null | undefined, key: "utm_medium" | "utm_campaign") {
  if (!path?.includes("?")) {
    return null;
  }

  try {
    return new URL(path, "https://thebusinesscircle.net").searchParams.get(key);
  } catch {
    return null;
  }
}
