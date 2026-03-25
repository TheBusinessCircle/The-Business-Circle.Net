import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  image?: string | null;
  className?: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Avatar({ name, image, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative h-10 w-10 overflow-hidden rounded-full border border-silver/25 bg-accent shadow-inner-surface ring-1 ring-white/5",
        className
      )}
    >
      {image ? (
        <img src={image} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center text-xs font-semibold tracking-wide text-foreground">
          {initials(name || "Member")}
        </span>
      )}
    </div>
  );
}

