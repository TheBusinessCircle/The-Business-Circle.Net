import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/auth/utils";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Sign In Redirect",
  description: "Redirecting to the Business Circle sign in page.",
  path: "/sign-in",
  noIndex: true
});

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const from = safeRedirectPath(firstValue(params.from), "");

  if (!from) {
    redirect("/login");
  }

  const search = new URLSearchParams({ from });
  redirect(`/login?${search.toString()}`);
}
