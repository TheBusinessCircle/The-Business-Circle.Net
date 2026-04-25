import { describe, expect, it } from "vitest";
import { buildRegisterPayload } from "@/components/auth/register-form";

describe("buildRegisterPayload", () => {
  it("keeps legal acceptance flags in the register API payload", () => {
    const payload = buildRegisterPayload({
      name: "Trevor Newton",
      email: "trev@example.com",
      password: "ValidPassword1!",
      confirmPassword: "ValidPassword1!",
      tier: "INNER_CIRCLE",
      billingInterval: "annual",
      coreAccessConfirmed: false,
      acceptedTerms: true,
      acceptedRules: true,
      businessName: " The Business Circle ",
      businessStatus: "REGISTERED_BUSINESS",
      companyNumber: " 12345678 ",
      businessStage: "GROWTH",
      inviteCode: " BCN-TEST "
    });

    expect(payload).toEqual({
      name: "Trevor Newton",
      email: "trev@example.com",
      password: "ValidPassword1!",
      tier: "INNER_CIRCLE",
      billingInterval: "annual",
      coreAccessConfirmed: false,
      acceptedTerms: true,
      acceptedRules: true,
      businessName: "The Business Circle",
      businessStatus: "REGISTERED_BUSINESS",
      companyNumber: "12345678",
      businessStage: "GROWTH",
      inviteCode: "BCN-TEST"
    });
  });
});
