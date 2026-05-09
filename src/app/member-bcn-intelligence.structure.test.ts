import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("BCN Intelligence member structure", () => {
  it("does not expose admin refresh controls to normal members", () => {
    const page = readFileSync(
      join(root, "src/app/(member)/member/bcn-updates/page.tsx"),
      "utf8"
    );

    expect(page).toContain('session.user.role === "ADMIN"');
    expect(page).toContain("/admin/intelligence");
  });

  it("keeps comments attached to intelligence items through the existing discussion stack", () => {
    const discussion = readFileSync(
      join(root, "src/components/community/community-post-discussion.tsx"),
      "utf8"
    );
    const feed = readFileSync(
      join(root, "src/components/community/community-post-feed-list.tsx"),
      "utf8"
    );

    expect(discussion).toContain("CommunityPostCommentsSection");
    expect(discussion).toContain("createCommunityCommentAction");
    expect(feed).toContain("CommunityPostCommentsSection");
  });
});

