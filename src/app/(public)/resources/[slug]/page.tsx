import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SITE_CONFIG } from "@/config/site";
import { safeRedirectPath } from "@/lib/auth/utils";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    ...createPageMetadata({
      title: "Resources",
      description: "Business Circle resources are available inside the member dashboard.",
      path: `/resources/${slug}`,
      noIndex: true
    }),
    metadataBase: new URL(SITE_CONFIG.url)
  };
}

export const dynamic = "force-dynamic";

export default async function ResourceDetailPage({ params }: PageProps) {
  const session = await auth();
  const { slug } = await params;

  if (!session?.user) {
    redirect(`/login?from=${encodeURIComponent(safeRedirectPath(`/dashboard/resources/${slug}`))}`);
  }

  await requireUser();

  redirect(`/dashboard/resources/${slug}`);
}
