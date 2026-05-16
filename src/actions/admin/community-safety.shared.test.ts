import { describe, expect, it } from "vitest";
import {
  COMMUNITY_SAFETY_CONFIRMATIONS,
  communityContentIdSchema,
  isValidCommunitySafetyConfirmation
} from "@/actions/admin/community-safety.shared";

describe("community safety action helpers", () => {
  it("requires exact destructive action confirmation phrases", () => {
    expect(
      isValidCommunitySafetyConfirmation(
        "DELETE COMMENTS",
        COMMUNITY_SAFETY_CONFIRMATIONS.deleteComments
      )
    ).toBe(true);
    expect(
      isValidCommunitySafetyConfirmation(
        "DELETE COMMUNITY",
        COMMUNITY_SAFETY_CONFIRMATIONS.deleteCommunity
      )
    ).toBe(true);
    expect(
      isValidCommunitySafetyConfirmation("delete comments", COMMUNITY_SAFETY_CONFIRMATIONS.deleteComments)
    ).toBe(false);
    expect(
      isValidCommunitySafetyConfirmation("DELETE COMMENT", COMMUNITY_SAFETY_CONFIRMATIONS.deletePost)
    ).toBe(false);
  });

  it("accepts stable community ids and rejects unsafe payloads", () => {
    expect(communityContentIdSchema.safeParse("cmabc123communitypost").success).toBe(true);
    expect(communityContentIdSchema.safeParse("post_123").success).toBe(true);
    expect(communityContentIdSchema.safeParse("../profile").success).toBe(false);
    expect(communityContentIdSchema.safeParse("").success).toBe(false);
  });
});
