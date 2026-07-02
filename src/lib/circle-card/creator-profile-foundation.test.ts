import { describe, expect, it } from "vitest";
import {
  calculateCreatorProfileCompletion,
  resolveCreatorStudioMode
} from "@/lib/circle-card/creator-profile-foundation";
import { resolveCircleCardEntitlement } from "@/lib/circle-card/permissions";

describe("Creator Pro foundation", () => {
  it("shows the studio only for Creator cards and safe owner previews", () => {
    expect(resolveCreatorStudioMode({ cardType: "CREATOR", hasProAccess: true })).toBe("enabled");
    expect(resolveCreatorStudioMode({ cardType: "CREATOR", hasProAccess: false })).toBe("locked");
    expect(resolveCreatorStudioMode({ cardType: "BUSINESS", hasProAccess: true })).toBe("hidden");
    expect(resolveCreatorStudioMode({ cardType: "PERSONAL", hasProAccess: true })).toBe("hidden");
    expect(resolveCreatorStudioMode({
      cardType: "PERSONAL",
      hasProAccess: true,
      isPlatformOwner: true,
      platformPreviewCardType: "creator"
    })).toBe("preview");
  });

  it("keeps BCN Included Pro entitlement unlocked", () => {
    const entitlement = resolveCircleCardEntitlement({
      role: "MEMBER",
      membershipTier: "FOUNDATION",
      hasActiveSubscription: true
    });

    expect(entitlement.source).toBe("BCN_INCLUDED_PRO");
    expect(resolveCreatorStudioMode({
      cardType: "CREATOR",
      hasProAccess: entitlement.source !== "FREE"
    })).toBe("enabled");
  });

  it("calculates completion from existing creator profile signals", () => {
    const result = calculateCreatorProfileCompletion({
      creatorCardSelected: true,
      hasProfileImage: true,
      hasBio: true,
      activeSocialProfileCount: 2,
      activeFeaturedLinkCount: 1,
      hasFeaturedContent: true,
      hasMediaKit: true,
      hasWhatICreate: true,
      hasAudienceSnapshot: true,
      hasBrandPartnershipOrOpenToData: true,
      hasCreatorOffer: true,
      hasPressProof: true,
      hasWebsiteOrCommunityLink: true,
      creatorTrustSignalCount: 0
    });

    expect(result.score).toBe(93);
    expect(result.nextIncompleteId).toBe("creator-trust");
  });

  it("prioritises the first missing actionable signal", () => {
    const result = calculateCreatorProfileCompletion({
      creatorCardSelected: true,
      hasProfileImage: false,
      hasBio: false,
      activeSocialProfileCount: 0,
      activeFeaturedLinkCount: 0,
      hasFeaturedContent: false,
      hasMediaKit: false,
      hasWhatICreate: false,
      hasAudienceSnapshot: false,
      hasBrandPartnershipOrOpenToData: false,
      hasCreatorOffer: false,
      hasPressProof: false,
      hasWebsiteOrCommunityLink: false,
      creatorTrustSignalCount: 0
    });

    expect(result.nextIncompleteId).toBe("profile-image");
    expect(result.score).toBe(7);
  });

  it("includes every existing Creator Pro module in profile strength", () => {
    const result = calculateCreatorProfileCompletion({
      creatorCardSelected: true,
      hasProfileImage: true,
      hasBio: true,
      activeSocialProfileCount: 1,
      activeFeaturedLinkCount: 1,
      hasFeaturedContent: true,
      hasMediaKit: true,
      hasWhatICreate: true,
      hasAudienceSnapshot: true,
      hasBrandPartnershipOrOpenToData: true,
      hasCreatorOffer: false,
      hasPressProof: false,
      hasWebsiteOrCommunityLink: true,
      creatorTrustSignalCount: 1
    });

    expect(result.totalCount).toBe(14);
    expect(result.score).toBe(86);
    expect(result.nextIncompleteId).toBe("creator-offer");
  });
});
