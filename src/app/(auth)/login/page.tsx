import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const from = firstValue(params.from);
  const error = firstValue(params.error);
  const code = firstValue(params.code);
  const verified = firstValue(params.verified) === "1";

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
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
            <Link href="/join" className="text-primary hover:underline">
              Create your account
            </Link>{" "}
            to join The Business Circle Network.
          </p>
        </CardContent>
      </Card>

      <LoginForm
        from={from}
        errorCode={error}
        errorDetailCode={code}
        initialNotice={
          verified ? "Email verified successfully. You can sign in now." : undefined
        }
      />
    </div>
  );
}
