export const CIRCLE_CARD_CREATOR_BLOCK_TYPES = [
  "INTRO_VIDEO",
  "FEATURED_CONTENT",
  "CURRENT_PROJECT",
  "CURRENT_OFFER",
  "LATEST_LAUNCH"
] as const;

export const CIRCLE_CARD_BUSINESS_BLOCK_TYPES = [
  "SERVICES",
  "MENUS",
  "PRICE_LISTS",
  "DOWNLOADS"
] as const;

export type CircleCardCreatorBlockType =
  (typeof CIRCLE_CARD_CREATOR_BLOCK_TYPES)[number];

export type CircleCardBusinessBlockType =
  (typeof CIRCLE_CARD_BUSINESS_BLOCK_TYPES)[number];

export type CircleCardContentBlockType =
  | CircleCardCreatorBlockType
  | CircleCardBusinessBlockType;

export type CircleCardContentBlockDefinition = {
  type: CircleCardContentBlockType;
  family: "CREATOR" | "BUSINESS";
  label: string;
  publicEditingEnabled: false;
};

export const CIRCLE_CARD_CONTENT_BLOCK_DEFINITIONS = [
  {
    type: "INTRO_VIDEO",
    family: "CREATOR",
    label: "Intro video",
    publicEditingEnabled: false
  },
  {
    type: "FEATURED_CONTENT",
    family: "CREATOR",
    label: "Featured content",
    publicEditingEnabled: false
  },
  {
    type: "CURRENT_PROJECT",
    family: "CREATOR",
    label: "Current project",
    publicEditingEnabled: false
  },
  {
    type: "CURRENT_OFFER",
    family: "CREATOR",
    label: "Current offer",
    publicEditingEnabled: false
  },
  {
    type: "LATEST_LAUNCH",
    family: "CREATOR",
    label: "Latest launch",
    publicEditingEnabled: false
  },
  {
    type: "SERVICES",
    family: "BUSINESS",
    label: "Services",
    publicEditingEnabled: false
  },
  {
    type: "MENUS",
    family: "BUSINESS",
    label: "Menus",
    publicEditingEnabled: false
  },
  {
    type: "PRICE_LISTS",
    family: "BUSINESS",
    label: "Price lists",
    publicEditingEnabled: false
  },
  {
    type: "DOWNLOADS",
    family: "BUSINESS",
    label: "Downloads",
    publicEditingEnabled: false
  }
] as const satisfies readonly CircleCardContentBlockDefinition[];

export const CIRCLE_CARD_CONTENT_BLOCK_REGISTRY = {
  creator: CIRCLE_CARD_CREATOR_BLOCK_TYPES,
  business: CIRCLE_CARD_BUSINESS_BLOCK_TYPES
} as const;

export type CircleCardContentBlocksState = {
  creator?: Partial<Record<CircleCardCreatorBlockType, Record<string, unknown>>>;
  business?: Partial<Record<CircleCardBusinessBlockType, Record<string, unknown>>>;
};

export function createEmptyCircleCardContentBlocks(): CircleCardContentBlocksState {
  return {
    creator: {},
    business: {}
  };
}
