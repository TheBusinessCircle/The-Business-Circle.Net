import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-4xl font-bold">Page Not Found</h1>
      <p className="text-muted">The page you requested does not exist in The Business Circle Network.</p>
      <Link href="/home" className="rounded-xl border border-border px-5 py-2.5 hover:bg-white/5">
        Return Home
      </Link>
    </main>
  );
}
