import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiUserMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/api", () => ({
  requireApiUser: requireApiUserMock
}));

vi.mock("@/server/community", () => ({
  publishBcnCuratedPosts: publishMock
}));

import { POST } from "@/app/api/admin/intelligence/refresh/route";

describe("admin intelligence refresh route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("protects manual refresh from normal members", async () => {
    requireApiUserMock.mockResolvedValue({
      response: Response.json({ error: "Forbidden" }, { status: 403 })
    });

    const response = await POST();

    expect(response.status).toBe(403);
    expect(publishMock).not.toHaveBeenCalled();
    expect(requireApiUserMock).toHaveBeenCalledWith({
      adminOnly: true,
      allowUnentitled: true
    });
  });

  it("runs the refresh for admins", async () => {
    requireApiUserMock.mockResolvedValue({
      user: {
        id: "admin_user"
      }
    });
    publishMock.mockResolvedValue({
      status: "completed",
      publishedCount: 1,
      message: "Published 1 BCN update."
    });

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      status: "completed",
      publishedCount: 1
    });
  });
});

