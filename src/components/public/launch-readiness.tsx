import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  CreditCard,
  Gauge,
  Handshake,
  KeyRound,
  LayoutDashboard,
  MessageCircle,
  MessageSquare,
  Palette,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { SectionHeading } from "@/components/public/section-heading";
import { cn } from "@/lib/utils";

type PreviewItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type ProofItem = {
  eyebrow: string;
  title: string;
  description: string;
};

type LaunchTrustProofProps = {
  proofItems?: ProofItem[];
  activeDiscussionCount: number;
  connectionWinsCount: number;
  recentResourceCount: number;
  upcomingEventCount: number;
  founderPlacesRemaining: number;
  founderRoomCount: number;
  className?: string;
};

type CheckoutReassuranceBlockProps = {
  className?: string;
  compact?: boolean;
};

type MemberPreviewLayerProps = {
  id?: string;
  className?: string;
  compact?: boolean;
};

const CHECKOUT_REASSURANCE_ITEMS: PreviewItem[] = [
  {
    title: "Secure Stripe checkout",
    description: "Billing is completed through Stripe before access is issued.",
    icon: CreditCard
  },
  {
    title: "Access opens after payment confirmation",
    description: "Member areas unlock after the payment confirmation reaches BCN.",
    icon: KeyRound
  },
  {
    title: "Manage billing from your account",
    description: "Plan and billing changes stay available from the member workspace.",
    icon: Receipt
  },
  {
    title: "Founder pricing stays while allocation remains",
    description: "Founder rates stay available only while the room allocation is open.",
    icon: BadgeCheck
  },
  {
    title: "Support is available",
    description: "Access or billing questions can be handled through support.",
    icon: MessageCircle
  }
];

const MEMBER_PREVIEW_ITEMS: PreviewItem[] = [
  {
    title: "Dashboard",
    description: "A calm member home for your next action, current signals, and progress.",
    icon: LayoutDashboard
  },
  {
    title: "Profile and directory",
    description: "Business context, member profiles, and a clearer way to understand fit.",
    icon: Users
  },
  {
    title: "Rooms and discussions",
    description: "Private spaces for questions, updates, wins, and focused owner conversation.",
    icon: MessageSquare
  },
  {
    title: "Resources",
    description: "Structured material for decisions, positioning, operations, and growth.",
    icon: BookOpen
  },
  {
    title: "Calls",
    description: "A way to move from thread-level context into a useful conversation when it matters.",
    icon: CalendarDays
  },
  {
    title: "Collaborations",
    description: "Clearer offers, asks and member context make useful fit easier to spot.",
    icon: Handshake
  }
];

const STATIC_TRUST_PROOF_ITEMS: ProofItem[] = [
  {
    eyebrow: "Early member proof",
    title: "Approved wins appear only when they are real",
    description:
      "Member outcomes, referrals, and collaboration stories are kept out of public proof areas until they are specific and approved."
  },
  {
    eyebrow: "Founder note",
    title: "The room is protected before it is promoted",
    description:
      "The founder-led standard keeps the focus on useful business context, clear expectations, and a calmer environment."
  },
  {
    eyebrow: "Build progress proof",
    title: "Progress is shown through live platform signals",
    description:
      "Discussions, resources, events, and Blueprint updates provide launch proof without exposing private member content."
  },
  {
    eyebrow: "Company verification",
    title: "Business details are captured carefully",
    description:
      "Profiles support company status and company number where members provide them, without presenting unverified claims as proof."
  }
];

function isRealProofItem(item: ProofItem) {
  const combined = `${item.eyebrow} ${item.title} ${item.description}`.toLowerCase();
  return !combined.includes("ready for real proof");
}

export function CheckoutReassuranceBlock({
  className,
  compact = false
}: CheckoutReassuranceBlockProps) {
  return (
    <section
      className={cn(
        "rounded-[1.35rem] border border-gold/22 bg-gradient-to-br from-gold/10 via-background/22 to-card/58 p-4 shadow-gold-soft sm:p-5",
        compact ? "space-y-3" : "space-y-4",
        className
      )}
      aria-label="Checkout reassurance"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
          <ShieldCheck size={16} />
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Before checkout</p>
          <p className="text-sm text-muted">What happens around payment and access.</p>
        </div>
      </div>

      <div className={cn("grid gap-2", compact ? "" : "sm:grid-cols-2 xl:grid-cols-5")}>
        {CHECKOUT_REASSURANCE_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-[1rem] border border-white/8 bg-background/22 px-3 py-3 text-sm"
            >
              <div className="flex items-start gap-2.5">
                <Icon size={15} className="mt-0.5 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{item.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MemberPreviewLayer({
  id,
  className,
  compact = false
}: MemberPreviewLayerProps) {
  return (
    <section id={id} className={cn(compact ? "space-y-4" : "public-section", className)}>
      <SectionHeading
        label="Member Preview"
        title="What opens after payment confirmation."
        description="A concise view of the member workspace before checkout: dashboard, profile context, private rooms, resources, calls, and collaboration paths."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {MEMBER_PREVIEW_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              className="rounded-[1.35rem] border border-border/80 bg-card/62 p-4 shadow-panel-soft sm:p-5"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-silver/16 bg-background/24 text-silver">
                <Icon size={17} />
              </span>
              <h3 className="mt-4 font-display text-2xl text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function LaunchTrustProof({
  proofItems,
  activeDiscussionCount,
  connectionWinsCount,
  recentResourceCount,
  upcomingEventCount,
  founderPlacesRemaining,
  founderRoomCount,
  className
}: LaunchTrustProofProps) {
  const adminProofItems = (proofItems ?? []).filter(isRealProofItem);
  const displayProofItems = adminProofItems.length ? adminProofItems : STATIC_TRUST_PROOF_ITEMS;
  const movementItems = [
    {
      label: "Discussion signal",
      value: activeDiscussionCount ? `${activeDiscussionCount}+` : "Private",
      description: activeDiscussionCount
        ? "Recent member discussion activity is visible as a signal only."
        : "Private discussions stay protected until public-safe signals exist."
    },
    {
      label: "Recent wins",
      value: connectionWinsCount ? `${connectionWinsCount}+` : "Held back",
      description: connectionWinsCount
        ? "Approved win signals are available without exposing private context."
        : "Empty testimonial areas stay hidden until real outcomes exist."
    },
    {
      label: "Build progress",
      value: recentResourceCount || upcomingEventCount ? `${recentResourceCount + upcomingEventCount}+` : "Active",
      description: "Resources, events, and Blueprint updates carry launch proof as the platform grows."
    },
    {
      label: "Founder allocation",
      value: founderRoomCount ? `${founderPlacesRemaining}` : "Managed",
      description: founderRoomCount
        ? "Founder places remain available only while active room allocation remains."
        : "Founder pricing closes room by room as allocation changes."
    }
  ];

  return (
    <section className={cn("public-section", className)}>
      <SectionHeading
        label="Trust Proof"
        title="Proof is shown carefully, without pretending the room is older than it is."
        description="The launch layer separates live signals, founder notes, build progress, and verification context from testimonials that do not exist yet."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          {displayProofItems.map((item) => (
            <article
              key={`${item.eyebrow}-${item.title}`}
              className="rounded-[1.35rem] border border-border/80 bg-card/62 p-4 shadow-panel-soft sm:p-5"
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{item.eyebrow}</p>
              <h3 className="mt-3 font-display text-2xl text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          ))}
        </div>

        <div className="rounded-[1.5rem] border border-gold/22 bg-gradient-to-br from-gold/10 via-card/72 to-card/62 p-4 shadow-gold-soft sm:p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
              <Gauge size={18} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Launch signals</p>
              <p className="text-sm text-muted">Public-safe movement, not empty proof blocks.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {movementItems.map((item, index) => {
              const Icon = index === 0 ? MessageSquare : index === 1 ? Sparkles : index === 2 ? Building2 : Palette;

              return (
                <div
                  key={item.label}
                  className="rounded-[1.1rem] border border-white/8 bg-background/22 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-silver">{item.label}</p>
                    <Icon size={15} className="text-gold" />
                  </div>
                  <p className="mt-2 font-display text-2xl text-foreground">{item.value}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
