import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinCinematicEntry } from "@/components/auth/join-cinematic-entry";
import { createPageMetadata } from "@/lib/seo";

type JoinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type MembershipTier = "FOUNDATION" | "INNER_CIRCLE" | "CORE";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function resolveTier(value: string | undefined): MembershipTier {
  if (value === "CORE") {
    return "CORE";
  }

  if (value === "INNER_CIRCLE") {
    return "INNER_CIRCLE";
  }

  return "FOUNDATION";
}

export const metadata: Metadata = createPageMetadata({
  title: "Join The Business Circle",
  description:
    "Step inside The Business Circle, a premium founder-led business ecosystem for serious owners who want a calmer, stronger room to grow inside.",
  keywords: [
    "join business circle",
    "private business network",
    "founder led business ecosystem",
    "business owner membership",
    "inner circle membership"
  ],
  path: "/join"
});

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams;
  const from = firstValue(params.from);
  const error = firstValue(params.error);
  const mode = firstValue(params.mode);
  const billing = firstValue(params.billing);
  const selectedTier = resolveTier(firstValue(params.tier));
  const inviteCode = (firstValue(params.invite) ?? "").trim().toUpperCase();

  if (mode === "signin") {
    const search = new URLSearchParams();

    if (from) {
      search.set("from", from);
    }

    if (error) {
      search.set("error", error);
    }

    const loginUrl = search.size ? `/login?${search.toString()}` : "/login";
    redirect(loginUrl);
  }

  return (
    <JoinCinematicEntry
      initialSelectedTier={selectedTier}
      from={from}
      inviteCode={inviteCode || undefined}
      error={error}
      billing={billing}
    />
  );
}
