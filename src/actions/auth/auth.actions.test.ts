import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("@/auth", () => ({
  signIn: mocks.signIn,
  signOut: mocks.signOut
}));

import {
  signInWithCredentialsAction,
  signOutAction
} from "@/actions/auth/auth.actions";

describe("authentication actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the shared credentials provider without selecting a product from client input", async () => {
    mocks.signIn.mockResolvedValue({ ok: true });

    await expect(
      signInWithCredentialsAction("member@example.com", "SyntheticPassword1!")
    ).resolves.toEqual({ ok: true });
    expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
      email: "member@example.com",
      password: "SyntheticPassword1!",
      redirect: false
    });
  });

  it("signs out to the current runtime root", async () => {
    mocks.signOut.mockResolvedValue(undefined);

    await signOutAction();

    expect(mocks.signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });
});
