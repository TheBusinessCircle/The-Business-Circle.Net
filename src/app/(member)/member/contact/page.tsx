import type { Metadata } from "next";
import { CreditCard, HelpCircle, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/platform/contact-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MembershipTierBadge } from "@/components/ui/membership-tier-badge";
import { roleToTier } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Member Contact",
  description:
    "Contact The Business Circle team from inside the member workspace for account, platform, membership, or general support.",
  path: "/member/contact",
  noIndex: true
});

const CONTACT_REASONS = [
  {
    title: "Account or billing help",
    subject: "Member contact: Account or billing help",
    copy: "Use this for invoices, plan access, billing questions, or account details that need attention.",
    icon: CreditCard
  },
  {
    title: "Platform or access issue",
    subject: "Member contact: Platform or access issue",
    copy: "Use this when something inside the member area is not loading, unlocking, or behaving as expected.",
    icon: ShieldCheck
  },
  {
    title: "Membership or room question",
    subject: "Member contact: Membership or room question",
    copy: "Use this for questions about your current room, access level, fit, or where to spend your time.",
    icon: HelpCircle
  },
  {
    title: "General message",
    subject: "Member contact: General message",
    copy: "Use this for anything else that needs a direct response from the BCN team.",
    icon: MessageCircle
  }
] as const;

export default async function MemberContactPage() {
  const session = await requireUser();
  const effectiveTier = roleToTier(session.user.role, session.user.membershipTier);
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: {
      business: {
        select: {
          companyName: true
        }
      }
    }
  });

  return (
    <div className="space-y-6">
      <section className="premium-surface overflow-hidden p-5 sm:p-6 lg:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-[hsl(var(--member-accent-border)/0.42)] bg-[hsl(var(--member-accent)/0.12)] text-[hsl(var(--member-accent-text))]"
          >
            MEMBER CONTACT
          </Badge>
          <MembershipTierBadge tier={effectiveTier} />
        </div>

        <div className="mt-5 max-w-4xl space-y-3">
          <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            Contact The Business Circle from inside the room
          </h1>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            Use this page for account questions, platform support, membership help, or anything
            that needs a direct response from the BCN team.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <aside className="space-y-4">
          <Card className="border-[hsl(var(--member-accent-border)/0.28)] bg-card/68">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Mail size={18} className="text-[hsl(var(--member-accent-text))]" />
                How to route your message
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {CONTACT_REASONS.map((reason) => {
                const Icon = reason.icon;

                return (
                  <div
                    key={reason.title}
                    className="rounded-2xl border border-border/80 bg-background/24 p-4 transition-colors hover:border-[hsl(var(--member-accent-border)/0.38)] hover:bg-[hsl(var(--member-accent)/0.08)]"
                  >
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Icon size={16} className="text-[hsl(var(--member-accent-text))]" />
                      {reason.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{reason.copy}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-[hsl(var(--member-accent-border)/0.3)] bg-[hsl(var(--member-accent)/0.1)] px-4 py-3 text-sm leading-relaxed text-[hsl(var(--member-accent-text))]">
            Your signed-in member context is attached where available so the team can respond with
            the right account and membership details in view.
          </div>
        </aside>

        <ContactForm
          title="Send a member message"
          description="Choose the closest message type and share the context the team needs to help."
          submitLabel="Send Member Message"
          successTitle="Message received"
          successDescription="Your message is with the Business Circle team."
          successNotice="Thanks. We received your member message and will come back to you with the right next step."
          source="member-contact"
          sourcePath="/member/contact"
          subjectOptions={CONTACT_REASONS.map((reason) => ({
            label: reason.title,
            value: reason.subject
          }))}
          defaultValues={{
            name: session.user.name ?? "",
            email: session.user.email ?? "",
            company: profile?.business?.companyName ?? ""
          }}
        />
      </div>
    </div>
  );
}
