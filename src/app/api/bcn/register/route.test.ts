import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  guard: vi.fn(),
  find: vi.fn(),
  pending: vi.fn(),
  create: vi.fn(),
  hash: vi.fn(),
  email: vi.fn(),
}));
vi.mock("@/lib/bcn-v2/http", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/bcn-v2/http")>(
      "@/lib/bcn-v2/http",
    );
  return { ...actual, requestGuard: m.guard };
});
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: m.find, create: m.create },
    pendingRegistration: { findFirst: m.pending },
  },
}));
vi.mock("@/lib/auth/password", () => ({ hashPassword: m.hash }));
vi.mock("@/lib/auth/email-verification", () => ({
  sendEmailVerificationForUser: m.email,
}));
import { POST } from "./route";
const input = {
  name: "Test Owner",
  email: "test@example.test",
  password: "Test-only-Password1!",
  acceptedTerms: true,
  adult: true,
};
const request = (data: unknown = input) =>
  new Request("https://thebusinesscircle.net/api/bcn/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://thebusinesscircle.net",
    },
    body: JSON.stringify(data),
  });
beforeEach(() => {
  vi.resetAllMocks();
  m.guard.mockResolvedValue(null);
  m.find.mockResolvedValue(null);
  m.pending.mockResolvedValue(null);
  m.create.mockResolvedValue({ id: "synthetic-test-user" });
  m.hash.mockResolvedValue("synthetic-hash");
  m.email.mockResolvedValue({ sent: true });
});
describe("optional free BCN registration", () => {
  it("creates only a free BCN user and requests verification", async () => {
    expect((await POST(request())).status).toBe(201);
    expect(m.create.mock.calls[0][0].data).toMatchObject({
      registrationSource: "bcn-v2",
      passwordHash: "synthetic-hash",
    });
    expect(m.create.mock.calls[0][0].data).not.toHaveProperty("subscription");
    expect(m.create.mock.calls[0][0].data).not.toHaveProperty("circleCards");
    expect(m.email).toHaveBeenCalled();
  });
  it("does not overwrite or merge an existing account", async () => {
    m.find.mockResolvedValue({ id: "existing" });
    expect((await POST(request())).status).toBe(201);
    expect(m.create).not.toHaveBeenCalled();
    expect(m.email).not.toHaveBeenCalled();
  });
  it("preserves a pending payment-first registration without creating a conflicting user", async () => {
    m.pending.mockResolvedValue({ id: "pending" });
    expect((await POST(request())).status).toBe(201);
    expect(m.create).not.toHaveBeenCalled();
  });
  it("requires terms and adult confirmation", async () => {
    expect(
      (await POST(request({ ...input, acceptedTerms: false }))).status,
    ).toBe(400);
    expect(m.create).not.toHaveBeenCalled();
  });
  it("honours the shared request guard", async () => {
    m.guard.mockResolvedValue(new Response(null, { status: 429 }));
    expect((await POST(request())).status).toBe(429);
    expect(m.hash).not.toHaveBeenCalled();
  });
  it("does not expose database errors or credentials", async () => {
    m.create.mockRejectedValue(new Error("synthetic private DB detail"));
    const r = await POST(request());
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain("private DB detail");
  });
});
