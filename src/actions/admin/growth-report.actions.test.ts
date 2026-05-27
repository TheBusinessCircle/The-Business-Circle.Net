import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.hoisted(() => vi.fn());
const generateGrowthReportNowMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/session", () => ({
  requireAdmin: requireAdminMock
}));

vi.mock("@/server/admin/growth-report.service", () => ({
  generateGrowthReportNow: generateGrowthReportNowMock
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock
}));

import { refreshGrowthReportNowAction } from "@/actions/admin/growth-report.actions";

describe("growth report admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ user: { id: "admin_1", role: "ADMIN" } });
    generateGrowthReportNowMock.mockResolvedValue({ id: "report_1" });
  });

  it("requires admin access and regenerates the 12-hour report immediately", async () => {
    await refreshGrowthReportNowAction();

    expect(requireAdminMock).toHaveBeenCalledTimes(1);
    expect(generateGrowthReportNowMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/growth-intelligence");
  });
});
