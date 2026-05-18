import Link from "next/link";
import { BadgeCheck, LockKeyhole, ShieldCheck } from "lucide-react";
import { COMPANY_CONFIG, formatCompanyTrustLine } from "@/config/company";
import { FounderAuditCta } from "@/components/public/founder-audit-cta";

type AnswerBlockProps = {
  question: string;
  answer: string;
  label?: string;
  id?: string;
};

type FitListSectionProps = {
  forItems: readonly string[];
  notForItems: readonly string[];
};

const TRUST_ITEMS = [
  {
    title: "Founder-led platform",
    description:
      "The room is shaped by Trevor Newton, Growth Architect and founder of The Business Circle Network."
  },
  {
    title: "UK limited company",
    description: `${COMPANY_CONFIG.displayLegalName} is ${COMPANY_CONFIG.registration}.`
  },
  {
    title: "Clear rules and standards",
    description:
      "The BCN Rules set expectations for respect, privacy, contribution, messaging and conduct inside the room."
  },
  {
    title: "Member privacy",
    description:
      "Private rooms, dashboards, messages, admin areas and subscription details are not public marketing content."
  },
  {
    title: "Stripe-secured payments",
    description:
      "Membership checkout and billing are handled through Stripe before member access opens."
  },
  {
    title: "Legal pages available",
    description:
      "Privacy, terms, cookie policy, data protection and rules pages are available from the public footer."
  }
] as const;

const HOW_BCN_WORKS = [
  {
    title: "Step inside",
    description:
      "Create your account through the membership route and enter a private business owner environment built around standards."
  },
  {
    title: "Build context",
    description:
      "Shape your profile, join the right rooms, explore useful resources and start better conversations with other business owners."
  },
  {
    title: "Create movement",
    description:
      "Use the network to find clearer thinking, trusted relationships, useful introductions and practical business momentum."
  }
] as const;

export function AnswerBlock({
  question,
  answer,
  label = "Direct answer",
  id
}: AnswerBlockProps) {
  return (
    <section id={id} className="public-section-tight">
      <article className="rounded-[1.85rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/76 to-card/68 p-5 shadow-gold-soft sm:p-6 lg:p-7">
        <p className="premium-kicker">{label}</p>
        <h2 className="mt-4 max-w-4xl font-display text-3xl leading-tight text-foreground sm:text-4xl">
          {question}
        </h2>
        <p className="mt-4 max-w-4xl text-base leading-relaxed text-white/82 sm:text-lg">
          {answer}
        </p>
      </article>
    </section>
  );
}

export function OutcomeStrip({ items }: { items: readonly string[] }) {
  return (
    <section className="public-section-tight" aria-label="Business Circle outcomes">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-[1.25rem] border border-border/80 bg-card/70 px-4 py-4 text-sm font-medium text-foreground shadow-panel-soft"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

export function FitListSection({ forItems, notForItems }: FitListSectionProps) {
  return (
    <section className="public-section">
      <div className="max-w-4xl space-y-4">
        <p className="premium-kicker">Fit matters</p>
        <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
          The room works best when the standard is clear.
        </h2>
        <p className="text-base leading-relaxed text-muted sm:text-lg">
          BCN is selective in tone, not cold in spirit. The aim is to protect a calm room where
          serious owners can speak with context and build trust properly.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-[1.8rem] border border-gold/24 bg-card/70 p-5 shadow-panel-soft sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Who this is for</p>
          <div className="mt-5 grid gap-3">
            {forItems.map((item) => (
              <div
                key={item}
                className="rounded-[1.3rem] border border-border/80 bg-background/22 px-4 py-3 text-sm text-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[1.8rem] border border-border/80 bg-card/66 p-5 shadow-panel sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">Who this is not for</p>
          <div className="mt-5 grid gap-3">
            {notForItems.map((item) => (
              <div
                key={item}
                className="rounded-[1.3rem] border border-border/80 bg-background/22 px-4 py-3 text-sm text-muted"
              >
                {item}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export function TwoPathCta({
  source,
  title = "Two clear ways to step closer.",
  description = "Run the Founder Audit if you want a calmer starting point. Review membership directly when the room already feels clear.",
  topic
}: {
  source: "home" | "about" | "membership" | "audit" | "insights" | "contact" | "intent";
  title?: string;
  description?: string;
  topic?: string;
}) {
  return (
    <FounderAuditCta
      source={source}
      topic={topic}
      title={title}
      description={description}
      membershipLabel="Review membership"
    />
  );
}

export function TrustTrailSection() {
  return (
    <section className="public-section">
      <div className="max-w-4xl space-y-4">
        <p className="premium-kicker">Why trust the room?</p>
        <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
          A private business environment has to protect the quality of the room.
        </h2>
        <p className="text-base leading-relaxed text-muted sm:text-lg">
          The Business Circle Network is built with clear standards, member-only access and
          founder-led direction. The goal is not to create another noisy platform. The goal is to
          protect the room so business owners can have more useful conversations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TRUST_ITEMS.map((item) => (
          <article
            key={item.title}
            className="rounded-[1.55rem] border border-border/80 bg-card/66 p-5 shadow-panel-soft"
          >
            <ShieldCheck size={18} className="text-gold" />
            <h3 className="mt-4 font-display text-2xl text-foreground">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
          </article>
        ))}
      </div>

      <article className="rounded-[1.8rem] border border-gold/24 bg-gradient-to-br from-gold/10 via-card/76 to-card/68 p-5 shadow-gold-soft sm:p-6">
        <p className="premium-kicker">Founder story</p>
        <h3 className="mt-4 font-display text-3xl text-foreground">
          Trevor Newton is building BCN as a calmer room for owners carrying real decisions.
        </h3>
        <p className="mt-4 max-w-4xl text-base leading-relaxed text-muted sm:text-lg">
          Trevor Newton, Growth Architect and founder of The Business Circle Network, is building a
          private business environment for owners who want better thinking, useful connection and
          trusted rooms. It is deliberately grounded: better people around the work, clearer
          conversations, and less noise around serious business decisions.
        </p>
        <p className="mt-4 text-xs leading-relaxed text-silver">{formatCompanyTrustLine()}</p>
      </article>
    </section>
  );
}

export function HowBcnWorksSection() {
  return (
    <section className="public-section">
      <div className="max-w-4xl space-y-4">
        <p className="premium-kicker">How BCN works</p>
        <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
          Three simple steps into a better business room.
        </h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {HOW_BCN_WORKS.map((item, index) => (
          <article
            key={item.title}
            className="rounded-[1.7rem] border border-border/80 bg-card/66 p-5 shadow-panel-soft sm:p-6"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/24 bg-gold/10 text-sm text-gold">
              {index + 1}
            </span>
            <h3 className="mt-5 font-display text-2xl text-foreground">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MovementInsideRoomSection() {
  return (
    <section className="public-section-tight">
      <article className="rounded-[1.85rem] border border-border/80 bg-card/64 p-5 shadow-panel sm:p-6">
        <div className="max-w-4xl space-y-4">
          <p className="premium-kicker">Early movement</p>
          <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            The soft launch is open while the early room is being shaped.
          </h2>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            Conversations are starting, early members are helping shape the standard, founder-led
            resources are being added and private rooms continue to develop. BCN should feel alive
            without pretending to be bigger than it is.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            "The soft launch is open",
            "Early owners are stepping inside",
            "Founder-led resources are being added",
            "Private rooms are being shaped"
          ].map((item) => (
            <div
              key={item}
              className="rounded-[1.2rem] border border-white/10 bg-background/24 px-4 py-3 text-sm text-foreground"
            >
              {item}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export function NaturalInternalLinks() {
  return (
    <section className="public-section-tight">
      <div className="rounded-[1.6rem] border border-border/80 bg-background/24 p-5 text-sm leading-relaxed text-muted">
        <BadgeCheck size={16} className="mb-3 text-gold" />
        <p>
          New here? Start with{" "}
          <Link href="/about" className="text-foreground underline decoration-gold/40 underline-offset-4">
            why BCN exists
          </Link>
          , compare{" "}
          <Link href="/membership" className="text-foreground underline decoration-gold/40 underline-offset-4">
            the membership rooms
          </Link>
          , run{" "}
          <Link href="/audit" className="text-foreground underline decoration-gold/40 underline-offset-4">
            the Founder Audit
          </Link>
          , or read{" "}
          <Link href="/insights" className="text-foreground underline decoration-gold/40 underline-offset-4">
            BCN Intelligence
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

export function PrivacyBoundaryNote() {
  return (
    <section className="public-section-tight">
      <article className="rounded-[1.7rem] border border-border/80 bg-card/62 p-5 shadow-panel-soft sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/24 bg-gold/10 text-gold">
            <LockKeyhole size={18} />
          </span>
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-foreground">Private means private.</h2>
            <p className="text-sm leading-relaxed text-muted sm:text-base">
              Public pages explain the platform. Member dashboards, private rooms, direct messages,
              billing details, admin areas and sensitive member context stay protected behind
              authentication and access rules.
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
