import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  adminHelpSchema,
  providerSchema,
  website,
} from "@/lib/bcn-v2/validation";
import { boundedJson, json, requestGuard } from "@/lib/bcn-v2/http";
import { moderateHelp, WorkflowError } from "@/server/bcn-v2/help";
async function adminId() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, suspended: true },
  });
  return user?.role === "ADMIN" && !user.suspended ? user.id : null;
}
const revenue = z.object({
  action: z.literal("revenue"),
  stream: z.enum([
    "introduction",
    "affiliate",
    "download",
    "sponsorship",
    "reversal",
  ]),
  externalReference: z.string().trim().min(3).max(200),
  amountPence: z
    .number()
    .int()
    .refine((v) => v !== 0 && Math.abs(v) <= 100000000),
  evidenceReference: z.string().trim().min(5).max(300),
  receivedAt: z.string().datetime(),
});
export async function POST(request: Request) {
  const blocked = await requestGuard(request, "admin", 100);
  if (blocked) return blocked;
  const actor = await adminId();
  if (!actor) return json({ error: "Administrator access required." }, 403);
  try {
    const raw = await boundedJson(request);
    if (raw?.action === "provider") {
      const data = providerSchema.parse(raw.data);
      const { business, ...rest } = data;
      const created = await prisma.bcnProvider.create({
        data: { name: business, ...rest },
      });
      return json({ ok: true, id: created.id }, 201);
    }
    if (raw?.action === "profile-review") {
      const input = z
        .object({ id: z.string().cuid(), approved: z.boolean() })
        .parse(raw);
      const profile = await prisma.bcnBusinessProfile.findUnique({
        where: { id: input.id },
      });
      if (!profile || !profile.publicConsentAt)
        return json({ error: "Listing permission required." }, 400);
      const user = await prisma.user.findUnique({
        where: { id: profile.userId },
        select: { emailVerified: true, suspended: true },
      });
      if (!user?.emailVerified || user.suspended)
        return json(
          { error: "A verified, active BCN account is required." },
          400,
        );
      await prisma.bcnBusinessProfile.update({
        where: { id: input.id },
        data: { approved: input.approved },
      });
      return json({ ok: true });
    }
    if (raw?.action === "provider-withdraw") {
      const { id } = z.object({ id: z.string().cuid() }).parse(raw);
      await prisma.bcnProvider.update({
        where: { id },
        data: { approved: false },
      });
      return json({ ok: true });
    }
    if (raw?.action === "revenue") {
      const input = revenue.parse(raw);
      if ((input.stream === "reversal") !== input.amountPence < 0)
        return json(
          {
            error:
              "Only reversals may be negative; reversals must be negative.",
          },
          400,
        );
      const data = {
        stream: input.stream,
        externalReference: input.externalReference,
        amountPence: input.amountPence,
        evidenceReference: input.evidenceReference,
        receivedAt: input.receivedAt,
      };
      await prisma.bcnRevenueEntry.create({
        data: {
          ...data,
          recordedBy: actor,
          receivedAt: new Date(data.receivedAt),
        },
      });
      return json({ ok: true }, 201);
    }
    if (raw?.action === "affiliate") {
      const input = z
        .object({
          slug: z.string().regex(/^[a-z0-9-]{3,80}$/),
          name: z.string().min(2).max(160),
          destination: website.refine((s) => !!s),
          allowedHost: z.string().min(3).max(200),
          approvalReference: z.string().min(5).max(200),
          disclosure: z.string().min(15).max(500),
        })
        .parse(raw.data);
      if (new URL(input.destination).hostname !== input.allowedHost)
        return json(
          { error: "The destination must match the approved host exactly." },
          400,
        );
      await prisma.bcnAffiliateOffer.create({
        data: { ...input, active: false },
      });
      return json(
        {
          ok: true,
          message:
            "Offer recorded inactive. Review programme approval and terms before activation.",
        },
        201,
      );
    }
    return json(await moderateHelp(adminHelpSchema.parse(raw), actor));
  } catch (e) {
    return json(
      {
        error:
          e instanceof WorkflowError
            ? e.message
            : "Could not save this action. Check the details and refresh before retrying.",
      },
      400,
    );
  }
}
