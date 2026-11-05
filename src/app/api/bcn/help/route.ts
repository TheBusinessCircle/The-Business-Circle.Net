import { prisma } from "@/lib/prisma";
import { helpSchema } from "@/lib/bcn-v2/validation";
import { boundedJson, json, requestGuard } from "@/lib/bcn-v2/http";
export async function POST(request: Request) {
  const blocked = await requestGuard(request, "help", 5);
  if (blocked) return blocked;
  try {
    const parsed = helpSchema.safeParse(await boundedJson(request));
    if (!parsed.success)
      return json(
        {
          error:
            "Check your details, write at least 20 characters about the help you need and confirm permission for BCN to review it.",
        },
        400,
      );
    const { name, email, business, category, summary } = parsed.data;
    const data = { name, email, business, category, summary };
    const entry = await prisma.bcnHelpRequest.create({
      data: {
        ...data,
        audit: { create: { action: "received", actorId: "requester" } },
      },
      select: { id: true },
    });
    return json({ ok: true, reference: entry.id }, 201);
  } catch {
    return json(
      { error: "We could not save your request. Please try again." },
      503,
    );
  }
}
