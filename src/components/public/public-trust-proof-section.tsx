import Image from "next/image";
import { TestimonialProofType } from "@prisma/client";
import { BadgeCheck, LockKeyhole, PlayCircle, ShieldCheck } from "lucide-react";
import { TestimonialSection } from "@/components/public/testimonial-section";
import { cn } from "@/lib/utils";

type PublicTrustProofScreenshot = {
  src: string;
  alt: string;
  label?: string;
};

type PublicTrustProofSectionProps = {
  source: "home" | "membership" | "join";
  founderVideoEmbedUrl?: string;
  screenshots?: PublicTrustProofScreenshot[];
  showTestimonials?: boolean;
  className?: string;
};

const TRUST_POINTS = [
  {
    title: "Founder-led standards",
    description:
      "The environment is shaped by Trevor Newton around clearer rooms, useful context and calmer business-owner conversation.",
    icon: ShieldCheck
  },
  {
    title: "Approved proof only",
    description:
      "Member testimonials only appear when they have been approved and permissioned for public display.",
    icon: BadgeCheck
  },
  {
    title: "Private by design",
    description:
      "Member rooms, dashboards, profiles, messages and sensitive business context stay behind access rules.",
    icon: LockKeyhole
  }
] as const;

const SOURCE_COPY = {
  home: {
    eyebrow: "Trust proof",
    title: "Proof should build trust without pretending the room is bigger than it is.",
    intro:
      "BCN is being built in public enough to show direction, but private enough to protect the member environment."
  },
  membership: {
    eyebrow: "Membership trust",
    title: "A private environment should make proof careful, specific and permissioned.",
    intro:
      "Membership is a decision about the standard of the room as much as the feature list. Public proof stays controlled so the private layer stays protected."
  },
  join: {
    eyebrow: "Before checkout",
    title: "The join route stays clear because trust is part of the product.",
    intro:
      "Before payment, owners should understand how proof, privacy and founder-led standards work inside the environment."
  }
} as const;

export function PublicTrustProofSection({
  source,
  founderVideoEmbedUrl,
  screenshots = [],
  showTestimonials = true,
  className
}: PublicTrustProofSectionProps) {
  const copy = SOURCE_COPY[source];

  return (
    <>
      <section
        className={cn("public-section", className)}
        data-testid="public-trust-proof-section"
        data-source={source}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.65fr)] xl:items-start">
          <div className="space-y-5">
            <div className="max-w-4xl space-y-4">
              <p className="premium-kicker">{copy.eyebrow}</p>
              <h2 className="font-display text-4xl leading-tight tracking-tight text-foreground lg:text-5xl">
                {copy.title}
              </h2>
              <p className="text-base leading-relaxed text-white/80 sm:text-lg">
                {copy.intro}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {TRUST_POINTS.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.title}
                    className="rounded-[1.65rem] border border-border/80 bg-card/66 p-5 shadow-panel-soft"
                  >
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/24 bg-gold/10 text-gold">
                      <Icon size={18} />
                    </span>
                    <h3 className="mt-4 font-display text-2xl text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>

            <article className="rounded-[1.75rem] border border-silver/18 bg-background/24 p-5 shadow-panel-soft sm:p-6">
              <p className="premium-kicker">Soft-launch note</p>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                BCN is in its early public build and soft-launch phase. That means public proof is
                deliberately careful: no inflated member-count claims, no invented momentum, and no
                private member detail shown for marketing effect.
              </p>
            </article>
          </div>

          <aside className="space-y-4">
            {founderVideoEmbedUrl ? (
              <div className="overflow-hidden rounded-[1.8rem] border border-gold/22 bg-card/68 shadow-gold-soft">
                <div className="aspect-video">
                  <iframe
                    src={founderVideoEmbedUrl}
                    title="Founder video from The Business Circle Network"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <article className="rounded-[1.8rem] border border-gold/22 bg-gradient-to-br from-gold/10 via-card/78 to-card/70 p-5 shadow-gold-soft sm:p-6">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/24 bg-gold/10 text-gold">
                  <PlayCircle size={19} />
                </span>
                <h3 className="mt-5 font-display text-2xl text-foreground">
                  Founder video ready
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  The section supports a founder video embed when an approved public video is ready.
                  Until then, the page keeps the trust layer grounded in the founder-led standard.
                </p>
              </article>
            )}

            {screenshots.length ? (
              <div className="grid gap-3">
                {screenshots.map((screenshot) => (
                  <figure
                    key={screenshot.src}
                    className="relative overflow-hidden rounded-[1.55rem] border border-border/80 bg-card/64 shadow-panel-soft"
                  >
                    <div className="relative aspect-[16/10]">
                      <Image
                        src={screenshot.src}
                        alt={screenshot.alt}
                        fill
                        sizes="(min-width: 1280px) 26vw, 100vw"
                        className="scale-105 object-cover blur-[3px]"
                      />
                      <div className="absolute inset-0 bg-background/28" />
                    </div>
                    {screenshot.label ? (
                      <figcaption className="px-4 py-3 text-xs uppercase tracking-[0.08em] text-silver">
                        {screenshot.label}
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {showTestimonials ? (
        <TestimonialSection
          proofType={TestimonialProofType.BCN_MEMBER}
          eyebrow="APPROVED MEMBER PROOF"
          title="Approved member feedback from The Business Circle"
          intro="Testimonials appear only when they are specific, approved and permissioned for public display."
          limit={6}
        />
      ) : null}
    </>
  );
}
