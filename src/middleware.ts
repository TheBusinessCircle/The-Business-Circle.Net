import { isBcnV2Enabled, isBcnHiddenProductPath } from "@/lib/bcn-v2/flags";
import { auth } from "@/auth";
import { safeRedirectPath } from "@/lib/auth/utils";
import {
  CIRCLE_CARD_DASHBOARD_PATH,
  isCircleCardFirstAccount,
  isCircleCardDashboardPath,
  isCircleCardRegistrationSource
} from "@/lib/circle-card/routes";
import { membershipAccessBillingQuery } from "@/lib/membership/access";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = [
  "/login",
  "/register",
  "/join",
  "/join-desktop",
  "/join-mobile",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password"
];
const MEMBER_ROUTE_PREFIXES = [
  "/blueprint",
  "/dashboard",
  "/directory",
  "/community",
  "/core",
  "/member/bcn-updates",
  "/member/growth-architect",
  "/member/contact",
  "/messages",
  "/profile",
  "/events",
  "/calls",
  "/wins"
];
const VERIFIED_MEMBER_ROUTE_PREFIXES = ["/community", "/member/bcn-updates", "/directory"];
const ADMIN_ROUTE_PREFIX = "/admin";
const INNER_CIRCLE_ROUTE_PREFIXES = ["/inner-circle"];

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local");
}

function maybeRedirectToHttps(req: NextRequest) {
  if (process.env.NODE_ENV !== "production" || isLocalHostname(req.nextUrl.hostname)) {
    return null;
  }

  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const protocol = forwardedProto || req.nextUrl.protocol.replace(":", "");

  if (protocol !== "http") {
    return null;
  }

  const secureUrl = req.nextUrl.clone();
  secureUrl.protocol = "https";
  return NextResponse.redirect(secureUrl, 308);
}

function startsWithPath(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function toLoginRedirect(requestUrl: URL, fromPath: string, error?: string) {
  const loginUrl = new URL("/login", requestUrl);
  loginUrl.searchParams.set("from", safeRedirectPath(fromPath));

  if (error) {
    loginUrl.searchParams.set("error", error);
  }

  return loginUrl;
}

function nextWithCurrentPath(req: NextRequest, pathname: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-bcn-pathname", pathname);
  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export default auth((req) => {
  const httpsRedirect = maybeRedirectToHttps(req);
  if (httpsRedirect) {
    return httpsRedirect;
  }

  const { nextUrl } = req;
  if (nextUrl.pathname === "/opengraph-image") {
    const shareImageUrl = nextUrl.clone();
    shareImageUrl.pathname = "/social-share.png";
    shareImageUrl.search = "";
    return NextResponse.redirect(shareImageUrl, 308);
  }

  if (isBcnV2Enabled()) {
    const path = nextUrl.pathname;
    if (path === "/llms.txt") return new NextResponse("# The Business Circle\n\nReal help for real business owners. Free UK business tools, practical guidance and permission-based connections.\n\nTools: https://thebusinesscircle.net/tools\nGuides: https://thebusinesscircle.net/advice\nStarting a business: https://thebusinesscircle.net/start\nPractical help for ideas: https://thebusinesscircle.net/ideas\nHelp: https://thebusinesscircle.net/find-help\nCommercial disclosures: https://thebusinesscircle.net/how-we-work\n\nNo ranking or AI citation guarantee is made.\n",{headers:{"Content-Type":"text/plain; charset=utf-8"}});
    if (path === "/circle-card.webmanifest" || isBcnHiddenProductPath(path) || /^\/api\/(circle-card|stripe\/circle-card)(\/|$)/.test(path)) {
      return new NextResponse("This page is unavailable.", {status:404, headers:{"X-Robots-Tag":"noindex", "Content-Type":"text/plain; charset=utf-8"}});
    }
    const redirects: Record<string,string> = {"/home":"/", "/join":"/register", "/join-mobile":"/register", "/join-desktop":"/register", "/sign-up":"/register", "/early-access":"/register", "/audit":"/tools/website-health-checklist", "/resources":"/advice", "/directory":"/business-directory"};
    if (redirects[path]) return NextResponse.redirect(new URL(redirects[path],nextUrl),307);
    // Ignore product return paths on BCN sign-in, retaining the legitimate BCN account.
    if (["/login","/register","/sign-in"].includes(path) && (nextUrl.searchParams.get("source") === "circle-card" || ["from","returnTo"].some(k=>isBcnHiddenProductPath(nextUrl.searchParams.get(k)||"")))) {
      return NextResponse.redirect(new URL(path==="/sign-in"?"/login":path,nextUrl));
    }
    if (["/dashboard","/profile","/messages"].includes(path) || path.startsWith("/messages/") || path.startsWith("/calls/")) {
      if (!req.auth?.user || req.auth.user.suspended) return NextResponse.redirect(toLoginRedirect(nextUrl,`${path}${nextUrl.search}`));
      return nextWithCurrentPath(req,path);
    }
    if (AUTH_ROUTES.includes(path)) {
      if(req.auth?.user && !req.auth.user.suspended) return NextResponse.redirect(new URL("/dashboard",nextUrl));
      return nextWithCurrentPath(req,path);
    }
    // Legacy member areas keep their existing entitlement checks, but never route to another product.
    if (!path.startsWith("/api") && !path.startsWith("/admin") && startsWithPath(path, MEMBER_ROUTE_PREFIXES) && req.auth?.user && !req.auth.user.hasActiveSubscription && req.auth.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard",nextUrl));
    }
  }

  const session = req.auth;
  const pathname = nextUrl.pathname;
  const requestedPath = `${pathname}${nextUrl.search ?? ""}`;

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isMemberRoute = startsWithPath(pathname, MEMBER_ROUTE_PREFIXES);
  const isCircleCardRoute = isCircleCardDashboardPath(pathname);
  const isAdminRoute = pathname === ADMIN_ROUTE_PREFIX || pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/`);
  const isInnerCircleRoute = startsWithPath(pathname, INNER_CIRCLE_ROUTE_PREFIXES);
  const isProtectedRoute = isMemberRoute || isAdminRoute || isInnerCircleRoute;
  const isMemberAreaRoute = isMemberRoute || isInnerCircleRoute;
  const isVerifiedRoute = startsWithPath(pathname, VERIFIED_MEMBER_ROUTE_PREFIXES);
  const isJoinRoute =
    pathname === "/join" || pathname === "/join-desktop" || pathname === "/join-mobile";
  const authFromPath = safeRedirectPath(nextUrl.searchParams.get("from"), "");
  const shouldPreferCircleCard = !isBcnV2Enabled() && isCircleCardFirstAccount(session?.user);

  if (isAuthRoute && session?.user && !session.user.suspended) {
    if (isJoinRoute) {
      return nextWithCurrentPath(req, pathname);
    }

    if (
      isCircleCardRegistrationSource(nextUrl.searchParams.get("source")) ||
      isCircleCardDashboardPath(authFromPath) ||
      authFromPath.startsWith("/card/")
    ) {
      return NextResponse.redirect(new URL(authFromPath || CIRCLE_CARD_DASHBOARD_PATH, nextUrl));
    }

    if (
      shouldPreferCircleCard &&
      session.user.role !== "ADMIN" &&
      !session.user.hasActiveSubscription
    ) {
      return NextResponse.redirect(new URL(CIRCLE_CARD_DASHBOARD_PATH, nextUrl));
    }

    if (session.user.role !== "ADMIN" && !session.user.hasActiveSubscription) {
      return NextResponse.redirect(
        new URL(
          `/membership?billing=${membershipAccessBillingQuery(
            session.user.subscriptionStatus ?? null
          )}`,
          nextUrl
        )
      );
    }

    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (!session?.user) {
    return NextResponse.redirect(toLoginRedirect(nextUrl, requestedPath));
  }

  if (session.user.suspended) {
    return NextResponse.redirect(toLoginRedirect(nextUrl, pathname, "suspended"));
  }

  if (
    isMemberAreaRoute &&
    !isCircleCardRoute &&
    session.user.role !== "ADMIN" &&
    !session.user.hasActiveSubscription
  ) {
    if (shouldPreferCircleCard) {
      return NextResponse.redirect(new URL(CIRCLE_CARD_DASHBOARD_PATH, nextUrl));
    }

    return NextResponse.redirect(
      new URL(
        `/membership?billing=${membershipAccessBillingQuery(
          session.user.subscriptionStatus ?? null
        )}`,
        nextUrl
      )
    );
  }

  if (isVerifiedRoute && session.user.role !== "ADMIN" && !session.user.emailVerified) {
    return NextResponse.redirect(new URL("/dashboard?error=verify-email", nextUrl));
  }

  if (isAdminRoute && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard?error=forbidden", nextUrl));
  }

  return nextWithCurrentPath(req, pathname);
});

export const config = {
  runtime: "nodejs",
  // Admin-only routes are enforced here; member route groups also call requireUser
  // in their server layout so protection remains explicit if routing changes later.
  matcher: [
    "/((?!_next/static|_next/image|api/|.*\\.[^/]+$).*)",
    "/circle-card.webmanifest",
    "/llms.txt",
    "/api/circle-card/:path*",
    "/api/stripe/circle-card/:path*",
    "/login",
    "/register",
    "/join",
    "/join-desktop",
    "/join-mobile",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/opengraph-image",
    "/dashboard/:path*",
    "/blueprint",
    "/blueprint/:path*",
    "/directory/:path*",
    "/community/:path*",
    "/core",
    "/core/:path*",
    "/member/bcn-updates",
    "/member/bcn-updates/:path*",
    "/member/growth-architect",
    "/member/growth-architect/:path*",
    "/member/contact",
    "/member/contact/:path*",
    "/messages",
    "/messages/:path*",
    "/profile/:path*",
    "/events/:path*",
    "/calls/:path*",
    "/wins",
    "/wins/:path*",
    "/inner-circle/:path*",
    "/admin",
    "/admin/:path*"
  ]
};
