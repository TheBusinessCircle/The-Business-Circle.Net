import { BcnHome } from "@/components/bcn-v2/home";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { shouldUseMobileJoin } from "@/lib/join/routing";

export const dynamic = "force-dynamic";

export default async function SocialEntryPage() {
  if (isBcnV2Enabled()) return <BcnHome/>;
  const session = await auth();

  if (session?.user && !session.user.suspended) {
    trackAnalyticsEvent(ANALYTICS_EVENTS.rootEntry, {
      authenticated: true,
      destination: "/dashboard"
    });
    redirect("/dashboard");
  }

  const headersList = await headers();
  const destination = shouldUseMobileJoin(headersList) ? "/join-mobile" : "/join-desktop";

  trackAnalyticsEvent(ANALYTICS_EVENTS.rootEntry, {
    authenticated: false,
    destination
  });

  redirect(destination);
}
