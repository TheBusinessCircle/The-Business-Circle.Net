const BOT_USER_AGENT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|linkedinbot|whatsapp|telegrambot|discordbot/i;

export function isLikelyBot(userAgent?: string | null) {
  return Boolean(userAgent && BOT_USER_AGENT_PATTERN.test(userAgent));
}

export function parseDevice(userAgent?: string | null) {
  const value = userAgent ?? "";
  const lower = value.toLowerCase();
  const deviceType = /ipad|tablet/.test(lower)
    ? "Tablet"
    : /mobile|iphone|android/.test(lower)
      ? "Mobile"
      : value
        ? "Desktop"
        : "Unknown";

  const browser = lower.includes("edg/")
    ? "Edge"
    : lower.includes("chrome/")
      ? "Chrome"
      : lower.includes("safari/")
        ? "Safari"
        : lower.includes("firefox/")
          ? "Firefox"
          : "Unknown";

  const os = lower.includes("windows")
    ? "Windows"
    : lower.includes("mac os") || lower.includes("iphone") || lower.includes("ipad")
      ? "Apple"
      : lower.includes("android")
        ? "Android"
        : lower.includes("linux")
          ? "Linux"
          : "Unknown";

  return { deviceType, browser, os };
}
