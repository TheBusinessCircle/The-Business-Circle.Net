import type { SessionContext } from "@/types";
import { getCurrentUser } from "@/lib/auth/session";

export async function getSessionContext(): Promise<SessionContext | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return {
    user
  };
}
