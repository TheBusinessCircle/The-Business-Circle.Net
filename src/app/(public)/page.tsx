import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { shouldUseMobileJoin } from "@/lib/join/routing";

export const dynamic = "force-dynamic";

export default async function SocialEntryPage() {
  const session = await auth();

  if (session?.user && !session.user.suspended) {
    redirect("/dashboard");
  }

  const headersList = await headers();

  redirect(shouldUseMobileJoin(headersList) ? "/join-mobile" : "/join-desktop");
}
