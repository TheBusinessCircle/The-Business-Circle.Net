import { cn } from "@/lib/utils";

export function CircleCardLogoMark({ className, alt = "" }: { className?: string; alt?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/45 bg-[#061126] shadow-[0_0_30px_hsl(var(--cc-theme-primary-hsl)/0.24)]",
        className
      )}
    >
      <img src="/branding/circle-card-logo.png" alt={alt} className="h-full w-full object-cover" />
    </span>
  );
}
