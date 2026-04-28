import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Eye,
  FileCheck2,
  LockKeyhole,
  Scale,
  ShieldCheck
} from "lucide-react";
import { CTASection, FeatureGrid, SectionHeading } from "@/components/public";
import { Button, buttonVariants } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";
import { getSiteContentSection } from "@/server/site-content";

export const metadata: Metadata = createPageMetadata({
  title: "DPIA & Data Protection",
  description:
    "Learn how The Business Circle approaches data protection impact assessments, privacy risk review, and responsible handling of personal data across the platform.",
  path: "/dpia",
  keywords: [
    "DPIA",
    "data protection",
    "privacy impact assessment",
    "business circle privacy",
    "data protection approach"
  ]
});

const DPIA_FOUNDATION_ITEMS = [
  {
    icon: FileCheck2,
    title: "What a DPIA is",
    description:
      "A Data Protection Impact Assessment is a structured way to think through privacy risk before a feature, workflow, or operational change handles personal data in a more sensitive or complex way."
  },
  {
    icon: ShieldCheck,
    title: "Our approach",
    description:
      "Privacy and data protection are considered as part of platform planning, feature changes, operational decisions, and ongoing review rather than being treated as an afterthought."
  },
  {
    icon: Eye,
    title: "When we carry one out",
    description:
      "A DPIA may be used where a new technology, process, or data use could create elevated risk for individuals, especially when the impact would be broader, more sensitive, or harder to reverse."
  }
] as const;

const DPIA_ASSESSMENT_ITEMS = [
  {
    title: "Categories of personal data involved",
    description:
      "We look at what information is being used, how sensitive it is, and whether the amount of data involved is reasonable for the task."
  },
  {
    title: "Purpose of processing",
    description:
      "We assess why the data is needed, whether the purpose is clear, and whether the same outcome could be achieved in a less intrusive way."
  },
  {
    title: "Necessity and proportionality",
    description:
      "We consider whether the data use is appropriate for the service being provided and whether the scope stays aligned to the actual platform need."
  },
  {
    title: "Risks to individuals",
    description:
      "We review what could go wrong for users, members, applicants, or contacts if data is misused, exposed, retained too long, or processed in a way they would not reasonably expect."
  },
  {
    title: "Measures to reduce risk",
    description:
      "We document practical steps that reduce risk, improve clarity, and strengthen accountability before or during rollout."
  }
] as const;

const SAFEGUARD_ITEMS = [
  "Access control so only the right people and systems can reach the right information.",
  "Minimisation so the platform uses what is needed for the purpose rather than collecting more by default.",
  "Retention awareness so data is not kept longer than it needs to be for the service, support, operational, or legal context involved.",
  "Use of secure providers and processors where third-party services support platform operations.",
  "Monitoring and review when features, workflows, or provider arrangements change over time.",
  "Verification and trust measures where identity, entitlement, access level, or platform safety depend on them."
] as const;

export default async function DpiaPage() {
  const footerContent = await getSiteContentSection("footer");

  return (
    <div className="space-y-20 pb-28 lg:space-y-28 lg:pb-36">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/58 px-6 py-28 shadow-panel sm:px-8 lg:px-10 lg:py-36">
        <div className="pointer-events-none absolute inset-0 public-grid-overlay opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(0,0,0,0.44)_100%),linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.58)_100%)]" />

        <div className="relative space-y-10">
          <SectionHeading
            label="Trust & Privacy"
            title="DPIA & Data Protection"
            description="The Business Circle takes privacy and responsible data handling seriously. This page explains, in plain English, how data protection impact thinking fits into the way the platform is planned, reviewed, and operated."
          />

          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Privacy considered early",
              "Used where risk is higher",
              "Built around practical safeguards"
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border/80 bg-background/28 px-4 py-3 text-sm text-muted"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-10 py-20 lg:py-28">
        <FeatureGrid columns={3} items={[...DPIA_FOUNDATION_ITEMS]} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="public-panel p-6 sm:p-8">
          <p className="premium-kicker">Our Approach</p>
          <h2 className="mt-5 font-display text-3xl text-foreground">
            Data protection is part of how the platform is shaped
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
            <p>
              The Business Circle considers privacy and data protection as part of platform
              planning, feature changes, and operational decisions. That means thinking through the
              effect on people as services evolve, not only after something is already live.
            </p>
            <p>
              Where processing may involve higher risk, a DPIA can help identify what needs closer
              review, what needs to be justified more clearly, and what practical safeguards should
              be in place before or during rollout.
            </p>
          </div>
        </article>

        <article className="public-panel border-gold/25 bg-gradient-to-br from-gold/8 via-card/72 to-card/70 p-6 sm:p-8">
          <p className="premium-kicker">When We Carry Out A DPIA</p>
          <h2 className="mt-5 font-display text-3xl text-foreground">
            Used where new features or data uses create elevated privacy risk
          </h2>
          <div className="mt-5 space-y-3">
            {[
              "A new feature changes how personal data is collected, used, or shared.",
              "A workflow introduces more sensitive information or broader visibility.",
              "A new technology or provider changes the privacy risk profile.",
              "A platform or operational change could materially affect individuals if it goes wrong."
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border/80 bg-background/25 px-4 py-3 text-sm text-muted"
              >
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="space-y-6">
        <SectionHeading
          label="Assessment Focus"
          title="What we assess"
          description="A useful DPIA is not paperwork for its own sake. It is a way to challenge whether a data use is clear, justified, proportionate, and safe enough for the people affected."
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {DPIA_ASSESSMENT_ITEMS.map((item) => (
            <article key={item.title} className="public-panel interactive-card p-6">
              <h2 className="font-display text-2xl text-foreground">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <aside className="public-panel space-y-5 p-6 sm:p-8">
          <p className="premium-kicker">Risk Reduction & Safeguards</p>
          <h2 className="font-display text-3xl text-foreground">
            Practical measures matter more than broad claims
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            The aim is to reduce privacy risk in practical ways that support a more secure,
            proportionate, and trustworthy platform experience.
          </p>

          <div className="space-y-3">
            {[
              { icon: LockKeyhole, title: "Access control" },
              { icon: Scale, title: "Minimisation" },
              { icon: BadgeCheck, title: "Review and verification" }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border/80 bg-background/30 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-silver">
                  <item.icon size={16} className="text-gold" />
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-3">
          {SAFEGUARD_ITEMS.map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-border/80 bg-card/58 px-5 py-4 shadow-panel-soft"
            >
              <p className="text-sm leading-relaxed text-muted">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
        <article className="public-panel p-6 sm:p-8">
          <p className="premium-kicker">Linked Policies</p>
          <h2 className="mt-5 font-display text-3xl text-foreground">
            How this connects to the rest of our trust framework
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            This page explains the way The Business Circle approaches privacy impact thinking. For
            more detail on personal information, cookies, and wider platform terms, the related
            policies below provide the broader picture.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/privacy-policy">
              <Button>Privacy Policy</Button>
            </Link>
            <Link href="/cookie-policy">
              <Button variant="outline">Cookie Policy</Button>
            </Link>
            <Link href="/terms-of-service">
              <Button variant="outline">Terms of Service</Button>
            </Link>
          </div>
        </article>

        <article className="public-panel border-silver/18 bg-background/30 p-6 sm:p-8">
          <p className="premium-kicker">Privacy Questions</p>
          <h2 className="mt-5 font-display text-3xl text-foreground">
            Need to ask about privacy or data protection?
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
            <p>
              If you want to ask about how data is handled on the platform, or how privacy is
              considered in practice, you can contact the Business Circle team directly.
            </p>
            <p>
              For general support and trust-related questions, email{" "}
              <a
                href={`mailto:${footerContent.supportEmail}`}
                className="text-foreground transition-colors hover:text-gold"
              >
                {footerContent.supportEmail}
              </a>{" "}
              or use the contact route below.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/contact">
              <Button>Contact Us</Button>
            </Link>
            <a
              href={`mailto:${footerContent.supportEmail}`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Email Support
            </a>
          </div>
        </article>
      </section>

      <CTASection
        title="Trust should feel visible, not hidden in small print"
        description="The Business Circle is designed to feel more considered, more credible, and more responsible as the platform grows. That includes how privacy and data protection are approached."
        primaryAction={{ href: "/privacy-policy", label: "Read Privacy Policy" }}
        secondaryAction={{ href: "/contact", label: "Contact The Team", variant: "outline" }}
      />
    </div>
  );
}
