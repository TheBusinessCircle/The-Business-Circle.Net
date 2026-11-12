import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, LockKeyhole, Wrench } from "lucide-react";
import { CircleCardMyToolsCatalog } from "@/components/circle-card/circle-card-my-tools-catalog";
import { requireCircleCardUser } from "@/lib/session";
import { loadCircleCardAccessForUser } from "@/server/circle-card";
import { buildCircleCardProHref } from "@/lib/circle-card/pro-intent";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My Tools | Circle Card",
  description: "Creator and business tools for Circle Card Pro.",
  robots: { index: false, follow: false }
};

export default async function CircleCardMyToolsPage() {
  const session = await requireCircleCardUser();
  if (!session.user.id) redirect("/login?from=/dashboard/circle-card/tools");
  const access = await loadCircleCardAccessForUser(session.user.id);
  const hasPro = access.hasProAccess;
  const upgradeHref = buildCircleCardProHref();

  return (
    <main className="page-shell pb-16 pt-6 sm:pt-9">
      <header className="mb-8 rounded-3xl border border-silver/20 bg-card/75 p-5 sm:p-8">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
          <Wrench size={18} aria-hidden /> MY TOOLS <span className="rounded-full border border-primary/40 px-2 py-0.5 text-xs">PRO</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need, in your Circle.</h1>
        <p className="mt-3 max-w-2xl text-muted">Choose from Creator and Business tools. Both collections are available to every Pro member, whichever type of Circle Card you use. A Business tool may require a Business Card to configure.</p>
        {!hasPro ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-background/55 p-4">
            <LockKeyhole size={20} aria-hidden />
            <p className="flex-1 text-sm">Your tools are ready to explore. Upgrade to Pro to unlock them.</p>
            <Link href={upgradeHref} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Unlock Pro tools</Link>
          </div>
        ) : (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-primary"><Crown size={17} aria-hidden /> Your Pro tools are unlocked.</p>
        )}
      </header>
      <CircleCardMyToolsCatalog hasPro={hasPro} upgradeHref={upgradeHref} />
      <p className="text-sm text-muted">The wallet, scanning and normal contact sharing remain accessible from Connect Hub. Secure file-sharing and claim invitation automation are being reviewed separately before activation.</p>
      <Link className="mt-4 inline-block text-sm font-semibold text-primary underline" href="/dashboard/circle-card">Back to Circle Card</Link>
    </main>
  );
}
