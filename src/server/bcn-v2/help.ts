import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { tokenHash } from "@/lib/bcn-v2/http";
import { adminHelpSchema } from "@/lib/bcn-v2/validation";
import type { z } from "zod";
export class WorkflowError extends Error {}
export async function moderateHelp(
  input: z.infer<typeof adminHelpSchema>,
  actorId: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const request = await tx.bcnHelpRequest.findUnique({
        where: { id: input.id },
      });
      if (!request) throw new WorkflowError("Request not found.");
      let consentToken: string | undefined;
      let data: Record<string, unknown> = {};
      if (input.action === "review") {
        if (request.status !== "RECEIVED")
          throw new WorkflowError("Only new requests can be reviewed.");
        data = { status: "REVIEWED" };
      } else if (input.action === "propose") {
        if (!["REVIEWED", "AWAITING_CONSENT"].includes(request.status))
          throw new WorkflowError("Review this request first.");
        const provider = await tx.bcnProvider.findUnique({
          where: { id: input.providerId },
        });
        if (!provider?.approved)
          throw new WorkflowError("Choose an approved provider.");
        if (input.agreedFeePence > 0 && !provider.agreementReference)
          throw new WorkflowError(
            "A referral fee needs a recorded provider agreement.",
          );
        consentToken = randomBytes(32).toString("hex");
        data = {
          status: "AWAITING_CONSENT",
          providerId: provider.id,
          agreedFeePence: input.agreedFeePence,
          consentTokenHash: tokenHash(consentToken),
          consentExpiresAt: new Date(Date.now() + 7 * 86400000),
          sharingConsentAt: null,
        };
      } else if (input.action === "introduce") {
        if (
          request.status !== "CONSENTED" ||
          !request.sharingConsentAt ||
          !request.providerId
        )
          throw new WorkflowError(
            "Named-provider permission is required first.",
          );
        const provider = await tx.bcnProvider.findUnique({
          where: { id: request.providerId },
        });
        if (!provider?.approved)
          throw new WorkflowError("Provider approval has been withdrawn.");
        data = { status: "INTRODUCED", introducedAt: new Date() };
      } else if (input.action === "close") {
        if (!["INTRODUCED", "CONSENTED"].includes(request.status))
          throw new WorkflowError(
            "Only consented or introduced requests can close.",
          );
        data = {
          status: "CLOSED",
          outcome: input.outcome,
          consentTokenHash: null,
          consentExpiresAt: null,
        };
      } else {
        if (["INTRODUCED", "CLOSED", "REJECTED"].includes(request.status))
          throw new WorkflowError(
            "This request cannot be rejected at this stage.",
          );
        data = {
          status: "REJECTED",
          outcome: input.outcome,
          consentTokenHash: null,
          consentExpiresAt: null,
        };
      }
      const changed = await tx.bcnHelpRequest.updateMany({
        where: {
          id: request.id,
          status: request.status,
          updatedAt: request.updatedAt,
        },
        data,
      });
      if (changed.count !== 1)
        throw new WorkflowError("This request changed. Refresh and try again.");
      await tx.bcnHelpAudit.create({
        data: { requestId: request.id, action: input.action, actorId },
      });
      return {
        ok: true,
        ...(consentToken
          ? { consentPath: `/help-consent?token=${consentToken}` }
          : {}),
      };
    },
    { isolationLevel: "Serializable" },
  );
}
export async function grantSharingConsent(
  token: string,
  decision: "agree" | "decline",
) {
  return prisma.$transaction(
    async (tx) => {
      const request = await tx.bcnHelpRequest.findUnique({
        where: { consentTokenHash: tokenHash(token) },
        include: { provider: true },
      });
      if (
        !request ||
        request.status !== "AWAITING_CONSENT" ||
        !request.consentExpiresAt ||
        request.consentExpiresAt < new Date() ||
        !request.provider?.approved
      )
        throw new WorkflowError(
          "This permission link is unavailable or expired.",
        );
      const updated = await tx.bcnHelpRequest.updateMany({
        where: {
          id: request.id,
          status: "AWAITING_CONSENT",
          consentTokenHash: tokenHash(token),
        },
        data: {
          status: decision === "agree" ? "CONSENTED" : "REVIEWED",
          sharingConsentAt: decision === "agree" ? new Date() : null,
          consentTokenHash: null,
          consentExpiresAt: null,
          ...(decision === "decline"
            ? { providerId: null, agreedFeePence: null }
            : {}),
        },
      });
      if (updated.count !== 1)
        throw new WorkflowError("This permission link has already been used.");
      await tx.bcnHelpAudit.create({
        data: {
          requestId: request.id,
          action:
            decision === "agree" ? "sharing-consented" : "sharing-declined",
          actorId: "requester-token",
        },
      });
      return { ok: true };
    },
    { isolationLevel: "Serializable" },
  );
}
