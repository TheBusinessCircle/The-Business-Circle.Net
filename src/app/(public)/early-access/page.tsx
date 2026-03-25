import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Sparkles, Users } from "lucide-react";
import { ContactForm } from "@/components/platform/contact-form";
import { FoundingOfferCounters, SectionHeading } from "@/components/public";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";
import { getFoundingOfferSnapshot } from "@/server/founding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Early Access",
  description:
    "Join early access for The Business Circle Network and be part of the first wave shaping a founder-led business growth ecosystem.",
  path: "/early-access"
});

const earlyAccessReasons = [
  {
    icon: Sparkles,
    title: "Get in before wider visibility",
    description:
      "Early access is for people who want to join while the network is still being shaped with real intention."
  },
  {
    icon: Users,
    title: "Be part of the first circle",
    description:
      "Founding members help set the tone, relationships, and early momentum of the ecosystem."
  },
  {
    icon: Compass,
    title: "Enter with context, not noise",
    description:
      "This is a careful, founder-led launch. The goal is to build quality and trust before scale."
  }
];

export default async function EarlyAccessPage() {
  const foundingOffer = await getFoundingOfferSnapshot();

  return (
    <div className="space-y-10 pb-16">
      <SectionHeading
        label="Pre-Launch Access"
        title="Join the first wave before The Business Circle Network opens more widely"
        description="If the platform feels aligned but you are not ready to create a full membership account today, register your interest here. This early-access route is designed for founders, business owners, and growth-minded operators who want to be close to what is being built."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <FoundingOfferCounters offer={foundingOffer} />

          <div className="grid gap-4 md:grid-cols-3">
            {earlyAccessReasons.map((item) => (
              <article key={item.title} className="public-panel interactive-card p-5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                  <item.icon size={18} />
                </span>
                <h2 className="mt-4 font-display text-2xl text-foreground">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </article>
            ))}
          </div>

          <article className="public-panel p-6">
            <p className="premium-kicker">What happens next</p>
            <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
              <p>Tell us who you are, what you are building, and why early access matters to you.</p>
              <p>We will use that to prioritise early conversations, founding-member interest, and the next wave of invitations.</p>
              <p>If you are ready to choose a live plan now, you can still go straight to membership or create an account.</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/membership">
                <Button variant="outline">Explore Membership</Button>
              </Link>
              <Link href="/join">
                <Button>Go Straight To Join</Button>
              </Link>
            </div>
          </article>
        </div>

        <ContactForm
          title="Register Early Access Interest"
          description="Share a few details so we can understand where you fit and keep you close to the pre-launch rollout."
          submitLabel="Join Early Access"
          successTitle="Early Access Registered"
          successDescription="Your early-access note is in the queue."
          successNotice="Thanks for registering your interest. We’ll use this to shape early conversations, founding-member access, and the next stage of rollout."
        />
      </div>
    </div>
  );
}
