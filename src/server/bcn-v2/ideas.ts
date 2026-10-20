import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ideaIsOpen, type IdeaCommand } from "@/lib/bcn-v2/ideas";
import { assertNoBlockedProfanity } from "@/lib/moderation/profanity";
export class IdeaError extends Error {}
const fail = (message: string): never => {
  throw new IdeaError(message);
};
export async function executeIdeaCommand(
  command: IdeaCommand,
  actorId: string,
) {
  // Serialize status/ownership transitions, including concurrent offer acceptance.
  return prisma.$transaction(
    async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: actorId },
        select: {
          id: true,
          suspended: true,
          emailVerified: true,
          role: true,
          acceptedRulesAt: true,
        },
      });
      if (!actor || actor.suspended || !actor.emailVerified)
        return fail("A verified BCN account is required.");
      const rulesRequired = ["create", "edit", "offer", "accept"].includes(
        command.action,
      );
      if (rulesRequired && actor.role !== "ADMIN" && !actor.acceptedRulesAt)
        return fail("Read and accept the BCN rules in Private chats first.");
      const audit = (
        requestId: string,
        action: string,
        note: string,
        offerId?: string,
      ) =>
        tx.bcnIdeaAudit.create({
          data: { actorId, requestId, action, note, offerId },
        });
      if (command.action === "create" || command.action === "edit") {
        const {
          publicConsent: _consent,
          practicalHelpOnly: _practical,
          ...data
        } = command.data;
        void _consent;
        void _practical;
        assertNoBlockedProfanity(
          [data.title, data.idea, data.helpNeeded, data.nextMilestone].join(
            " ",
          ),
        );
        if (command.action === "edit") {
          const item = await tx.bcnIdeaRequest.findUnique({
            where: { id: command.id },
          });
          if (
            !item ||
            item.ownerId !== actorId ||
            ["CLOSED", "MATCHED", "COMPLETED"].includes(item.status)
          )
            return fail("This request cannot be edited.");
          await tx.bcnIdeaRequest.update({
            where: { id: item.id },
            data: {
              ...data,
              status: "PENDING",
              publicConsentAt: new Date(),
              expiresAt: new Date(Date.now() + 30 * 86400000),
            },
          });
          await tx.bcnIdeaOffer.updateMany({
            where: {
              requestId: item.id,
              status: { in: ["PENDING", "APPROVED"] },
            },
            data: { status: "WITHDRAWN" },
          });
          await audit(
            item.id,
            "request.edited",
            "Changes require a fresh review; earlier offers need to be resubmitted.",
          );
          return {
            ok: true,
            id: item.id,
            message:
              "Changes saved for review. Earlier offers have been withdrawn because the brief changed.",
          };
        }
        const count = await tx.bcnIdeaRequest.count({
          where: {
            ownerId: actorId,
            status: { in: ["PENDING", "APPROVED"] },
            expiresAt: { gt: new Date() },
          },
        });
        if (count >= 2)
          return fail(
            "Keep to two open requests so each one gets proper attention.",
          );
        const recent = await tx.bcnIdeaRequest.count({
          where: {
            ownerId: actorId,
            createdAt: { gte: new Date(Date.now() - 86400000) },
          },
        });
        if (recent >= 3)
          return fail(
            "Please wait until tomorrow before submitting another request.",
          );
        const item = await tx.bcnIdeaRequest.create({
          data: {
            ...data,
            ownerId: actorId,
            publicConsentAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 86400000),
          },
        });
        await audit(
          item.id,
          "request.submitted",
          "Owner consented to publication of this brief after moderation.",
        );
        return {
          ok: true,
          id: item.id,
          message:
            "Your practical help request is waiting for review. It is not public yet.",
        };
      }
      if (command.action === "offer") {
        const {
          agreesToContact: _contact,
          honestPricing: _honest,
          ...data
        } = command.data;
        void _contact;
        void _honest;
        const item = await tx.bcnIdeaRequest.findUnique({
          where: { id: data.requestId },
        });
        if (!item || !ideaIsOpen(item) || item.ownerId === actorId)
          return fail("This request is not available for an offer.");
        if (!item.supportTypes.includes(data.kind))
          return fail("The owner has not requested this type of support.");
        const owner = await tx.user.findUnique({
          where: { id: item.ownerId },
          select: { suspended: true, emailVerified: true },
        });
        if (!owner || owner.suspended || !owner.emailVerified)
          return fail("This request is unavailable.");
        const blocked = await tx.directMessageBlock.findFirst({
          where: {
            OR: [
              { blockerId: actorId, blockedUserId: item.ownerId },
              { blockerId: item.ownerId, blockedUserId: actorId },
            ],
          },
          select: { id: true },
        });
        if (blocked) return fail("An offer cannot be made for this request.");
        assertNoBlockedProfanity(
          [data.scope, data.timing, data.priceTerms].join(" "),
        );
        const recent = await tx.bcnIdeaOffer.count({
          where: {
            helperId: actorId,
            createdAt: { gte: new Date(Date.now() - 86400000) },
          },
        });
        if (recent >= 10)
          return fail("Please limit offers to ten relevant requests a day.");
        const existing = await tx.bcnIdeaOffer.findUnique({
          where: {
            requestId_helperId: {
              requestId: data.requestId,
              helperId: actorId,
            },
          },
        });
        if (existing && !["WITHDRAWN", "REJECTED"].includes(existing.status))
          return fail("You already have an offer on this request.");
        const offer = await tx.bcnIdeaOffer.upsert({
          where: {
            requestId_helperId: {
              requestId: data.requestId,
              helperId: actorId,
            },
          },
          create: { ...data, helperId: actorId },
          update: { ...data, status: "PENDING", threadId: null },
        });
        await audit(
          item.id,
          "offer.submitted",
          "Helper consented to a private conversation if the owner chooses this reviewed offer.",
          offer.id,
        );
        return {
          ok: true,
          message:
            "Offer submitted for review. It will be shown privately to the owner after approval.",
        };
      }
      if (command.action === "accept") {
        const offer = await tx.bcnIdeaOffer.findUnique({
          where: { id: command.offerId },
          include: { request: true },
        });
        if (!offer || offer.request.ownerId !== actorId)
          return fail("Offer unavailable.");
        if (offer.status === "ACCEPTED" && offer.threadId)
          return { ok: true, threadId: offer.threadId };
        if (offer.status !== "APPROVED" || !ideaIsOpen(offer.request))
          return fail(
            "Only a reviewed offer on an open request can be chosen.",
          );
        const helper = await tx.user.findUnique({
          where: { id: offer.helperId },
          select: {
            suspended: true,
            emailVerified: true,
            acceptedRulesAt: true,
            role: true,
          },
        });
        if (
          !helper ||
          helper.suspended ||
          !helper.emailVerified ||
          (!helper.acceptedRulesAt && helper.role !== "ADMIN") ||
          process.env.PRIVATE_MESSAGING_ENABLED === "false"
        )
          return fail("This helper is currently unavailable for chat.");
        const block = await tx.directMessageBlock.findFirst({
          where: {
            OR: [
              { blockerId: actorId, blockedUserId: offer.helperId },
              { blockerId: offer.helperId, blockedUserId: actorId },
            ],
          },
          select: { id: true },
        });
        if (block)
          return fail(
            "A conversation cannot be opened between these accounts.",
          );
        const pairKey = [actorId, offer.helperId].sort().join(":");
        const thread = await tx.directMessageThread.upsert({
          where: { pairKey },
          create: {
            pairKey,
            participants: {
              create: [{ userId: actorId }, { userId: offer.helperId }],
            },
          },
          update: {},
        });
        await tx.directMessage.create({
          data: {
            threadId: thread.id,
            senderId: actorId,
            messageType: "SYSTEM",
            content: `Both people agreed to discuss practical help for: ${offer.request.title}. This opens a conversation; it does not place an order or take payment. Confirm scope, price, VAT and terms before work begins.`,
          },
        });
        await tx.directMessageThread.update({
          where: { id: thread.id },
          data: { lastMessageAt: new Date() },
        });
        await tx.bcnIdeaOffer.update({
          where: { id: offer.id },
          data: { status: "ACCEPTED", threadId: thread.id },
        });
        await tx.bcnIdeaRequest.update({
          where: { id: offer.requestId },
          data: { status: "MATCHED" },
        });
        await tx.bcnIdeaOffer.updateMany({
          where: {
            requestId: offer.requestId,
            id: { not: offer.id },
            status: { in: ["PENDING", "APPROVED"] },
          },
          data: { status: "NOT_SELECTED" },
        });
        await audit(
          offer.requestId,
          "offer.accepted",
          "Owner chose a reviewed offer and consented to private chat. No purchase or payment recorded.",
          offer.id,
        );
        return { ok: true, threadId: thread.id };
      }
      if (command.action === "complete") {
        const item = await tx.bcnIdeaRequest.findUnique({
          where: { id: command.id },
        });
        if (!item || item.ownerId !== actorId || item.status !== "MATCHED")
          return fail(
            "Only the owner of a matched request can record progress.",
          );
        await tx.bcnIdeaRequest.update({
          where: { id: item.id },
          data: { status: "COMPLETED" },
        });
        await audit(
          item.id,
          "request.owner-reported-progress",
          command.outcome,
        );
        return {
          ok: true,
          message:
            "Thank you. Your progress note is recorded privately; it is not published as a testimonial or counted as BCN revenue.",
        };
      }
      if (command.action === "close") {
        const item = await tx.bcnIdeaRequest.findUnique({
          where: { id: command.id },
        });
        if (!item || item.ownerId !== actorId)
          return fail("Request unavailable.");
        if (item.status === "COMPLETED")
          return {
            ok: true,
            message:
              "This completed request is already removed from public discovery.",
          };
        await tx.bcnIdeaRequest.update({
          where: { id: item.id },
          data: { status: "CLOSED" },
        });
        await tx.bcnIdeaOffer.updateMany({
          where: {
            requestId: item.id,
            status: { in: ["PENDING", "APPROVED"] },
          },
          data: { status: "NOT_SELECTED" },
        });
        await audit(
          item.id,
          "request.closed",
          "Owner closed the request and withdrew it from public discovery.",
        );
        return {
          ok: true,
          message:
            "Request closed and removed from the board. Existing conversations remain available.",
        };
      }
      if (command.action === "withdraw-offer") {
        const item = await tx.bcnIdeaOffer.findUnique({
          where: { id: command.offerId },
        });
        if (!item || item.helperId !== actorId || item.status === "ACCEPTED")
          return fail(
            "This offer cannot be withdrawn here. Discuss accepted arrangements in chat.",
          );
        await tx.bcnIdeaOffer.update({
          where: { id: item.id },
          data: { status: "WITHDRAWN" },
        });
        await audit(
          item.requestId,
          "offer.withdrawn",
          "Helper withdrew this offer.",
          item.id,
        );
        return { ok: true, message: "Offer withdrawn." };
      }
      if (command.action === "report") {
        const item = await tx.bcnIdeaRequest.findUnique({
          where: { id: command.id },
        });
        if (
          !item ||
          (!ideaIsOpen(item) &&
            item.ownerId !== actorId &&
            actor.role !== "ADMIN")
        )
          return fail("Request unavailable.");
        if (command.offerId) {
          const offer = await tx.bcnIdeaOffer.findUnique({
            where: { id: command.offerId },
          });
          if (
            !offer ||
            offer.requestId !== item.id ||
            ![item.ownerId, offer.helperId].includes(actorId)
          )
            return fail("Offer unavailable.");
        }
        await tx.bcnIdeaReport.create({
          data: {
            requestId: item.id,
            offerId: command.offerId,
            reporterId: actorId,
            detail: command.detail,
          },
        });
        await audit(
          item.id,
          "report.submitted",
          "Report submitted for administrator investigation.",
          command.offerId,
        );
        return {
          ok: true,
          message: "Report submitted privately to BCN moderators.",
        };
      }
      if (command.action === "moderate") {
        if (actor.role !== "ADMIN")
          return fail("Administrator access required.");
        if (command.entity === "report") {
          if (command.decision !== "resolve")
            return fail("Choose resolve for a report.");
          const report = await tx.bcnIdeaReport.findUnique({
            where: { id: command.id },
          });
          if (!report) return fail("Report unavailable.");
          await tx.bcnIdeaReport.update({
            where: { id: report.id },
            data: { status: "RESOLVED", resolvedAt: new Date() },
          });
          await audit(
            report.requestId,
            "report.resolved",
            command.note,
            report.offerId || undefined,
          );
        } else {
          if (command.decision === "resolve")
            return fail("Choose approve or reject.");
          const offer =
            command.entity === "offer"
              ? await tx.bcnIdeaOffer.findUnique({
                  where: { id: command.id },
                  include: { request: true },
                })
              : null;
          const item =
            offer?.request ||
            (await tx.bcnIdeaRequest.findUnique({ where: { id: command.id } }));
          if (!item || (command.entity === "offer" && !offer))
            return fail("Item unavailable.");
          if (
            offer &&
            !["PENDING", "APPROVED", "REJECTED"].includes(offer.status)
          )
            return fail(
              "Do not alter accepted arrangements here. Investigate reports and suspend unsafe accounts through the existing moderation process.",
            );
          if (command.decision === "approve") {
            if (
              item.expiresAt <= new Date() ||
              (offer && !ideaIsOpen(item)) ||
              ["CLOSED", "MATCHED", "COMPLETED"].includes(item.status)
            )
              return fail("This request is no longer open for approval.");
            const account = await tx.user.findUnique({
              where: { id: offer?.helperId || item.ownerId },
              select: { suspended: true, emailVerified: true },
            });
            if (!account || account.suspended || !account.emailVerified)
              return fail("The account must be active and verified.");
          }
          const status =
            command.decision === "approve" ? "APPROVED" : "REJECTED";
          if (offer)
            await tx.bcnIdeaOffer.update({
              where: { id: offer.id },
              data: { status },
            });
          else
            await tx.bcnIdeaRequest.update({
              where: { id: item.id },
              data: { status },
            });
          if (!offer && status === "REJECTED")
            await tx.bcnIdeaOffer.updateMany({
              where: {
                requestId: item.id,
                status: { in: ["PENDING", "APPROVED"] },
              },
              data: { status: "WITHDRAWN" },
            });
          await audit(
            item.id,
            `${command.entity}.${status.toLowerCase()}`,
            command.note,
            offer?.id,
          );
        }
        return { ok: true, message: "Moderation decision recorded." };
      }
      return fail("Unknown action.");
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15000,
    },
  );
}
