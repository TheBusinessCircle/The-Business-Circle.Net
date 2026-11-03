import type { Metadata } from "next";
import PublicCardPage, { generateMetadata as nativeCardMetadata } from "../[slug]/page";
import { HUCKNALL_DESCRIPTION, HUCKNALL_HUB_CANONICAL } from "@/lib/circle-card/hucknall-content";

export const dynamic = "force-dynamic";
const params = () => Promise.resolve({ slug: "hucknall-circle-hub" });

export async function generateMetadata(): Promise<Metadata> {
  const native = await nativeCardMetadata({ params: params(), searchParams: Promise.resolve({}) });
  return { ...native, title: "Hucknall Circle Hub | Local businesses, heritage & community",
    description: HUCKNALL_DESCRIPTION, alternates: { canonical: HUCKNALL_HUB_CANONICAL },
    openGraph: { ...native.openGraph, title: "Hucknall Circle Hub", description: HUCKNALL_DESCRIPTION, url: HUCKNALL_HUB_CANONICAL } };
}

export default async function HubPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return PublicCardPage({ params: params(), searchParams });
}
