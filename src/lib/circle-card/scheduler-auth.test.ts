import { afterEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

import { authorizeCircleCardSchedulerRequest } from "@/lib/circle-card/scheduler-auth";

const SCHEDULER_SECRET = "circle-card-scheduler-test-secret-0001";
const ENVIRONMENT = {
  APP_BRAND: "circle-card",
  CIRCLE_CARD_SCHEDULER_SECRET: SCHEDULER_SECRET
};

function request(input?: {
  authorization?: string;
  url?: string;
  body?: string;
  duplicateAuthorization?: boolean;
}) {
  const headers = new Headers();
  if (input?.authorization) {
    headers.append("authorization", input.authorization);
  }
  if (input?.duplicateAuthorization) {
    headers.append("authorization", `Bearer ${SCHEDULER_SECRET}`);
  }

  return new Request(
    input?.url ?? "https://circlecard.co.uk/api/internal/circle-card/weekly-summary/run",
    {
      method: "POST",
      headers,
      body: input?.body
    }
  );
}

describe("Circle Card scheduler authentication", () => {
  afterEach(() => {
    delete process.env.CIRCLE_CARD_SCHEDULER_SECRET;
  });

  it("accepts the exact server-configured Bearer credential", () => {
    expect(
      authorizeCircleCardSchedulerRequest(
        request({ authorization: `Bearer ${SCHEDULER_SECRET}` }),
        ENVIRONMENT
      )
    ).toBe("authorized");
  });

  it.each([
    undefined,
    "",
    "Bearer wrong-secret",
    `bearer ${SCHEDULER_SECRET}`,
    `Basic ${SCHEDULER_SECRET}`,
    `Bearer ${SCHEDULER_SECRET} extra`,
    `Bearer ${SCHEDULER_SECRET},Bearer ${SCHEDULER_SECRET}`
  ])("rejects missing or malformed Authorization value %s", (authorization) => {
    expect(
      authorizeCircleCardSchedulerRequest(request({ authorization }), ENVIRONMENT)
    ).toBe("unauthorized");
  });

  it("rejects duplicate Authorization headers", () => {
    expect(
      authorizeCircleCardSchedulerRequest(
        request({
          authorization: `Bearer ${SCHEDULER_SECRET}`,
          duplicateAuthorization: true
        }),
        ENVIRONMENT
      )
    ).toBe("unauthorized");
  });

  it("does not accept a credential from the query string or request body", () => {
    expect(
      authorizeCircleCardSchedulerRequest(
        request({
          url: `https://circlecard.co.uk/api/internal/circle-card/weekly-summary/run?secret=${SCHEDULER_SECRET}`,
          body: JSON.stringify({ secret: SCHEDULER_SECRET })
        }),
        ENVIRONMENT
      )
    ).toBe("unauthorized");
  });

  it("does not accept the shared cron secret or alternate credential headers", () => {
    const headers = new Headers({
      "x-cron-secret": SCHEDULER_SECRET,
      "x-circle-card-secret": SCHEDULER_SECRET
    });
    const schedulerRequest = new Request(
      "https://circlecard.co.uk/api/internal/circle-card/weekly-summary/run",
      { method: "POST", headers }
    );
    const environment = { ...ENVIRONMENT, CRON_SECRET: SCHEDULER_SECRET };

    expect(
      authorizeCircleCardSchedulerRequest(schedulerRequest, environment)
    ).toBe("unauthorized");
  });

  it.each([
    {},
    { CIRCLE_CARD_SCHEDULER_SECRET: "too-short" },
    { CIRCLE_CARD_SCHEDULER_SECRET: "   " }
  ])("fails closed when the scheduler credential is absent or weak", (override) => {
    expect(
      authorizeCircleCardSchedulerRequest(request(), {
        APP_BRAND: "circle-card",
        ...override
      })
    ).toBe("not-configured");
  });

  it("uses the existing case-normalized server runtime brand contract", () => {
    expect(
      authorizeCircleCardSchedulerRequest(
        request({ authorization: `Bearer ${SCHEDULER_SECRET}` }),
        { ...ENVIRONMENT, APP_BRAND: "CIRCLE-CARD" }
      )
    ).toBe("authorized");
  });

  it.each(["bcn", "unknown", "", undefined])(
    "rejects the server runtime brand %s",
    (APP_BRAND) => {
      expect(
        authorizeCircleCardSchedulerRequest(
          request({ authorization: `Bearer ${SCHEDULER_SECRET}` }),
          { ...ENVIRONMENT, APP_BRAND }
        )
      ).toBe("invalid-runtime-brand");
    }
  );
});
