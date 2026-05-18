import type { FoundingOfferTierSnapshot } from "@/types";

type FoundingOfferMessagingInput = Pick<
  FoundingOfferTierSnapshot,
  "available" | "launchClosedLabel"
>;

export function getFounderAllocationLine(offer: FoundingOfferTierSnapshot) {
  if (offer.available) {
    if (offer.remaining === offer.limit) {
      return `${offer.limit} founder place${offer.limit === 1 ? "" : "s"} currently available.`;
    }

    return `${offer.remaining} founder place${offer.remaining === 1 ? "" : "s"} remaining of ${offer.limit}.`;
  }

  return `${offer.claimed} of ${offer.limit} founder places already taken.`;
}

export function getFounderAllocationAggregateLine(
  offers: readonly FoundingOfferTierSnapshot[]
) {
  const openOffers = offers.filter((offer) => offer.available);

  if (!openOffers.length) {
    return "Founding member access closes room by room as allocations are filled.";
  }

  const founderPlacesRemaining = openOffers.reduce(
    (total, offer) => total + offer.remaining,
    0
  );

  return `Founding member access is open with ${founderPlacesRemaining} place${
    founderPlacesRemaining === 1 ? "" : "s"
  } currently available across ${openOffers.length} room${
    openOffers.length === 1 ? "" : "s"
  }.`;
}

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
