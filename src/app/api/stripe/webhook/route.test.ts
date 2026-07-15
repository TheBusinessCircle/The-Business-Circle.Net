import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const constructStripeWebhookEventMock = vi.hoisted(() => vi.fn());
const processFounderStripeWebhookEventMock = vi.hoisted(() => vi.fn());
const processStripeWebhookEventMock = vi.hoisted(() => vi.fn());
const processCircleCardStripeWebhookEventMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/stripe", () => ({
  constructStripeWebhookEvent: constructStripeWebhookEventMock
}));
vi.mock("@/server/founder", () => ({
  processFounderStripeWebhookEvent: processFounderStripeWebhookEventMock
}));
vi.mock("@/server/subscriptions", () => ({
  processStripeWebhookEvent: processStripeWebhookEventMock
}));
vi.mock("@/server/circle-card", () => ({
  processCircleCardStripeWebhookEvent: processCircleCardStripeWebhookEventMock
}));

import { POST } from "@/app/api/stripe/webhook/route";

const RAW_BODY_CANARY = '{\n  "id": "evt_synthetic_route_test",\n  "canary": "raw-body-canary-93fd"\n}\n';
const SIGNATURE_CANARY = "t=1910000000,v1=synthetic-signature-canary-7aa";
const SECRET_CANARY = "whsec_synthetic_secret_canary_8bb";

function webhookRequest({
  body = RAW_BODY_CANARY,
  signature = SIGNATURE_CANARY
}: {
  body?: string;
  signature?: string | null;
} = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature !== null) {
    headers.set("stripe-signature", signature);
  }

  return new Request("https://thebusinesscircle.net/api/stripe/webhook", {
    method: "POST",
    headers,
    body
  });
}

function signedEvent(type = "invoice.paid") {
  return {
    id: "evt_synthetic_route_test",
    type,
    data: { object: { id: "in_synthetic_route_test" } }
  };
}

function capturedConsoleText(consoleError: ReturnType<typeof vi.spyOn>) {
  return JSON.stringify(consoleError.mock.calls);
}

describe("Stripe webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET_CANARY);
    constructStripeWebhookEventMock.mockReturnValue(signedEvent());
    processCircleCardStripeWebhookEventMock.mockResolvedValue(false);
    processStripeWebhookEventMock.mockResolvedValue(undefined);
    processFounderStripeWebhookEventMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed when the webhook secret is not configured", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    expect(constructStripeWebhookEventMock).not.toHaveBeenCalled();
    expect(processCircleCardStripeWebhookEventMock).not.toHaveBeenCalled();
    expect(processStripeWebhookEventMock).not.toHaveBeenCalled();
    expect(processFounderStripeWebhookEventMock).not.toHaveBeenCalled();
  });

  it("rejects a missing signature without attempting verification", async () => {
    const response = await POST(webhookRequest({ signature: null }));

    expect(response.status).toBe(400);
    expect(constructStripeWebhookEventMock).not.toHaveBeenCalled();
    expect(processCircleCardStripeWebhookEventMock).not.toHaveBeenCalled();
  });

  it("passes the raw request text unchanged to Stripe verification", async () => {
    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(constructStripeWebhookEventMock).toHaveBeenCalledWith(
      RAW_BODY_CANARY,
      SIGNATURE_CANARY,
      SECRET_CANARY
    );
    expect(processCircleCardStripeWebhookEventMock).toHaveBeenCalledWith(signedEvent());
    expect(processStripeWebhookEventMock).toHaveBeenCalledWith(signedEvent());
    expect(processFounderStripeWebhookEventMock).toHaveBeenCalledWith(signedEvent());
  });

  it("returns 400 for an invalid signature without logging request material", async () => {
    constructStripeWebhookEventMock.mockImplementation(() => {
      throw new Error(`${RAW_BODY_CANARY} ${SIGNATURE_CANARY} ${SECRET_CANARY}`);
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(400);
    expect(processCircleCardStripeWebhookEventMock).not.toHaveBeenCalled();
    const logged = capturedConsoleText(consoleError);
    expect(logged).toContain("stripe-webhook-verification-failed");
    expect(logged).not.toContain(RAW_BODY_CANARY.trim());
    expect(logged).not.toContain(SIGNATURE_CANARY);
    expect(logged).not.toContain(SECRET_CANARY);
    expect(logged).not.toContain("raw-body-canary-93fd");
  });

  it("returns 400 for an invalid payload without logging its raw text", async () => {
    const invalidPayload = "not-json-raw-payload-canary-31ce";
    constructStripeWebhookEventMock.mockImplementation(() => {
      throw new Error(`Could not parse payload: ${invalidPayload}`);
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(webhookRequest({ body: invalidPayload }));

    expect(response.status).toBe(400);
    expect(constructStripeWebhookEventMock).toHaveBeenCalledWith(
      invalidPayload,
      SIGNATURE_CANARY,
      SECRET_CANARY
    );
    expect(capturedConsoleText(consoleError)).not.toContain(invalidPayload);
    expect(processCircleCardStripeWebhookEventMock).not.toHaveBeenCalled();
  });

  it("does not fall through to BCN or founder processing when Circle Card handles the event", async () => {
    processCircleCardStripeWebhookEventMock.mockResolvedValue(true);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(processCircleCardStripeWebhookEventMock).toHaveBeenCalledWith(signedEvent());
    expect(processStripeWebhookEventMock).not.toHaveBeenCalled();
    expect(processFounderStripeWebhookEventMock).not.toHaveBeenCalled();
  });

  it("returns a retryable non-2xx response when a processor lease is busy", async () => {
    processStripeWebhookEventMock.mockRejectedValue(
      new Error(
        `stripe-webhook-event-processing-in-progress ${RAW_BODY_CANARY} ${SIGNATURE_CANARY} ${SECRET_CANARY}`
      )
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Webhook processing error.");
    expect(processFounderStripeWebhookEventMock).not.toHaveBeenCalled();
    const logged = capturedConsoleText(consoleError);
    expect(logged).toContain("stripe-webhook-processing-failed");
    expect(logged).toContain("evt_synthetic_route_test");
    expect(logged).toContain("invoice.paid");
    expect(logged).not.toContain(RAW_BODY_CANARY.trim());
    expect(logged).not.toContain(SIGNATURE_CANARY);
    expect(logged).not.toContain(SECRET_CANARY);
    expect(logged).not.toContain("raw-body-canary-93fd");
  });

  it("returns a retryable non-2xx response for Circle Card processing errors", async () => {
    processCircleCardStripeWebhookEventMock.mockRejectedValue(
      new Error(`${RAW_BODY_CANARY} ${SIGNATURE_CANARY} ${SECRET_CANARY}`)
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    expect(processStripeWebhookEventMock).not.toHaveBeenCalled();
    expect(processFounderStripeWebhookEventMock).not.toHaveBeenCalled();
    const logged = capturedConsoleText(consoleError);
    expect(logged).not.toContain(RAW_BODY_CANARY.trim());
    expect(logged).not.toContain(SIGNATURE_CANARY);
    expect(logged).not.toContain(SECRET_CANARY);
    expect(logged).not.toContain("raw-body-canary-93fd");
  });
});
