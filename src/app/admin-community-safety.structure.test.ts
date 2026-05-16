import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("admin community safety structure", () => {
  it("adds the admin-only Community Safety route with the required sections", () => {
    const page = readSource("src/app/(admin)/admin/community/page.tsx");

    expect(page).toContain("Community Safety");
    expect(page).toContain("await requireAdmin()");
    expect(page).toContain("Community Refresh");
    expect(page).toContain("All Posts");
    expect(page).toContain("All Comments");
    expect(page).toContain("listCommunityPostsForAdmin");
    expect(page).toContain("listCommunityCommentsForAdmin");
  });

  it("keeps destructive actions admin guarded and confirmation based", () => {
    const actions = readSource("src/actions/admin/community-safety.actions.ts");
    const shared = readSource("src/actions/admin/community-safety.shared.ts");

    expect(actions).toContain("await requireAdmin()");
    expect(actions).toContain("deleteAllCommunityComments");
    expect(actions).toContain("deleteAllCommunityPostsAndComments");
    expect(actions).toContain("deleteCommunityPost");
    expect(actions).toContain("deleteCommunityComment");
    expect(shared).toContain("DELETE COMMENTS");
    expect(shared).toContain("DELETE COMMUNITY");
    expect(shared).toContain("DELETE POST");
    expect(shared).toContain("DELETE COMMENT");
  });

  it("uses soft-delete support and leaves member community reads filtering removed content", () => {
    const service = readSource("src/server/community/community-safety-admin.service.ts");
    const memberCommunityService = readSource("src/server/community/community.service.ts");

    expect(service).toContain("deletedAt: completedAt");
    expect(service).toContain("COMMUNITY_DELETE_ALL_COMMENTS");
    expect(service).toContain("COMMUNITY_DELETE_ALL_POSTS_AND_COMMENTS");
    expect(memberCommunityService).toContain("deletedAt: null");
    expect(memberCommunityService).toContain("post.deletedAt");
    expect(memberCommunityService).toContain("parentComment.deletedAt");
  });

  it("keeps admin list functions behind the admin guard", () => {
    const service = readSource("src/server/community/community-safety-admin.service.ts");

    expect(service).toContain("import { requireAdmin }");
    expect(service).toContain("export async function listCommunityPostsForAdmin");
    expect(service).toContain("export async function listCommunityCommentsForAdmin");
    expect(service.match(/await requireAdmin\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("adds Community Safety to admin navigation", () => {
    const siteConfig = readSource("src/config/site.ts");

    expect(siteConfig).toContain("Community Safety");
    expect(siteConfig).toContain("/admin/community");
  });
});
