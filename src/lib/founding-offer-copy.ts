import type { FoundingOfferTierSnapshot } from "@/types";

type FoundingOfferMessagingInput = Pick<
  FoundingOfferTierSnapshot,
  "available" | "launchClosedLabel"
>;

export function getFounderRoomAvailabilitySummary(input: {
  offer: FoundingOfferTierSnapshot;
  tierName: string;
  hasFounderRateElsewhere?: boolean;
}) {
  if (input.offer.available) {
    return {
      title: `Founder rate currently available for ${input.tierName}.`,
      description:
        "A founder allocation is currently open in this room. Pricing returns to the standard rate when that allocation is filled."
    };
  }

  if (input.hasFounderRateElsewhere) {
    return {
      title: `${input.tierName} is currently on standard pricing.`,
      description:
        "Founder pricing is still active in selected rooms and closes room by room as each founder allocation is filled."
    };
  }

  return {
    title: "Founder allocation has been filled.",
    description: "Standard pricing is now active across the membership."
  };
}

export function getFounderRoomPricingNote(offer: FoundingOfferMessagingInput) {
  if (offer.available) {
    return "Founder pricing is currently active in this room while founder allocation remains open.";
  }

  return `${offer.launchClosedLabel}. Standard pricing is currently active for this room.`;
}
