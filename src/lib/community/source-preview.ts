export type CommunitySourcePreviewKind = "og-image" | "feed-image" | "placeholder";

type CommunitySourceAttribution = {
  sourceName: string | null;
  sourceUrl: string | null;
  sourceDomain: string | null;
};

type CommunitySourcePreviewInput = {
  title: string;
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceDomain?: string | null;
  previewImageUrl?: string | null;
};

function normalizeWhitespace(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function sanitizeImageUrl(value: string | null | undefined) {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

function extractDomain(value: string | null | undefined) {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSvgDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function parseCommunitySourceAttribution(source: string | null | undefined): CommunitySourceAttribution {
  const sourceLine = normalizeWhitespace(source);
  if (!sourceLine) {
    return {
      sourceName: null,
      sourceUrl: null,
      sourceDomain: null
    };
  }

  const urlMatch = sourceLine.match(/https?:\/\/\S+/i);
  const sourceUrl = urlMatch?.[0]?.replace(/[),.;]+$/, "") ?? null;
  const sourceDomain = extractDomain(sourceUrl);
  const sourceName = normalizeWhitespace(
    sourceUrl ? sourceLine.replace(urlMatch?.[0] ?? "", "").replace(/[-|]\s*$/, "") : sourceLine
  );

  return {
    sourceName: sourceName || null,
    sourceUrl,
    sourceDomain
  };
}

export function buildCommunitySourcePreviewPlaceholder(input: {
  title: string;
  sourceName?: string | null;
  sourceDomain?: string | null;
}) {
  const title = escapeXml(input.title);
  const sourceName = escapeXml(normalizeWhitespace(input.sourceName) || "BCN Intelligence");
  const sourceDomain = escapeXml(normalizeWhitespace(input.sourceDomain) || "source reporting");

  return buildSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#07111f"/>
          <stop offset="55%" stop-color="#0b1730"/>
          <stop offset="100%" stop-color="#060d18"/>
        </linearGradient>
        <radialGradient id="glow" cx="0" cy="0" r="1" gradientTransform="translate(1320 120) rotate(129.587) scale(560 360)">
          <stop stop-color="#7aa6d9" stop-opacity="0.24"/>
          <stop offset="1" stop-color="#7aa6d9" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1600" height="900" rx="44" fill="url(#bg)"/>
      <rect width="1600" height="900" rx="44" fill="url(#glow)"/>
      <rect x="64" y="64" width="1472" height="772" rx="34" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.08)"/>
      <rect x="124" y="124" width="260" height="40" rx="20" fill="rgba(122,166,217,0.14)" stroke="rgba(122,166,217,0.24)"/>
      <text x="156" y="151" fill="#d7e9ff" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="600" letter-spacing="1.5">BCN INTELLIGENCE</text>
      <text x="124" y="268" fill="#f8fafc" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-weight="700">${title}</text>
      <rect x="124" y="640" width="512" height="118" rx="26" fill="rgba(6,13,24,0.72)" stroke="rgba(255,255,255,0.08)"/>
      <text x="164" y="694" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600">${sourceName}</text>
      <text x="164" y="734" fill="rgba(191,219,254,0.88)" font-family="Inter, Arial, sans-serif" font-size="22">${sourceDomain}</text>
    </svg>
  `);
}

export function resolveCommunitySourcePreview(input: CommunitySourcePreviewInput) {
  const previewImageUrl = sanitizeImageUrl(input.previewImageUrl);
  const sourceDomain = normalizeWhitespace(input.sourceDomain) || extractDomain(input.sourceUrl);
  const sourceName = normalizeWhitespace(input.sourceName) || sourceDomain || "BCN Intelligence";

  if (previewImageUrl) {
    return {
      url: previewImageUrl,
      sourceUrl: input.sourceUrl ?? null,
      sourceDomain: sourceDomain || null,
      sourceName,
      kind: "og-image" as CommunitySourcePreviewKind,
      alt: `${input.title} source preview`
    };
  }

  return {
    url: buildCommunitySourcePreviewPlaceholder({
      title: input.title,
      sourceName,
      sourceDomain
    }),
    sourceUrl: input.sourceUrl ?? null,
    sourceDomain: sourceDomain || null,
    sourceName,
    kind: "placeholder" as CommunitySourcePreviewKind,
    alt: `${input.title} source preview placeholder`
  };
}
