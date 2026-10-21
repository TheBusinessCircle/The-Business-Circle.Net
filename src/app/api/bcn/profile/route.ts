import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/bcn-v2/validation";
import { boundedJson, json, requestGuard } from "@/lib/bcn-v2/http";
export async function POST(request: Request) {
  const blocked = await requestGuard(request, "profile", 25);
  if (blocked) return blocked;
  try {
    const session = await auth();
    if (!session?.user) return json({ error: "Sign in first." }, 401);
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { suspended: true },
    });
    if (!user || user.suspended)
      return json({ error: "Account unavailable." }, 403);
    const parsed = profileSchema.safeParse(await boundedJson(request));
    if (!parsed.success)
      return json(
        {
          error:
            "Check the profile fields. Describe your business in at least 20 characters and use an HTTPS website address.",
        },
        400,
      );
    const { publicConsent, ...data } = parsed.data;
    const values = {
      ...data,
      publicConsentAt: publicConsent ? new Date() : null,
      approved: false,
    };
    await prisma.bcnBusinessProfile.upsert({
      where: { userId: session.user.id },
      create: { ...values, userId: session.user.id },
      update: values,
    });
    return json({
      ok: true,
      message: publicConsent
        ? "Profile saved for moderation. It will appear after approval and email verification."
        : "Profile saved privately. It is not listed publicly.",
    });
  } catch {
    return json({ error: "Unable to save your profile." }, 503);
  }
}
