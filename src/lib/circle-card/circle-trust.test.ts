import { describe, expect, it } from "vitest";
import { buildCircleTrustSummary } from "@/lib/circle-card/circle-trust";

const card = {
  fullName: "Alex Morgan",
  businessName: "North Studio",
  role: "Founder",
  tagline: "Clear work for growing teams",
  about: null,
  profileImageUrl: "/alex.jpg",
  businessLogoUrl: null,
  websiteUrl: "https://example.com",
  email: null,
  phone: null,
  location: "London",
  isPublished: true,
  archivedAt: null,
  hasHistoricalActivity: true,
  createdAt: new Date("2025-12-01")
};

describe("Circle Trust V1", () => {
  it("backfills verified relationships and completed historical platform signals", () => {
    const trust = buildCircleTrustSummary({
      card,
      owner: {
        role: "MEMBER",
        emailVerified: new Date("2026-01-01"),
        foundingMember: false,
        hasActiveSubscription: true
      },
      verifiedConnectionCount: 3,
      verifiedConnectionEvents: [
        {
          id: "connection-one",
          connectionName: "Taylor",
          connectionBusinessName: "Clear Works",
          verifiedAt: new Date("2026-01-04")
        }
      ],
      verifiedTestimonials: [
        {
          id: "one",
          reviewerName: "Sam",
          reviewerRoleOrCompany: null,
          testimonialText: "Trusted work.",
          rating: 1,
          relationship: "WORKED_WITH",
          verifiedAt: new Date("2026-01-02")
        },
        {
          id: "two",
          reviewerName: "Jo",
          reviewerRoleOrCompany: null,
          testimonialText: "Trusted again.",
          rating: 5,
          relationship: "COLLABORATED",
          verifiedAt: new Date("2026-01-03")
        }
      ],
      manualTestimonialCount: 4
    });

    expect(trust.score).toBe(11);
    expect(trust.manualTestimonialCount).toBe(4);
    expect(trust.signals.map((signal) => signal.id)).toEqual([
      "verified-connections",
      "verified-testimonials",
      "published-circle-card",
      "active-profile",
      "profile-complete",
      "verified-account-email",
      "website-added",
      "bcn-member"
    ]);
    expect(trust.signals.find((signal) => signal.id === "verified-testimonials")?.scoreContribution).toBe(2);
    expect(trust.timeline[0]?.title).toBe("Taylor joined their trusted Circle");
    expect(trust.timeline.map((event) => event.kind)).toContain("TESTIMONIAL");
  });

  it("shows only signals supported by stored state", () => {
    const trust = buildCircleTrustSummary({
      card: {
        ...card,
        businessName: null,
        role: null,
        profileImageUrl: null,
        websiteUrl: null,
        location: null,
        hasHistoricalActivity: false
      },
      owner: {
        role: "MEMBER",
        emailVerified: null,
        foundingMember: false,
        hasActiveSubscription: false
      },
      verifiedConnectionCount: 0,
      verifiedTestimonials: [],
      manualTestimonialCount: 0
    });

    expect(trust.signals.map((signal) => signal.id)).toEqual([
      "published-circle-card"
    ]);
    expect(trust.score).toBe(1);
    expect(trust.availableSignals.map((signal) => signal.id)).toContain("verified-account-email");
  });
});
