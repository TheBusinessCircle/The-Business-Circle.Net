import Link from "next/link";
import { EyeOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CircleCardNotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-5 py-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-silver/16 bg-card/60 text-silver">
        <EyeOff size={20} />
      </span>
      <h1 className="mt-5 font-display text-4xl text-foreground">Circle Card unavailable</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
        This Circle Card is hidden from public view or the link is no longer available.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link href="/circle-card" className={cn(buttonVariants(), "justify-center")}>
          Explore Circle Card
        </Link>
        <Link
          href="/home"
          className={cn(buttonVariants({ variant: "outline" }), "justify-center")}
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}
