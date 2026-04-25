import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { acceptBcnRulesAndContinueAction } from "@/actions/legal/rules.actions";
import {
  BCN_RULES_CONTENT,
  BCN_RULES_LAST_UPDATED
} from "@/config/legal";
import { LegalDocument } from "@/components/public";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/config/site";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "BCN Rules",
  description: BCN_RULES_CONTENT.description,
  path: "/rules"
});

export default function RulesPage() {
  return (
    <LegalDocument
      label={BCN_RULES_CONTENT.label}
      title={BCN_RULES_CONTENT.title}
      intro={BCN_RULES_CONTENT.intro}
      updatedAt={BCN_RULES_LAST_UPDATED}
      supportEmail={SITE_CONFIG.supportEmail}
      sections={BCN_RULES_CONTENT.sections}
    >
      <section className="rules-cta-panel p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="rules-cta-kicker">Ready to enter</p>
            <h2 className="mt-3 font-display text-3xl text-foreground">
              Ready to enter
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Once you accept the BCN Rules, conversations, messaging, and calls can open with the
              right standard in place.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <form action={acceptBcnRulesAndContinueAction}>
              <Button type="submit" size="lg" className="rules-cta-primary w-full sm:w-auto">
                Accept and Continue to Dashboard <ArrowRight size={16} />
              </Button>
            </form>
            <Link href="/dashboard">
              <Button type="button" size="lg" variant="outline" className="w-full sm:w-auto">
                Back to dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </LegalDocument>
  );
}
