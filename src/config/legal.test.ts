import { describe, expect, it } from "vitest";
import {
  LEGAL_FOOTER_LINKS,
  PUBLIC_TRUST_PHRASE,
  TERMS_LABEL,
  TERMS_OF_SERVICE_CONTENT,
  TRUST_LEGAL_GROUP_LABEL
} from "@/config/legal";

describe("legal copy source of truth", () => {
  it("uses the launch trust and terms labels consistently", () => {
    expect(PUBLIC_TRUST_PHRASE).toBe("Private founder-led business environment");
    expect(TRUST_LEGAL_GROUP_LABEL).toBe("Trust & legal");
    expect(TERMS_LABEL).toBe("Terms of Service");
    expect(LEGAL_FOOTER_LINKS).toContainEqual({
      label: TERMS_LABEL,
      href: "/terms-of-service"
    });
  });

  it("ships final cancellation and refund wording without placeholders", () => {
    const text = [
      TERMS_OF_SERVICE_CONTENT.label,
      TERMS_OF_SERVICE_CONTENT.title,
      TERMS_OF_SERVICE_CONTENT.intro,
      ...TERMS_OF_SERVICE_CONTENT.sections.flatMap((section) => [
        section.title,
        ...section.paragraphs
      ])
    ].join("\n");

    expect(text).not.toContain(["OWNER INPUT", "REQUIRED"].join(" "));
    expect(text).not.toContain(["Terms", "& Conditions"].join(" "));
    expect(text).toContain("Cancelling a subscription stops future renewals.");
    expect(text).toContain("This does not affect any statutory rights.");
  });
});
