import { MemberRoleTag } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { profileSchema } from "@/lib/validators";

function buildValidProfileInput(overrides: Partial<Record<string, string>> = {}) {
  return {
    name: "Test Member",
    profileImage: "",
    memberRoleTag: MemberRoleTag.FOUNDER,
    headline: "",
    bio: "",
    location: "",
    experience: "",
    website: "",
    instagram: "",
    linkedin: "",
    tiktok: "",
    collaborationNeeds: "",
    collaborationOffers: "",
    partnershipInterests: "",
    collaborationTags: "",
    companyName: "",
    businessStatus: "",
    companyNumber: "",
    businessDescription: "",
    industry: "",
    services: "",
    businessStage: "",
    ...overrides
  };
}

describe("profileSchema", () => {
  it("accepts uploaded local profile image paths", () => {
    const parsed = profileSchema.safeParse(
      buildValidProfileInput({
        profileImage: "/uploads/profiles/member-avatar.png"
      })
    );

    expect(parsed.success).toBe(true);
  });

  it("rejects unrelated relative profile image paths", () => {
    const parsed = profileSchema.safeParse(
      buildValidProfileInput({
        profileImage: "/not-a-valid-profile-image-path.png"
      })
    );

    expect(parsed.success).toBe(false);
  });
});
