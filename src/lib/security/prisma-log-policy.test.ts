import { describe, expect, it } from "vitest";
import { prismaLogLevelsForEnvironment } from "@/lib/security/prisma-log-policy";

describe("Prisma log policy", () => {
  it.each(["production", "test", undefined])(
    "does not enable Prisma stdout logging in %s",
    (environment) => {
      const tokenCanary = "0123456789abcdef".repeat(4);
      const emailCanary = "private.owner@example.test";
      const inviteCanary = "PRIVATE-INVITE-CODE";
      const emitted: string[] = [];

      if (prismaLogLevelsForEnvironment(environment).includes("error")) {
        emitted.push(`${emailCanary} ${inviteCanary} ${tokenCanary}`);
      }

      expect(prismaLogLevelsForEnvironment(environment)).toEqual([]);
      expect(JSON.stringify(emitted)).not.toContain(tokenCanary);
      expect(JSON.stringify(emitted)).not.toContain(emailCanary);
      expect(JSON.stringify(emitted)).not.toContain(inviteCanary);
    }
  );

  it("retains query diagnostics only in local development", () => {
    expect(prismaLogLevelsForEnvironment("development")).toEqual(["query", "warn"]);
  });
});
