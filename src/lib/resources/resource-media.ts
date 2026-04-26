import { ResourceMediaType, ResourceTier, ResourceType } from "@prisma/client";

type ResourceImageInput = {
  title: string;
  category: string;
  type: ResourceType;
  tier: ResourceTier;
  coverImage?: string | null;
  generatedImageUrl?: string | null;
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
    geometry: "beam" | "signal" | "map" | "pressure" | "steps";
  }
> = {
  CLARITY: {
    accent: "#c6a86a",
    highlight: "#f3e0a7",
    geometry: "beam"
  },
  STRATEGY: {
    accent: "#7aa6d9",
    highlight: "#d7e9ff",
    geometry: "map"
  },
  OBSERVATION: {
    accent: "#7cc0b5",
    highlight: "#d9fbf6",
    geometry: "signal"
  },
  MINDSET: {
    accent: "#b98bd2",
    highlight: "#f0ddff",
    geometry: "pressure"
  },
  ACTION: {
    accent: "#d18d67",
    highlight: "#ffe0c9",
    geometry: "steps"
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

function buildSvgDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function buildResourcePlaceholderImage(input: Omit<ResourceImageInput, "coverImage" | "mediaType" | "mediaUrl">) {
  const style = RESOURCE_TYPE_STYLES[input.type];
  const seed = Math.abs(
    input.category.split("").reduce((total, character) => total + character.charCodeAt(0), 0)
  );
  const offset = seed % 220;
  const secondaryOffset = (seed * 7) % 180;
  const geometry = {
    beam: `<path d="M250 ${690 - offset / 6} C520 ${520 - offset / 5} 720 ${505 + offset / 7} 1010 ${342 + secondaryOffset / 4}" stroke="${style.highlight}" stroke-opacity="0.52" stroke-width="5" stroke-linecap="round"/><circle cx="1010" cy="${342 + secondaryOffset / 4}" r="18" fill="${style.highlight}" opacity="0.76"/><circle cx="250" cy="${690 - offset / 6}" r="12" fill="${style.accent}" opacity="0.7"/>`,
    signal: `<circle cx="${480 + offset}" cy="420" r="150" stroke="${style.highlight}" stroke-opacity="0.22" stroke-width="2"/><circle cx="${480 + offset}" cy="420" r="82" stroke="${style.accent}" stroke-opacity="0.34" stroke-width="3"/><path d="M680 580 C830 460 930 520 1080 384" stroke="${style.highlight}" stroke-opacity="0.5" stroke-width="4" stroke-linecap="round"/>`,
    map: `<path d="M330 660 L570 470 L815 545 L1125 320" stroke="${style.highlight}" stroke-opacity="0.5" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="300" y="626" width="70" height="70" rx="18" fill="${style.accent}" opacity="0.16"/><rect x="535" y="435" width="70" height="70" rx="18" fill="${style.highlight}" opacity="0.14"/><rect x="1088" y="285" width="76" height="76" rx="20" fill="${style.accent}" opacity="0.18"/>`,
    pressure: `<path d="M400 260 C690 190 1000 250 1165 500 C1000 745 650 786 392 642 C268 506 280 348 400 260Z" fill="${style.accent}" opacity="0.08"/><path d="M515 315 C722 275 915 326 1030 502 C902 650 680 672 508 585 C426 487 432 374 515 315Z" stroke="${style.highlight}" stroke-opacity="0.28" stroke-width="3"/>`,
    steps: `<rect x="335" y="610" width="190" height="48" rx="18" fill="${style.accent}" opacity="0.18"/><rect x="548" y="535" width="230" height="48" rx="18" fill="${style.highlight}" opacity="0.14"/><rect x="802" y="460" width="250" height="48" rx="18" fill="${style.accent}" opacity="0.18"/><path d="M525 634 C620 625 670 572 548 559 M778 559 C882 548 912 494 802 484" stroke="${style.highlight}" stroke-opacity="0.4" stroke-width="3" stroke-linecap="round"/>`
  }[style.geometry];

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
      <circle cx="${1190 + offset / 3}" cy="${230 + secondaryOffset / 5}" r="180" fill="${style.accent}" opacity="0.08"/>
      <circle cx="${980 - secondaryOffset / 4}" cy="${760 - offset / 8}" r="110" fill="${style.highlight}" opacity="0.06"/>
      <path d="M135 790 C430 620 572 740 840 558 C1060 408 1192 418 1450 264" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
      <path d="M170 226 H512" stroke="${style.accent}" stroke-opacity="0.36" stroke-width="5" stroke-linecap="round"/>
      <path d="M170 258 H392" stroke="${style.highlight}" stroke-opacity="0.24" stroke-width="3" stroke-linecap="round"/>
      <g opacity="0.95">${geometry}</g>
      <rect x="1135" y="676" width="265" height="112" rx="30" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.08)"/>
      <circle cx="1196" cy="732" r="18" fill="${style.accent}" opacity="0.3"/>
      <circle cx="1254" cy="732" r="18" fill="${style.highlight}" opacity="0.16"/>
      <circle cx="1312" cy="732" r="18" fill="${style.accent}" opacity="0.18"/>
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

  const generatedImage = sanitizeImageUrl(input.generatedImageUrl);
  if (generatedImage) {
    return {
      url: generatedImage,
      alt: `${input.title} generated editorial image`,
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
