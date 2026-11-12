import type { Prisma } from "@prisma/client";

/**
 * My Tools is a saved workspace shelf. Pinning a tool does NOT publish content
 * or bypass existing plan / card-type checks in the underlying editor.
 * Creator and Business are catalogue filters, never membership restrictions.
 */
export type MyToolsFamily = "CREATOR" | "BUSINESS";
export type MyToolsStage = "editor" | "recovery" | "future";
export type MyTool = {
  id: string;
  title: string;
  description: string;
  family: MyToolsFamily;
  stage: MyToolsStage;
  editorCardType?: "CREATOR" | "BUSINESS";
  proOnly?: boolean;
  section?: "my-card" | "business" | "network";
  hash?: string;
};

export const CIRCLE_CARD_MY_TOOLS = [
  { id: "featured-content", title: "Featured Content", family: "CREATOR", stage: "editor", editorCardType: "CREATOR", section: "my-card", hash: "creator-featured-content", description: "Show your best posts and videos." },
  { id: "media-kit", title: "Live Media Kit", family: "CREATOR", stage: "editor", editorCardType: "CREATOR", proOnly: true, section: "my-card", hash: "creator-media-kit", description: "Introduce yourself to brands." },
  { id: "audience", title: "Audience Snapshot", family: "CREATOR", stage: "editor", editorCardType: "CREATOR", proOnly: true, section: "my-card", hash: "creator-audience", description: "Present useful audience information." },
  { id: "brand-partnerships", title: "Brand Partnerships", family: "CREATOR", stage: "editor", editorCardType: "CREATOR", section: "my-card", hash: "creator-brand-partnerships", description: "Highlight sponsorships and collaborations." },
  { id: "creator-offers", title: "Creator Offers", family: "CREATOR", stage: "editor", editorCardType: "CREATOR", section: "my-card", hash: "creator-offers", description: "Feature merch, courses and affiliates." },
  { id: "press-proof", title: "Press & Proof", family: "CREATOR", stage: "editor", editorCardType: "CREATOR", section: "my-card", hash: "creator-press-proof", description: "Show awards, press and milestones." },
  { id: "creator-trust", title: "Circle Trust", family: "CREATOR", stage: "editor", section: "my-card", hash: "circle-trust", description: "Earn trust through real connections." },
  { id: "intro-video", title: "Intro Video", family: "CREATOR", stage: "recovery", description: "A dedicated video introduction." },
  { id: "current-project", title: "Projects & Launches", family: "CREATOR", stage: "recovery", description: "Show what you are working on." },
  { id: "wish-lists", title: "Wish Lists", family: "CREATOR", stage: "future", description: "Organise gift and support wishes." },
  { id: "tips-donations", title: "Tips & Donations", family: "CREATOR", stage: "future", description: "Link to approved payment destinations." },
  { id: "live-streaming", title: "Live & Streams", family: "CREATOR", stage: "future", description: "Show live streams and upcoming sessions." },
  { id: "services", title: "Services", family: "BUSINESS", stage: "editor", editorCardType: "BUSINESS", proOnly: true, section: "business", hash: "business-card-services", description: "Present what you do." },
  { id: "products", title: "Products", family: "BUSINESS", stage: "editor", editorCardType: "BUSINESS", proOnly: true, section: "business", hash: "business-card-products", description: "Show products with photos and links." },
  { id: "price-list", title: "Price Lists", family: "BUSINESS", stage: "editor", editorCardType: "BUSINESS", proOnly: true, section: "business", hash: "business-card-price-list", description: "Share your pricing." },
  { id: "opening-hours", title: "Opening Hours", family: "BUSINESS", stage: "editor", editorCardType: "BUSINESS", proOnly: true, section: "business", hash: "business-card-opening-hours", description: "Show when you are available." },
  { id: "gallery", title: "Gallery & Portfolio", family: "BUSINESS", stage: "editor", editorCardType: "BUSINESS", proOnly: true, section: "business", hash: "business-card-gallery", description: "Show your work." },
  { id: "reviews", title: "Reviews & Testimonials", family: "BUSINESS", stage: "editor", editorCardType: "BUSINESS", proOnly: true, section: "business", hash: "business-card-reviews", description: "Show genuine feedback." },
  { id: "booking", title: "Booking & Enquiries", family: "BUSINESS", stage: "editor", editorCardType: "BUSINESS", proOnly: true, section: "business", hash: "business-card-booking", description: "Give visitors a booking route." },
  { id: "menu-offers", title: "Menu & Offers", family: "BUSINESS", stage: "editor", editorCardType: "BUSINESS", proOnly: true, section: "business", hash: "business-card-menu-offers", description: "Promote menus and offers." },
  { id: "scan-card", title: "Business Card Scanner", family: "BUSINESS", stage: "editor", section: "network", hash: "connect-hub", description: "Scan a physical business card into Circle Wallet." },
  { id: "files", title: "Secure File Sharing", family: "BUSINESS", stage: "recovery", description: "Upload access disabled until all safety gates pass." },
  { id: "claim-invitations", title: "Verified Claim Invitations", family: "BUSINESS", stage: "recovery", description: "Claim emails and ownership verification under development." },
  { id: "lead-capture", title: "Lead Capture & Events", family: "BUSINESS", stage: "future", description: "More advanced enquiry and event tools." }
] as const satisfies readonly MyTool[];

export type MyToolId = (typeof CIRCLE_CARD_MY_TOOLS)[number]["id"];
const TOOL_IDS = new Set<string>(CIRCLE_CARD_MY_TOOLS.map((tool) => tool.id));

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

export function isMyToolId(value: unknown): value is MyToolId {
  return typeof value === "string" && TOOL_IDS.has(value);
}

export function readMyToolsShelf(contentBlocks: unknown): MyToolId[] {
  const raw = record(record(contentBlocks).myTools).pinned;
  if (!Array.isArray(raw)) return [];
  const found = new Set<string>();
  const result: MyToolId[] = [];
  for (const id of raw) {
    if (!isMyToolId(id) || found.has(id)) continue;
    found.add(id);
    result.push(id);
    if (result.length >= TOOL_IDS.size) break;
  }
  return result;
}

export function updateMyToolsShelf(
  contentBlocks: unknown,
  toolId: MyToolId,
  operation: "pin" | "unpin"
): Prisma.InputJsonObject {
  const root = record(contentBlocks);
  const shelf = record(root.myTools);
  const previous = readMyToolsShelf(contentBlocks);
  const pinned = operation === "pin"
    ? previous.includes(toolId) ? previous : [...previous, toolId]
    : previous.filter((id) => id !== toolId);
  return {
    ...root,
    myTools: { ...shelf, version: 1, pinned: pinned.slice(0, TOOL_IDS.size) }
  } as Prisma.InputJsonObject;
}

export function myToolEditorHref(
  tool: MyTool, cardId: string, cardType: string, hasProAccess: boolean
): string | null {
  if (tool.stage !== "editor" || !tool.section || !tool.hash) return null;
  if (tool.editorCardType && tool.editorCardType !== cardType) return null;
  if (tool.proOnly && !hasProAccess) return null;
  const params = new URLSearchParams({ section: tool.section, cardId });
  return "/dashboard/circle-card?" + params.toString() + "#" + tool.hash;
}
