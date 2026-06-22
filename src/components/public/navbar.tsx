import { auth } from "@/auth";
import { NavbarClient } from "@/components/public/navbar-client";
import { SITE_CONFIG } from "@/config/site";
import { isCircleCardFreeAccount } from "@/lib/circle-card/permissions";
import { CIRCLE_CARD_DASHBOARD_PATH } from "@/lib/circle-card/routes";

export async function Navbar() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user && !session.user.suspended);
  const isCircleCardOnly = isCircleCardFreeAccount({
    role: session?.user?.role,
    hasActiveSubscription: session?.user?.hasActiveSubscription,
    suspended: session?.user?.suspended
  });
  const publicNavItems = SITE_CONFIG.publicNavigation.map((item) =>
    item.href === "/circle-card" && isAuthenticated
      ? {
          ...item,
          label: "My Circle Card",
          href: CIRCLE_CARD_DASHBOARD_PATH
        }
      : item
  );

  return (
    <NavbarClient
      isAuthenticated={isAuthenticated}
      isCircleCardOnly={isCircleCardOnly}
      navItems={publicNavItems}
      brand={isCircleCardOnly ? "circle-card" : "bcn"}
      dashboardHref={isCircleCardOnly ? CIRCLE_CARD_DASHBOARD_PATH : "/dashboard"}
      dashboardLabel={isCircleCardOnly ? "My Circle Card" : "Member home"}
    />
  );
}
