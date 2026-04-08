import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Register Redirect",
  description: "Redirecting to the Business Circle join page.",
  path: "/register",
  noIndex: true
});

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const from = firstValue(params.from);
  const tier = firstValue(params.tier);
  const error = firstValue(params.error);
  const search = new URLSearchParams();

  if (from) {
    search.set("from", from);
  }

  if (tier === "INNER_CIRCLE" || tier === "FOUNDATION" || tier === "CORE") {
    search.set("tier", tier);
  }

  if (error) {
    search.set("error", error);
  }

  const url = search.size ? `/join?${search.toString()}` : "/join";
  redirect(url);
}

