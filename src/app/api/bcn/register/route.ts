import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { passwordSchema, emailSchema } from "@/lib/auth/schemas";
import { hashPassword } from "@/lib/auth/password";
import { sendEmailVerificationForUser } from "@/lib/auth/email-verification";
import { boundedJson, json, requestGuard } from "@/lib/bcn-v2/http";
const schema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema.transform((v) => v.toLowerCase()),
    password: passwordSchema.refine(
      (v) => Buffer.byteLength(v, "utf8") <= 72,
      "Use a password of at most 72 bytes.",
    ),
    acceptedTerms: z.literal(true),
    adult: z.literal(true),
    website: z.string().max(0).optional(),
  })
  .strict();
export async function POST(request: Request) {
  const blocked = await requestGuard(request, "register", 4);
  if (blocked) return blocked;
  try {
    const parsed = schema.safeParse(await boundedJson(request));
    if (!parsed.success)
      return json(
        {
          error:
            parsed.error.issues[0]?.message || "Check your account details.",
        },
        400,
      );
    const data = parsed.data;
    const passwordHash = await hashPassword(data.password);
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    const pending = await prisma.pendingRegistration.findFirst({
      where: { email: data.email, status: "PENDING" },
      select: { id: true },
    });
    // Never race the existing payment-first completion path for this address.
    if (!existing && !pending) {
      try {
        const user = await prisma.user.create({
          data: {
            name: data.name,
            email: data.email,
            passwordHash,
            registrationSource: "bcn-v2",
            acceptedTermsAt: new Date(),
            acceptedTermsVersion: "bcn-free-2026-10-20",
            minimumAgeConfirmedAt: new Date(),
          },
          select: { id: true },
        });
        await sendEmailVerificationForUser({
          userId: user.id,
          email: data.email,
          firstName: data.name,
        }).catch(() => undefined);
      } catch (e) {
        if (!(e && typeof e === "object" && "code" in e && e.code === "P2002"))
          throw e;
      }
    }
    return json(
      {
        ok: true,
        message:
          "If this address is eligible for a new account, it has been created and a verification email will be sent when delivery is available. Existing members should sign in or reset their password. If you previously started a membership checkout, contact BCN before trying again.",
      },
      201,
    );
  } catch {
    return json(
      { error: "We could not create your account. Please try again later." },
      503,
    );
  }
}
