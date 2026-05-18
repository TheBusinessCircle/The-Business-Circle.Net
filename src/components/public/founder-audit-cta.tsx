import { buttonVariants } from "@/components/ui/button";
import { TrackedPublicCtaLink } from "@/components/public/tracked-public-cta-link";
import { cn } from "@/lib/utils";

type PublicCtaSource =
  | "home"
  | "about"
  | "membership"
  | "join"
  | "audit"
  | "insights"
  | "contact"
  | "intent"
  | "navigation"
  | "footer"
  | "unknown";

type FounderAuditCtaProps = {
  source: PublicCtaSource;
  topic?: string;
  title?: string;
  description?: string;
  auditLabel?: string;
  membershipHref?: string;
  membershipLabel?: string;
  showMembershipLink?: boolean;
  frame?: "section" | "panel";
  className?: string;
  testId?: string;
};

export function buildFounderAuditHref({
  source,
  topic
}: {
  source: PublicCtaSource;
  topic?: string;
}) {
  const params = new URLSearchParams({ source });

  if (topic) {
    params.set("topic", topic);
  }

  return `/audit?${params.toString()}`;
}

export function FounderAuditCta({
  source,
  topic,
  title = "Use the Founder Audit before you choose the room.",
  description = "A short clarity checkpoint gives owners a calmer way to understand fit before moving toward membership.",
  auditLabel = "Run the Founder Audit",
  membershipHref = "/membership",
  membershipLabel = "Review membership",
  showMembershipLink = true,
  frame = "section",
  className,
  testId = "founder-audit-cta"
}: FounderAuditCtaProps) {
  const auditHref = buildFounderAuditHref({ source, topic });
  const isPanel = frame === "panel";

  return (
    <section
      className={cn(isPanel ? "" : "public-section-tight", className)}
      data-testid={testId}
      data-topic={topic}
    >
      <div className="rounded-[1.9rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/76 to-card/68 p-5 shadow-gold-soft sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="premium-kicker">Founder Audit</p>
            <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-muted sm:text-base">
              {description}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedPublicCtaLink
              href={auditHref}
              label={auditLabel}
              source={source}
              showArrow
              className={cn(buttonVariants({ size: "lg" }), "group w-full sm:w-auto")}
            />
            {showMembershipLink ? (
              <TrackedPublicCtaLink
                href={membershipHref}
                label={membershipLabel}
                source={source}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full sm:w-auto"
                )}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
