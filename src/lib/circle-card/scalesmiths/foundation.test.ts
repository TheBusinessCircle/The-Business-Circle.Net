import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eventMayPublishPortfolio, parseScaleSmithsEvent } from "./contract";
import {
  appearsOnPublicCardSelector, canShowScaleSmithsPortfolioItem,
  effectiveProAccess, hasActiveScaleSmithsSponsorship, canPartnerEditField,
  mayReadPartnerRecord
} from "./policy";
import { scaleSmithsWebhookSignature, verifyScaleSmithsWebhookSignature } from "./signatures";

const today = "2026-11-21T09:00:00.000Z";
const id = () => randomUUID();

describe("ScaleSmiths → Circle Card contract", () => {
  it("never treats a new client acquisition as public display approval", () => {
    const event = parseScaleSmithsEvent({
      event_id: id(), event_type: "client.acquired", version: 1,
      occurred_at: today, partner_id: "partner-101",
      data: { client_id: "client-202", business_name: "Example Ltd", acquired_at: today }
    });
    expect(eventMayPublishPortfolio(event)).toBe(false);
  });

  it("accepts an explicitly approved, delivered, consented public project", () => {
    const event = parseScaleSmithsEvent({
      event_id: id(), event_type: "portfolio.approved", version: 1,
      occurred_at: today, partner_id: "partner-101",
      data: { client_id: "client-202", business_name: "Example Ltd",
        website_url: "https://example.com", client_consent_at: today,
        founder_approved_at: today, project_delivered_at: today }
    });
    expect(eventMayPublishPortfolio(event)).toBe(true);
  });

  it("rejects unsafe public URLs and unknown event versions", () => {
    const base = { event_id: id(), event_type: "portfolio.approved", version: 1,
      occurred_at: today, partner_id: "partner-101",
      data: { client_id: "client-202", business_name: "Example Ltd",
        website_url: "http://example.com", client_consent_at: today,
        founder_approved_at: today, project_delivered_at: today } };
    expect(() => parseScaleSmithsEvent(base)).toThrow();
    expect(() => parseScaleSmithsEvent({ ...base, version: 2 })).toThrow();
  });
});

describe("publication, ownership and entitlements", () => {
  const eligible = { partnerStatus: "ACTIVE" as const,
    publicationStatus: "PUBLISHED" as const,
    clientConsentAt: new Date(today), founderApprovedAt: new Date(today),
    projectDeliveredAt: new Date(today), consentWithdrawnAt: null,
    partnerCardPublished: true };

  it("fails closed for unapproved, withdrawn or suspended portfolios", () => {
    expect(canShowScaleSmithsPortfolioItem(eligible)).toBe(true);
    expect(canShowScaleSmithsPortfolioItem({ ...eligible, clientConsentAt: null })).toBe(false);
    expect(canShowScaleSmithsPortfolioItem({ ...eligible, consentWithdrawnAt: new Date(today) })).toBe(false);
    expect(canShowScaleSmithsPortfolioItem({ ...eligible, partnerStatus: "ENDED" })).toBe(false);
    expect(canShowScaleSmithsPortfolioItem({ ...eligible, publicationStatus: "INTERNAL" })).toBe(false);
  });

  it("hides personal cards in the chooser without deleting or unpublishing them", () => {
    expect(appearsOnPublicCardSelector({
      cardIsPublished: true, cardIsArchived: false, showOnPublicProfile: false
    })).toBe(false);
  });

  it("preserves separate paid access when sponsored access expires", () => {
    expect(hasActiveScaleSmithsSponsorship({
      partnerStatus: "ENDED", sponsorStartedAt: new Date(today),
      sponsorEndedAt: null, now: new Date("2026-11-22T09:00:00.000Z")
    })).toBe(false);
    expect(effectiveProAccess({
      hasPaidProAccess: true, hasOtherProGrant: false, hasScaleSmithsSponsorship: false
    })).toBe(true);
  });

  it("prevents partners changing centrally protected fields", () => {
    expect(canPartnerEditField("profileImageUrl")).toBe(true);
    expect(canPartnerEditField("businessLogoUrl")).toBe(false);
    expect(canPartnerEditField("contentBlocks")).toBe(false);
  });

  it("enforces partner ownership in the server permission layer", () => {
    expect(mayReadPartnerRecord({
      actorUserId: "u-1", partnerUserId: "u-2", actorRole: "PARTNER"
    })).toBe(false);
    expect(mayReadPartnerRecord({
      actorUserId: "u-1", partnerUserId: "u-1", actorRole: "PARTNER"
    })).toBe(true);
    expect(mayReadPartnerRecord({
      actorUserId: "u-2", partnerUserId: "u-1", actorRole: "CLIENT"
    })).toBe(false);
  });
});

describe("signed ScaleSmiths webhooks", () => {
  it("accepts a correct signature and rejects a tampered or stale message", () => {
    const secret = "testing-only-secret";
    const timestamp = "1795251600";
    const rawBody = '{"event_type":"partner.approved"}';
    const signature = "v1=" + scaleSmithsWebhookSignature(secret, timestamp, rawBody);
    expect(verifyScaleSmithsWebhookSignature({
      secret, timestamp, signature, rawBody, nowSeconds: Number(timestamp)
    })).toBe(true);
    expect(verifyScaleSmithsWebhookSignature({
      secret, timestamp, signature, rawBody: rawBody + " ", nowSeconds: Number(timestamp)
    })).toBe(false);
    expect(verifyScaleSmithsWebhookSignature({
      secret, timestamp, signature, rawBody, nowSeconds: Number(timestamp) + 301
    })).toBe(false);
  });
});
