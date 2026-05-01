import { auth } from "@/auth";
import { safeRedirectPath } from "@/lib/auth/utils";
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
  "/member/bcn-updates",
  "/member/growth-architect",
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

export default auth((req) => {
  const httpsRedirect = maybeRedirectToHttps(req);
  if (httpsRedirect) {
    return httpsRedirect;
  }

  const { nextUrl } = req;
  const session = req.auth;
  const pathname = nextUrl.pathname;
  const requestedPath = `${pathname}${nextUrl.search ?? ""}`;

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isMemberRoute = startsWithPath(pathname, MEMBER_ROUTE_PREFIXES);
  const isAdminRoute = pathname === ADMIN_ROUTE_PREFIX || pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/`);
  const isInnerCircleRoute = startsWithPath(pathname, INNER_CIRCLE_ROUTE_PREFIXES);
  const isProtectedRoute = isMemberRoute || isAdminRoute || isInnerCircleRoute;
  const isMemberAreaRoute = isMemberRoute || isInnerCircleRoute;
  const isVerifiedRoute = startsWithPath(pathname, VERIFIED_MEMBER_ROUTE_PREFIXES);
  const isJoinRoute =
    pathname === "/join" || pathname === "/join-desktop" || pathname === "/join-mobile";

  if (isAuthRoute && session?.user && !session.user.suspended) {
    if (isJoinRoute) {
      return NextResponse.next();
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

  if (isMemberAreaRoute && session.user.role !== "ADMIN" && !session.user.hasActiveSubscription) {
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

  return NextResponse.next();
});

export const config = {
  runtime: "nodejs",
  // Admin-only routes are enforced here; member route groups also call requireUser
  // in their server layout so protection remains explicit if routing changes later.
  matcher: [
    "/login",
    "/register",
    "/join",
    "/join-desktop",
    "/join-mobile",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/dashboard/:path*",
    "/blueprint",
    "/blueprint/:path*",
    "/directory/:path*",
    "/community/:path*",
    "/member/bcn-updates",
    "/member/bcn-updates/:path*",
    "/member/growth-architect",
    "/member/growth-architect/:path*",
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
