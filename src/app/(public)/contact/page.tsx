import type { Metadata } from "next";
import { Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/public";
import { ContactForm } from "@/components/platform/contact-form";
import { createPageMetadata } from "@/lib/seo";
import { getSiteContentSection } from "@/lib/site-content";

export const metadata: Metadata = createPageMetadata({
  title: "Contact",
  description:
    "Contact The Business Circle Network team for membership, support, partnerships, and platform enquiries.",
  path: "/contact"
});

export default async function ContactPage() {
  const footerContent = await getSiteContentSection("footer");

  return (
    <div className="space-y-10 pb-16">
      <SectionHeading
        label="Contact"
        title="Speak with the Business Circle team"
        description="Questions about memberships, partnerships, or platform access? Send us a message and we will respond as soon as possible."
      />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <aside className="public-panel space-y-5 p-6">
          <h2 className="font-display text-2xl text-silver">How we can help</h2>
          <p className="text-sm leading-relaxed text-muted">
            Whether you are evaluating membership or need platform support, our team is here to help.
          </p>
          <div className="rounded-2xl border border-border/80 bg-background/30 p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-gold">Support email</p>
            <a
              href={`mailto:${footerContent.supportEmail}`}
              className="mt-2 inline-block text-sm text-foreground transition-colors hover:text-gold"
            >
              {footerContent.supportEmail}
            </a>
          </div>
          <div className="space-y-3">
            {[
              {
                icon: MessageSquare,
                title: "Membership Questions",
                copy: "Plan guidance, tier fit, and onboarding support."
              },
              {
                icon: Mail,
                title: "Partnership Enquiries",
                copy: "Collaborations, events, and strategic opportunities."
              },
              {
                icon: ShieldCheck,
                title: "Platform Support",
                copy: "Access, billing, and account assistance."
              }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border/80 bg-background/30 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-silver">
                  <item.icon size={16} className="text-gold" />
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-muted">{item.copy}</p>
              </div>
            ))}
          </div>
        </aside>

        <div>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
