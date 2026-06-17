export const CIRCLE_CARD_SHARE_SOURCES = ["direct", "qr", "nfc", "event", "sales26"] as const;

export type CircleCardShareSource = (typeof CIRCLE_CARD_SHARE_SOURCES)[number];

export function resolveCircleCardShareSource(value: string | null | undefined): CircleCardShareSource {
  return CIRCLE_CARD_SHARE_SOURCES.includes(value as CircleCardShareSource)
    ? (value as CircleCardShareSource)
    : "direct";
}

export function buildCircleCardShareSourceUrl(publicUrl: string, source: CircleCardShareSource) {
  if (source === "direct") {
    return publicUrl;
  }

  try {
    const url = new URL(publicUrl);
    url.searchParams.set("source", source);
    return url.toString();
  } catch {
    const separator = publicUrl.includes("?") ? "&" : "?";
    return `${publicUrl}${separator}source=${source}`;
  }
}
