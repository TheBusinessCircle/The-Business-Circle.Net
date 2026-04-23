import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseLoginSearchParams } from "@/lib/auth/login-state";
import { withFromParam } from "@/lib/auth/utils";
import { createPageMetadata } from "@/lib/seo";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Sign In",
  description:
    "Sign in to The Business Circle Network to access your dashboard, resources, and community channels.",
  path: "/login",
  noIndex: true
});

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const { from, errorCode, errorDetailCode, initialNotice } = parseLoginSearchParams(params);

  return (
    <div className="grid w-full min-w-0 gap-6 px-4 py-8 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:px-8 2xl:px-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-3xl">
            Rejoin the founder network built for focused business growth
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted">
          <p>Access your dashboard, resource vault, channel conversations, and member collaborations.</p>
          <p>
            New here?{" "}
            <Link href={withFromParam("/membership", from)} className="text-primary hover:underline">
              Start the join flow
            </Link>{" "}
            to join The Business Circle Network.
          </p>
        </CardContent>
      </Card>

      <LoginForm
        from={from}
        errorCode={errorCode}
        errorDetailCode={errorDetailCode}
        initialNotice={initialNotice}
      />
    </div>
  );
}
