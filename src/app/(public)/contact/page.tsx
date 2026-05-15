import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { AnswerBlock, AuditFitCta, FAQSection, JsonLd, TwoPathCta } from "@/components/public";
import { PublicTopVisual } from "@/components/visual-media";
import { formatCompanyTrustLine } from "@/config/company";
import { ContactForm } from "@/components/platform/contact-form";
import { buttonVariants } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from "@/lib/structured-data";
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

const CONTACT_FAQS = [
  {
    question: "How can business owners contact The Business Circle Network?",
    answer:
      "Business owners can contact The Business Circle Network through the contact page to ask about membership, access, founder-led services or the private business environment."
  },
  {
    question: "Should I run the Founder Audit before contacting BCN?",
    answer:
      "You can. The Founder Audit is useful if you want a clearer sense of membership fit before asking a detailed question."
  },
  {
    question: "Can existing members use the contact page?",
    answer:
      "Yes. Existing members can use the contact page for access, account, billing or platform questions that need a direct response."
  }
] as const;

export default async function ContactPage() {
  const [footerContent, publicTopPlacement] = await Promise.all([
    getSiteContentSection("footer"),
    getVisualMediaPlacement("global.public.top")
  ]);

  return (
    <div className="public-page-stack">
      <JsonLd
        data={buildWebPageSchema({
          title: "Contact The Business Circle Network",
          description:
            "How business owners can contact BCN about membership, access and founder-led services.",
          path: "/contact",
          primaryQuestion: "How can business owners contact The Business Circle Network?",
          primaryAnswer:
            "Business owners can contact The Business Circle Network through the contact page to ask about membership, access, founder-led services or the private business environment. The platform is designed for serious owners who want useful connection and clearer business conversations."
        })}
      />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/home" },
          { name: "Contact", path: "/contact" }
        ])}
      />
      <JsonLd data={buildFaqSchema([...CONTACT_FAQS])} />

      <PublicTopVisual
        placement={publicTopPlacement}
        eyebrow="Contact"
        title="Start a serious business conversation."
        description="Choose the right route for membership questions, founder services, collaborations, or member support."
        tone="anchored"
      />

      <section className="public-hero-spacing relative overflow-hidden rounded-[2.05rem] border border-border/80 bg-card/60 shadow-panel">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.48)_100%),linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.62)_100%)]" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.84fr)] xl:items-start">
          <div className="space-y-5">
            <div className="space-y-4">
              <p className="premium-kicker">Contact</p>
              <h1 className="max-w-4xl font-display text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
                Start a serious business conversation.
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed text-white/80">
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
                Join as a founding member
                <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/audit"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
              >
                Run the Founder Audit
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

      <AnswerBlock
        question="How can business owners contact The Business Circle Network?"
        answer="Business owners can contact The Business Circle Network through the contact page to ask about membership, access, founder-led services or the private business environment. The platform is designed for serious owners who want useful connection and clearer business conversations."
      />

      <AuditFitCta />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <aside className="public-panel space-y-5 p-5 sm:p-6">
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

      <FAQSection
        label="Contact"
        title="Contact questions, answered clearly"
        description="Use this page for membership fit, founder-led services, partnerships and support."
        items={[...CONTACT_FAQS]}
      />

      <TwoPathCta source="contact" />
    </div>
  );
}
