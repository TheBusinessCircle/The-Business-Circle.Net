import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { shouldUseMobileJoin } from "@/lib/join/routing";

export const dynamic = "force-dynamic";

export default async function SocialEntryPage() {
  const headersList = await headers();

  redirect(shouldUseMobileJoin(headersList) ? "/join-mobile" : "/join-desktop");
}
