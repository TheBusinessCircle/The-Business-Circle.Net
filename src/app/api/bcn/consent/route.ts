import { z } from "zod";
import { grantSharingConsent, WorkflowError } from "@/server/bcn-v2/help";
import { boundedJson, json, requestGuard } from "@/lib/bcn-v2/http";
export async function POST(request: Request) {
  const blocked = await requestGuard(request, "consent", 12);
  if (blocked) return blocked;
  try {
    const data = z
      .object({
        token: z.string().regex(/^[a-f0-9]{64}$/),
        decision: z.enum(["agree", "decline"]),
      })
      .parse(await boundedJson(request));
    return json(await grantSharingConsent(data.token, data.decision));
  } catch (e) {
    return json(
      {
        error:
          e instanceof WorkflowError
            ? e.message
            : "Unable to record permission.",
      },
      400,
    );
  }
}
