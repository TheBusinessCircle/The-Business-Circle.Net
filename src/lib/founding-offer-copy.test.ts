import { describe, expect, it } from "vitest";
import type { FoundingOfferTierSnapshot } from "@/types";
import {
  getFounderRoomAvailabilitySummary,
  getFounderRoomPricingNote
} from "@/lib/founding-offer-copy";

function offer(overrides: Partial<FoundingOfferTierSnapshot> = {}): FoundingOfferTierSnapshot {
  return {
    tier: "FOUNDATION",
    badgeLabel: "Foundation founder",
    offerLabel: "Founder rate",
    foundingPrice: 30,
    foundingAnnualPrice: 288,
    standardPrice: 60,
    standardAnnualPrice: 576,
    limit: 50,
    claimed: 50,
    remaining: 0,
    available: false,
    statusLabel: "Filled",
    launchClosedLabel: "Founder allocation closed",
    ...overrides
  };
}

describe("founding offer public copy", () => {
  it("shows standard pricing copy when a founding allocation is unavailable", () => {
    const closedOffer = offer();

    expect(getFounderRoomPricingNote(closedOffer)).toBe(
      "Founder allocation closed. Standard pricing is currently active for this room."
    );
    expect(
      getFounderRoomAvailabilitySummary({
        offer: closedOffer,
        tierName: "Foundation",
        hasFounderRateElsewhere: true
      })
    ).toEqual({
      title: "Foundation is currently on standard pricing.",
      description:
        "Founder pricing is still active in selected rooms and closes room by room as each founder allocation is filled."
    });
  });

  it("shows founder-rate copy only while the allocation is available", () => {
    const openOffer = offer({
      available: true,
      claimed: 12,
      remaining: 38
    });

    expect(getFounderRoomPricingNote(openOffer)).toBe(
      "Founder pricing is currently active in this room while founder allocation remains open."
    );
  });
});
