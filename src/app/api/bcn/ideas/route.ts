import { requireApiUser } from "@/lib/auth/api";
import { boundedJson, json, requestGuard } from "@/lib/bcn-v2/http";
import { ideaCommand } from "@/lib/bcn-v2/ideas";
import { executeIdeaCommand, IdeaError } from "@/server/bcn-v2/ideas";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const blocked = await requestGuard(request, "ideas", 40);
  if (blocked) return blocked;
  const auth = await requireApiUser({
    allowUnentitled: true,
    requireVerifiedEmail: true,
  });
  if ("response" in auth) return auth.response;
  try {
    const command = ideaCommand.safeParse(await boundedJson(request));
    if (!command.success)
      return json(
        {
          error:
            command.error.issues[0]?.message || "Check the request fields.",
        },
        400,
      );
    return json(await executeIdeaCommand(command.data, auth.user.id));
  } catch (error) {
    if (error instanceof IdeaError) return json({ error: error.message }, 400);
    return json(
      {
        error:
          "Unable to save this change. It may have changed in another session. Refresh and try again.",
      },
      409,
    );
  }
}
