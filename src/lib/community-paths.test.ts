import { describe, expect, it } from "vitest";
import { BCN_UPDATES_CHANNEL_SLUG, BCN_UPDATES_MEMBER_ROUTE } from "@/config/community";
import {
  buildCommunityChannelPath,
  buildCommunityFeedPostPath,
  buildCommunityPostPath
} from "@/lib/community-paths";

describe("community path helpers", () => {
  it("routes standard channels through the community area", () => {
    expect(buildCommunityChannelPath("introductions")).toBe("/community?channel=introductions");
    expect(buildCommunityFeedPostPath("introductions", "post_123")).toBe(
      "/community?channel=introductions&post=post_123"
    );
    expect(buildCommunityPostPath("post_123", "introductions")).toBe("/community/post/post_123");
  });

  it("routes BCN Updates through its standalone member destination", () => {
    expect(buildCommunityChannelPath(BCN_UPDATES_CHANNEL_SLUG)).toBe(BCN_UPDATES_MEMBER_ROUTE);
    expect(buildCommunityFeedPostPath(BCN_UPDATES_CHANNEL_SLUG, "post_123")).toBe(
      `${BCN_UPDATES_MEMBER_ROUTE}?post=post_123`
    );
    expect(buildCommunityPostPath("post_123", BCN_UPDATES_CHANNEL_SLUG)).toBe(
      `${BCN_UPDATES_MEMBER_ROUTE}/post/post_123`
    );
  });

  it("keeps the legacy community post route when the channel slug is unknown", () => {
    expect(buildCommunityPostPath("post_123")).toBe("/community/post/post_123");
  });
});
