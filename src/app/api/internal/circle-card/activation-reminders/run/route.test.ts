import { beforeEach, describe, expect, it, vi } from "vitest";

const authorizeMock = vi.hoisted(() => vi.fn());
const runJobMock = vi.hoisted(() => vi.fn());
const logErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/circle-card/scheduler-auth", () => ({
  authorizeCircleCardSchedulerRequest: authorizeMock
}));
vi.mock("@/server/circle-card", () => ({
  sendDueCircleCardActivationReminders: runJobMock
}));
vi.mock("@/lib/security/logging", () => ({ logServerError: logErrorMock }));

import * as route from "@/app/api/internal/circle-card/activation-reminders/run/route";

function request() {
  return new Request(
    "https://circlecard.co.uk/api/internal/circle-card/activation-reminders/run",
    { method: "POST" }
  );
}

describe("Circle Card activation reminder scheduler route", () => {
  beforeEach(() => {
    authorizeMock.mockReturnValue("authorized");
    runJobMock.mockResolvedValue({
      checked: 0,
      sent: 0,
      skipped: 0,
      completed: 0,
      failed: 0
    });
  });

  it("exports only POST and reports a successful zero-recipient run", async () => {
    expect("GET" in route).toBe(false);
    const response = await route.POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      checked: 0,
      sent: 0,
      skipped: 0,
      completed: 0,
      failed: 0
    });
  });

  it.each([
    ["invalid-runtime-brand", 404],
    ["not-configured", 503],
    ["unauthorized", 401]
  ])("fails closed for %s", async (authorization, status) => {
    authorizeMock.mockReturnValue(authorization);
    const response = await route.POST(request());

    expect(response.status).toBe(status);
    expect(runJobMock).not.toHaveBeenCalled();
  });

  it("returns a retryable failure without leaking the service error", async () => {
    runJobMock.mockRejectedValue(new Error("protected transport detail"));
    const response = await route.POST(request());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "Job failed." });
    expect(logErrorMock).toHaveBeenCalledWith(
      "circle-card-activation-reminder-job-failed",
      expect.any(Error)
    );
  });

  it("returns a retryable partial failure when a recipient delivery fails", async () => {
    runJobMock.mockResolvedValue({
      checked: 2,
      sent: 1,
      skipped: 1,
      completed: 0,
      failed: 1
    });
    const response = await route.POST(request());

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      ok: false,
      status: "partial-failure",
      failed: 1
    });
  });
});
