import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Join2CinematicEntry } from "@/components/auth/join2-cinematic-entry";
import { createPageMetadata } from "@/lib/seo";

type Join2PageProps = {
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
    "Enter The Business Circle through a cinematic branded portal and choose whether to explore the world or move straight into membership.",
  keywords: [
    "join business circle",
    "business circle portal",
    "business owner membership",
    "founder network membership",
    "private business network"
  ],
  path: "/join2"
});

export default async function Join2Page({ searchParams }: Join2PageProps) {
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
    <Join2CinematicEntry
      initialSelectedTier={selectedTier}
      from={from}
      inviteCode={inviteCode || undefined}
      error={error}
      billing={billing}
    />
  );
}
