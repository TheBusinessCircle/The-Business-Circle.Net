import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCircleCardPageMetadata } from "@/lib/circle-card/metadata";

export const metadata: Metadata = createCircleCardPageMetadata({
  title: "Circle Card Community Standards",
  description:
    "The community standards for Circle Card: a trusted, welcoming identity and discovery platform for businesses, creators, professionals and communities.",
  path: "/circle-card/community-standards"
});

const PURPOSE_ITEMS = [
  "Connect",
  "Build relationships",
  "Discover trusted people",
  "Find businesses",
  "Support creators"
];

const NOT_ALLOWED_ITEMS = [
  "Nude images",
  "Sexual content",
  "Pornography",
  "Harassment",
  "Hate speech",
  "Scam activity",
  "Fake businesses",
  "Fraud",
  "Illegal content",
  "Malicious files",
  "Impersonation",
  "Threats",
  "Abuse",
  "Spam"
];

export default function CircleCardCommunityStandardsPage() {
  return (
    <main className="public-page-shell">
      <section className="public-page-stack py-14 sm:py-20">
        <div className="max-w-3xl">
          <Badge variant="outline" className="border-gold/35 bg-gold/10 text-gold">
            <ShieldCheck size={12} className="mr-1" />
            Circle Card
          </Badge>
          <h1 className="mt-5 font-display text-4xl text-foreground sm:text-5xl">
            Community Standards
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            Circle Card exists to help businesses, creators, professionals, students,
            communities and local people share a useful identity layer with confidence.
            These standards keep the platform calm, trusted and welcoming.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-gold/25 bg-card/72">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Sparkles size={18} />
                What Circle Card Is For
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3">
                {PURPOSE_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/72">
            <CardHeader>
              <CardTitle>What Is Not Allowed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {NOT_ALLOWED_ITEMS.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-border/70 bg-background/28 px-3 py-2 text-sm text-muted"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-silver/16 bg-card/62">
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm leading-relaxed text-muted">
              Reports are reviewed by a human. Circle Card does not automatically ban accounts or
              remove content from a single report, but reports help the team investigate anything
              that may make the platform less safe or less trustworthy.
            </p>
            <p className="text-sm text-muted">
              Questions about these standards can be sent through{" "}
              <Link href="/contact" className="text-primary hover:underline">
                contact
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
