export const CIRCLE_CARD_CREATOR_BLOCK_TYPES = [
  "INTRO_VIDEO",
  "FEATURED_CONTENT",
  "CURRENT_PROJECT",
  "CURRENT_OFFER",
  "LATEST_LAUNCH"
] as const;

export const CIRCLE_CARD_BUSINESS_BLOCK_TYPES = [
  "SERVICES",
  "PRODUCTS",
  "PRICE_LIST",
  "OPENING_HOURS",
  "GALLERY_PORTFOLIO",
  "REVIEWS_TESTIMONIALS",
  "BOOKING_ENQUIRY_LINK",
  "DOWNLOADS_DOCUMENTS",
  "MENU_OFFERS"
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
    type: "PRODUCTS",
    family: "BUSINESS",
    label: "Products",
    publicEditingEnabled: false
  },
  {
    type: "PRICE_LIST",
    family: "BUSINESS",
    label: "Price List",
    publicEditingEnabled: false
  },
  {
    type: "OPENING_HOURS",
    family: "BUSINESS",
    label: "Opening Hours",
    publicEditingEnabled: false
  },
  {
    type: "GALLERY_PORTFOLIO",
    family: "BUSINESS",
    label: "Gallery / Portfolio",
    publicEditingEnabled: false
  },
  {
    type: "REVIEWS_TESTIMONIALS",
    family: "BUSINESS",
    label: "Reviews / Testimonials",
    publicEditingEnabled: false
  },
  {
    type: "BOOKING_ENQUIRY_LINK",
    family: "BUSINESS",
    label: "Booking / Enquiry Link",
    publicEditingEnabled: false
  },
  {
    type: "DOWNLOADS_DOCUMENTS",
    family: "BUSINESS",
    label: "Downloads / Documents",
    publicEditingEnabled: false
  },
  {
    type: "MENU_OFFERS",
    family: "BUSINESS",
    label: "Menu / Offers",
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
