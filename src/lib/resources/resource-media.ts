import { ResourceMediaType, ResourceTier, ResourceType } from "@prisma/client";

type ResourceImageInput = {
  title: string;
  category: string;
  type: ResourceType;
  tier: ResourceTier;
  coverImage?: string | null;
  mediaType?: ResourceMediaType | null;
  mediaUrl?: string | null;
};

type ResourceImageResult = {
  url: string;
  alt: string;
  isFallback: boolean;
};

const RESOURCE_TYPE_STYLES: Record<
  ResourceType,
  {
    accent: string;
    highlight: string;
    eyebrow: string;
  }
> = {
  CLARITY: {
    accent: "#c6a86a",
    highlight: "#f3e0a7",
    eyebrow: "Clearer thinking"
  },
  STRATEGY: {
    accent: "#7aa6d9",
    highlight: "#d7e9ff",
    eyebrow: "Strategic direction"
  },
  OBSERVATION: {
    accent: "#7cc0b5",
    highlight: "#d9fbf6",
    eyebrow: "Operator insight"
  },
  MINDSET: {
    accent: "#b98bd2",
    highlight: "#f0ddff",
    eyebrow: "Founder perspective"
  },
  ACTION: {
    accent: "#d18d67",
    highlight: "#ffe0c9",
    eyebrow: "Practical next step"
  }
};

function sanitizeImageUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
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

export function buildResourcePlaceholderImage(input: Omit<ResourceImageInput, "coverImage" | "mediaType" | "mediaUrl">) {
  const style = RESOURCE_TYPE_STYLES[input.type];
  const title = escapeXml(input.title);
  const category = escapeXml(input.category);
  const eyebrow = escapeXml(style.eyebrow);
  const tier = escapeXml(input.tier.replaceAll("_", " "));

  return buildSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#071120"/>
          <stop offset="55%" stop-color="#0b1730"/>
          <stop offset="100%" stop-color="#060d1a"/>
        </linearGradient>
        <radialGradient id="glow" cx="0" cy="0" r="1" gradientTransform="translate(1260 180) rotate(132.156) scale(520 420)">
          <stop stop-color="${style.accent}" stop-opacity="0.42"/>
          <stop offset="1" stop-color="${style.accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1600" height="1000" rx="48" fill="url(#bg)"/>
      <rect width="1600" height="1000" rx="48" fill="url(#glow)"/>
      <rect x="70" y="70" width="1460" height="860" rx="40" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)"/>
      <circle cx="1360" cy="240" r="180" fill="${style.accent}" opacity="0.08"/>
      <circle cx="1240" cy="760" r="110" fill="${style.highlight}" opacity="0.06"/>
      <rect x="130" y="136" width="248" height="42" rx="21" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)"/>
      <text x="160" y="164" fill="${style.highlight}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="600" letter-spacing="1.6">${eyebrow}</text>
      <text x="130" y="286" fill="#f8fafc" font-family="Georgia, 'Times New Roman', serif" font-size="68" font-weight="700">${title}</text>
      <text x="130" y="360" fill="rgba(226,232,240,0.88)" font-family="Inter, Arial, sans-serif" font-size="28">${category}</text>
      <text x="130" y="404" fill="rgba(148,163,184,0.9)" font-family="Inter, Arial, sans-serif" font-size="22">Tier: ${tier}</text>
      <rect x="130" y="710" width="520" height="140" rx="28" fill="rgba(6,13,26,0.62)" stroke="rgba(255,255,255,0.08)"/>
      <text x="172" y="764" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600">Premium BCN Resource</text>
      <text x="172" y="808" fill="rgba(203,213,225,0.86)" font-family="Inter, Arial, sans-serif" font-size="22">Structured guidance, calm presentation, and a premium editorial finish.</text>
    </svg>
  `);
}

export function resolveResourceImage(input: ResourceImageInput): ResourceImageResult {
  const directCoverImage = sanitizeImageUrl(input.coverImage);
  if (directCoverImage) {
    return {
      url: directCoverImage,
      alt: `${input.title} cover image`,
      isFallback: false
    };
  }

  if (input.mediaType === ResourceMediaType.IMAGE) {
    const directMediaImage = sanitizeImageUrl(input.mediaUrl);
    if (directMediaImage) {
      return {
        url: directMediaImage,
        alt: `${input.title} supporting image`,
        isFallback: false
      };
    }
  }

  return {
    url: buildResourcePlaceholderImage(input),
    alt: `${input.title} placeholder image`,
    isFallback: true
  };
}
