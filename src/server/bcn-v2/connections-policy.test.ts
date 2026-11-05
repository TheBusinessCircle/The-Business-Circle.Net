import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  users: vi.fn(),
  block: vi.fn(),
  thread: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findMany: mocks.users },
    directMessageBlock: { findFirst: mocks.block },
    directMessageThread: { findFirst: mocks.thread },
  },
}));
import {
  bcnDirectCallsConfigured,
  connectedPairCanTalk,
} from "./connections-policy";
beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.stubEnv("BCN_V2_ENABLED", "true");
  vi.stubEnv("APP_URL", "https://thebusinesscircle.net");
  vi.stubEnv("NEXTAUTH_URL", "https://thebusinesscircle.net");
  mocks.users.mockResolvedValue([{ id: "a" }, { id: "b" }]);
  mocks.block.mockResolvedValue(null);
  mocks.thread.mockResolvedValue({ id: "thread" });
});
describe("free direct conversation policy", () => {
  it("requires an accepted two-person connection", async () => {
    expect(await connectedPairCanTalk("a", "b")).toBe(true);
    mocks.thread.mockResolvedValue(null);
    expect(await connectedPairCanTalk("a", "b")).toBe(false);
  });
  it("denies blocks in either direction", async () => {
    mocks.block.mockResolvedValue({ id: "block" });
    expect(await connectedPairCanTalk("a", "b")).toBe(false);
    expect(mocks.thread).not.toHaveBeenCalled();
  });
  it("denies suspended, unverified or rules-unaccepted participants", async () => {
    mocks.users.mockResolvedValue([{ id: "a" }]);
    expect(await connectedPairCanTalk("a", "b")).toBe(false);
    expect(mocks.users.mock.calls[0][0].where).toMatchObject({
      suspended: false,
      emailVerified: { not: null },
    });
  });
  it("does not enable free messaging on the separate product deployment", async () => {
    vi.stubEnv("APP_URL", "https://circlecard.co.uk");
    expect(await connectedPairCanTalk("a", "b")).toBe(false);
    expect(mocks.users).not.toHaveBeenCalled();
  });
  it("respects the private messaging kill switch", async () => {
    vi.stubEnv("PRIVATE_MESSAGING_ENABLED", "false");
    expect(await connectedPairCanTalk("a", "b")).toBe(false);
  });
  it("keeps calling off without explicit configuration", () => {
    vi.stubEnv("BCN_DIRECT_CALLS_ENABLED", "false");
    expect(bcnDirectCallsConfigured()).toBe(false);
    vi.stubEnv("BCN_DIRECT_CALLS_ENABLED", "true");
    vi.stubEnv("LIVEKIT_URL", "wss://rtc.example.test");
    vi.stubEnv("LIVEKIT_API_KEY", "test-key");
    vi.stubEnv("LIVEKIT_API_SECRET", "");
    expect(bcnDirectCallsConfigured()).toBe(false);
  });
  it("requires secure realtime transport for BCN direct calls", () => {
    vi.stubEnv("BCN_DIRECT_CALLS_ENABLED", "true");
    vi.stubEnv("LIVEKIT_URL", "ws://rtc.example.test");
    vi.stubEnv("LIVEKIT_API_KEY", "test-key");
    vi.stubEnv("LIVEKIT_API_SECRET", "test-secret");
    expect(bcnDirectCallsConfigured()).toBe(false);
    vi.stubEnv("LIVEKIT_URL", "wss://rtc.example.test");
    expect(bcnDirectCallsConfigured()).toBe(true);
  });
});
