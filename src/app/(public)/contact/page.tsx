import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { PublicTopVisual } from "@/components/visual-media";
import { formatCompanyTrustLine } from "@/config/company";
import { ContactForm } from "@/components/platform/contact-form";
import { buttonVariants } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { getSiteContentSection } from "@/server/site-content";
import { getVisualMediaPlacement } from "@/server/visual-media";

export const metadata: Metadata = createPageMetadata({
  title: "Contact The Business Circle Network",
  description:
    "Contact The Business Circle Network about membership fit, partnerships, support, or a serious business enquiry.",
  keywords: [
    "contact business owners network UK",
    "business network contact",
    "membership enquiry",
    "private business community UK contact"
  ],
  path: "/contact"
});

export default async function ContactPage() {
  const [footerContent, publicTopPlacement] = await Promise.all([
    getSiteContentSection("footer"),
    getVisualMediaPlacement("global.public.top")
  ]);

  return (
    <div className="space-y-12 pb-16">
      <PublicTopVisual
        placement={publicTopPlacement}
        eyebrow="Contact"
        title="Start a serious business conversation."
        description="Choose the right route for membership questions, founder services, collaborations, or member support."
        tone="anchored"
      />

      <section className="relative overflow-hidden rounded-[2.2rem] border border-border/80 bg-card/60 px-6 py-8 shadow-panel sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-silver/10 blur-[96px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-gold/14 blur-[120px]" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.84fr)] xl:items-start">
          <div className="space-y-5">
            <div className="space-y-4">
              <p className="premium-kicker">Contact</p>
              <h1 className="max-w-4xl font-display text-4xl leading-tight text-foreground sm:text-5xl">
                Start a serious business conversation.
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed text-muted">
                Use this page for membership questions, founder services, partnership or
                collaboration opportunities, and existing member support. It is built to route the
                conversation clearly, not make you hunt for the right inbox.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/membership"
                className={cn(buttonVariants({ size: "lg" }), "group w-full sm:w-auto")}
              >
                Review Membership
                <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/about"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
              >
                Read About
              </Link>
            </div>
          </div>

          <aside className="rounded-[1.8rem] border border-border/80 bg-background/24 p-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-gold">Direct contact</p>
            <a
              href={`mailto:${footerContent.supportEmail}`}
              className="mt-3 inline-block text-lg text-foreground transition-colors hover:text-gold"
            >
              {footerContent.supportEmail}
            </a>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Share a little context and the right person will come back to you with the best next
              step.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-muted">{formatCompanyTrustLine()}</p>
          </aside>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <aside className="public-panel space-y-5 p-6">
          <h2 className="font-display text-2xl text-foreground">What to contact us about</h2>
          <p className="text-sm leading-relaxed text-muted">
            The strongest enquiries are clear, intentional, and grounded in the actual next step
            you need.
          </p>
          <div className="space-y-3">
            {[
              {
                icon: MessageSquare,
                title: "Membership questions",
                copy: "Use this if you want help understanding which room fits the business now."
              },
              {
                icon: Mail,
                title: "Founder services",
                copy: "Use this for higher-level strategic support, founder-led work, or service-fit questions."
              },
              {
                icon: ArrowRight,
                title: "Partnership or collaboration",
                copy: "Use this for aligned opportunities, introductions, or commercial collaboration conversations."
              },
              {
                icon: ShieldCheck,
                title: "Existing member support",
                copy: "Use this for access, account, billing, or platform issues that need a response."
              }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border/80 bg-background/30 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <item.icon size={16} className="text-gold" />
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.copy}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-gold/20 bg-gold/10 p-4">
            <p className="text-sm font-medium text-foreground">What happens after you send this</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A Business Circle team member reviews the enquiry, routes it to the right person,
              and replies with the clearest next step. Billing or access issues are prioritised.
            </p>
          </div>
        </aside>

        <div>
          <ContactForm
            title="Open the conversation"
            description="Share enough context for us to understand the business, the question, and the best next step."
            submitLabel="Send Enquiry"
            successTitle="Conversation started"
            successDescription="Your message is with the Business Circle team."
            successNotice="Thanks. We received your message and will come back to you with the right next step."
          />
        </div>
      </div>
    </div>
  );
}
