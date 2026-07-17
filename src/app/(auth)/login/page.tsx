import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseLoginSearchParams } from "@/lib/auth/login-state";
import { withFromParam } from "@/lib/auth/utils";
import { createPageMetadata } from "@/lib/seo";
import { getRuntimeBrand } from "@/config/runtime-brand";
import {
  getCircleCardRoutes,
  isCircleCardDashboardPath,
  resolveCircleCardAuthReturnPath
} from "@/lib/circle-card/routes";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateMetadata(): Metadata {
  if (getRuntimeBrand().key === "circle-card") {
    return {
      title: "Sign In to Circle Card",
      description: "Sign in to your Circle Card account.",
      robots: { index: false, follow: false }
    };
  }

  return createPageMetadata({
    title: "Sign In",
    description:
      "Sign in to access your Circle Card or The Business Circle Network workspace.",
    path: "/login",
    noIndex: true
  });
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const { from, errorCode, errorDetailCode, initialNotice } = parseLoginSearchParams(params);
  const runtimeBrand = getRuntimeBrand().key;
  const circleCardRuntime = runtimeBrand === "circle-card";
  const circleCardRoutes = getCircleCardRoutes(runtimeBrand);
  const resolvedFrom = circleCardRuntime
    ? resolveCircleCardAuthReturnPath(from, runtimeBrand, circleCardRoutes.dashboard)
    : from;
  const isCircleCardLogin =
    circleCardRuntime ||
    (resolvedFrom ? isCircleCardDashboardPath(resolvedFrom) : false) ||
    resolvedFrom?.startsWith("/card/") === true;
  const circleCardRegisterHref = resolvedFrom
    ? `/register?source=circle-card&returnTo=${encodeURIComponent(resolvedFrom)}`
    : "/register?source=circle-card";
  const verificationNotice = circleCardRuntime
    ? initialNotice
      ? "Circle Card email verified successfully. You can sign in now."
      : errorCode === "invalid-verification"
        ? "This Circle Card verification link has already been used or has expired. Try signing in or request a new verification email."
        : undefined
    : initialNotice;

  return (
    <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-3xl">
            {isCircleCardLogin
              ? "Open your Circle Card workspace"
              : "Rejoin the founder network built for focused business growth"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted">
          {isCircleCardLogin ? (
            <>
              <p>
                Continue to your public card, Circle Wallet, QR sharing, analytics, and saved
                relationship tools.
              </p>
              <p>
                New here?{" "}
                <Link href={circleCardRegisterHref} className="text-primary hover:underline">
                  Create a free Circle Card
                </Link>
                .
              </p>
            </>
          ) : (
            <>
              <p>Access your dashboard, resource vault, channel conversations, and member collaborations.</p>
              <p>
                New here?{" "}
                <Link href={withFromParam("/membership", from)} className="text-primary hover:underline">
                  Start the join flow
                </Link>{" "}
                to join The Business Circle Network.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <LoginForm
        from={resolvedFrom}
        errorCode={verificationNotice ? undefined : errorCode}
        errorDetailCode={errorDetailCode}
        initialNotice={verificationNotice}
        mode={isCircleCardLogin ? "circle-card" : "default"}
      />
    </div>
  );
}
