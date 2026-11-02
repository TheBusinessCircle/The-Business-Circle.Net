"use client";

export default function HucknallHubError({ reset }: { reset: () => void }) {
  return <div className="mx-auto max-w-xl space-y-4 px-5 py-16 text-center"><h1 className="text-3xl">Hucknall Circle Hub</h1><p>We could not load the directory. Please try again.</p><button onClick={reset} className="min-h-11 rounded-full border border-gold/30 px-6">Try again</button></div>;
}
