import { describe, expect, it } from "vitest";
import {
  VISUAL_MEDIA_PLACEMENT_KEYS,
  VISUAL_MEDIA_PLACEMENT_LIST,
  VISUAL_MEDIA_PLACEMENTS,
  isVisualMediaPlacementKey
} from "@/lib/visual-media/constants";

describe("visual media placement registry", () => {
  it("keeps placement keys unique", () => {
    expect(new Set(VISUAL_MEDIA_PLACEMENT_KEYS).size).toBe(VISUAL_MEDIA_PLACEMENT_KEYS.length);
  });

  it("includes the key placements needed for the public site rollout", () => {
    expect(VISUAL_MEDIA_PLACEMENTS.HOME_HERO.key).toBe("home.hero");
    expect(VISUAL_MEDIA_PLACEMENTS.HOME_JOIN.key).toBe("home.section.join");
    expect(VISUAL_MEDIA_PLACEMENTS.HOME_ROOMS_PREVIEW.key).toBe("home.section.roomsPreview");
    expect(VISUAL_MEDIA_PLACEMENTS.HOME_ECOSYSTEM_MAP.key).toBe("home.section.ecosystemMap");
    expect(VISUAL_MEDIA_PLACEMENTS.HOME_PLATFORM.key).toBe("home.section.platform");
    expect(VISUAL_MEDIA_PLACEMENTS.GLOBAL_PUBLIC_TOP.key).toBe("global.public.top");
    expect(VISUAL_MEDIA_PLACEMENTS.FAQ_TRUST.key).toBe("faq.section.trust");
    expect(VISUAL_MEDIA_PLACEMENTS.MEMBERSHIP_FOUNDERS.key).toBe(
      "membership.section.founders"
    );
    expect(VISUAL_MEDIA_PLACEMENTS.MEMBERSHIP_TIER_COMPARISON.key).toBe(
      "membership.section.tierComparison"
    );
    expect(VISUAL_MEDIA_PLACEMENTS.JOIN_AFTER_PAYMENT.key).toBe("join.section.afterPayment");
    expect(VISUAL_MEDIA_PLACEMENTS.INTELLIGENCE_HERO.key).toBe("intelligence.hero");
    expect(VISUAL_MEDIA_PLACEMENTS.SERVICES_APPROACH.key).toBe(
      "services.section.approach"
    );
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_HERO.key).toBe("founder.hero");
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_WORKING.key).toBe("founder.working");
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_JOURNEY.key).toBe("founder.journey");
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_REVIEWING.key).toBe("founder.reviewing");
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_CONVERSATIONS.key).toBe(
      "founder.conversations"
    );
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_BUILDING_BCN.key).toBe(
      "founder.buildingBcn"
    );
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_STORY.key).toBe("founder.story");
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_GROWTH_ARCHITECTURE.key).toBe(
      "founder.growthArchitecture"
    );
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_AUDIT.key).toBe("founder.audit");
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_PROOF.key).toBe("founder.proof");
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_FINAL_CTA.key).toBe("founder.finalCta");
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_HERO_MOBILE.key).toBe("founder.heroMobile");
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_STORY_MOBILE.key).toBe("founder.storyMobile");
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_GROWTH_ARCHITECTURE_MOBILE.key).toBe(
      "founder.growthArchitectureMobile"
    );
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_AUDIT_MOBILE.key).toBe("founder.auditMobile");
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_PROOF_MOBILE.key).toBe("founder.proofMobile");
    expect(VISUAL_MEDIA_PLACEMENTS.FOUNDER_FINAL_CTA_MOBILE.key).toBe(
      "founder.finalCtaMobile"
    );
  });

  it("keeps founder Growth Architect slots grouped in the founder admin page", () => {
    const founderSlots = VISUAL_MEDIA_PLACEMENT_LIST.filter((item) =>
      item.key.startsWith("founder.")
    );

    expect(founderSlots).toHaveLength(17);
    expect(founderSlots.every((item) => item.page === "FOUNDER")).toBe(true);
    expect(founderSlots.every((item) => item.adminHelperText)).toBe(true);
    expect(
      founderSlots
        .filter((item) => item.key.endsWith("Mobile"))
        .every((item) => item.recommendedAspectRatio === "4:5")
    ).toBe(true);
  });

  it("recognizes only approved placement keys", () => {
    expect(isVisualMediaPlacementKey("home.hero")).toBe(true);
    expect(isVisualMediaPlacementKey("membership.section.rooms")).toBe(true);
    expect(isVisualMediaPlacementKey("unknown.hero.primary")).toBe(false);
  });

  it("requires positive, intentional sort ordering", () => {
    expect(VISUAL_MEDIA_PLACEMENT_LIST.every((item) => item.sortOrder > 0)).toBe(true);
  });

  it("keeps brand guidance complete for every approved slot", () => {
    expect(
      VISUAL_MEDIA_PLACEMENT_LIST.every((item) => {
        return Boolean(
          item.adminHelperText &&
            item.imageFamilyTag &&
            item.adminPreviewFamily &&
            item.imagePurpose &&
            item.bestImageType &&
            item.longAdminGuidance &&
            item.promptTemplate.styleSummary &&
            item.promptTemplate.sceneType &&
            item.promptTemplate.subject &&
            item.promptTemplate.environment &&
            item.promptTemplate.lighting &&
            item.promptTemplate.mood &&
            item.promptTemplate.style &&
            item.promptTemplate.cameraComposition &&
            item.promptTemplate.qualityTags &&
            item.promptTemplate.negativePrompt &&
            item.emotionalTone.length &&
            item.recommendedSubjectMatter.length &&
            item.recommendedComposition.length &&
            item.recommendedLightingMood.length &&
            item.avoid.length &&
            item.qualityChecklist.length
        );
      })
    ).toBe(true);
  });
});
