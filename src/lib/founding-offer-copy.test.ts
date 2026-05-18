import { describe, expect, it } from "vitest";
import type { FoundingOfferTierSnapshot } from "@/types";
import {
  getFounderAllocationAggregateLine,
  getFounderAllocationLine,
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

  it("keeps founder allocation count copy in one shared helper", () => {
    expect(
      getFounderAllocationLine(
        offer({
          available: true,
          claimed: 0,
          remaining: 50
        })
      )
    ).toBe("50 founder places currently available.");

    expect(
      getFounderAllocationLine(
        offer({
          available: true,
          claimed: 46,
          remaining: 4
        })
      )
    ).toBe("4 founder places remaining of 50.");

    expect(getFounderAllocationLine(offer())).toBe(
      "50 of 50 founder places already taken."
    );
  });

  it("builds aggregate public founder access copy from tier snapshots", () => {
    expect(
      getFounderAllocationAggregateLine([
        offer({ available: true, claimed: 45, remaining: 5 }),
        offer({ available: true, claimed: 49, remaining: 1 }),
        offer()
      ])
    ).toBe("Founding member access is open with 6 places currently available across 2 rooms.");

    expect(getFounderAllocationAggregateLine([offer(), offer()])).toBe(
      "Founding member access closes room by room as allocations are filled."
    );
  });
});
