import type { Metadata } from "next";
import { FileText, Globe2, Save } from "lucide-react";
import {
  updateAboutSiteContentAction,
  updateFooterSiteContentAction,
  updateHomeSiteContentAction,
  updateMembershipSiteContentAction
} from "@/actions/admin/site-content.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  HOME_FAQ_COUNT,
  HOME_PROOF_ITEM_COUNT,
  MEMBERSHIP_FAQ_COUNT,
  SITE_CONTENT_SLUGS,
  isSiteContentSlug,
  type SiteContentSlug
} from "@/config/site-content";
import { db } from "@/lib/db";
import { createPageMetadata } from "@/lib/seo";
import { normalizeSiteContentSections } from "@/lib/site-content";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Admin Site Content",
  description:
    "Edit key public website copy for home, about, membership, and footer content.",
  path: "/admin/site-content"
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "home-saved": "Homepage content saved.",
    "about-saved": "About page intro saved.",
    "membership-saved": "Membership page copy saved.",
    "footer-saved": "Footer contact details saved."
  };

  const errorMap: Record<string, string> = {
    "invalid-home": "Homepage content did not pass validation.",
    "invalid-about": "About intro did not pass validation.",
    "invalid-membership": "Membership copy did not pass validation.",
    "invalid-footer": "Footer content did not pass validation."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

function updatedAtLabel(value?: Date): string {
  return value ? ` Last updated ${formatDate(value)}.` : "";
}

const homeProofFieldIndexes = Array.from(
  { length: HOME_PROOF_ITEM_COUNT },
  (_, index) => index
);

const homeFaqFieldIndexes = Array.from(
  { length: HOME_FAQ_COUNT },
  (_, index) => index
);

const membershipFaqFieldIndexes = Array.from(
  { length: MEMBERSHIP_FAQ_COUNT },
  (_, index) => index
);

export default async function AdminSiteContentPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;

  const records = await db.siteContent.findMany({
    where: {
      slug: {
        in: SITE_CONTENT_SLUGS
      }
    },
    select: {
      slug: true,
      sections: true,
      updatedAt: true
    }
  });

  const recordMap = new Map<SiteContentSlug, { sections: unknown; updatedAt: Date }>();

  for (const record of records) {
    if (isSiteContentSlug(record.slug)) {
      recordMap.set(record.slug, {
        sections: record.sections,
        updatedAt: record.updatedAt
      });
    }
  }

  const homeContent = normalizeSiteContentSections("home", recordMap.get("home")?.sections);
  const aboutContent = normalizeSiteContentSections("about", recordMap.get("about")?.sections);
  const membershipContent = normalizeSiteContentSections(
    "membership",
    recordMap.get("membership")?.sections
  );
  const footerContent = normalizeSiteContentSections("footer", recordMap.get("footer")?.sections);
  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });
  const returnPath = "/admin/site-content";

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/10 via-card/80 to-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/15 text-gold">
                <FileText size={12} className="mr-1" />
                Public Site Copy
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Site Content Manager</CardTitle>
              <CardDescription className="mt-2 text-base">
                Edit core public copy without touching page code. This manager controls
                homepage storytelling, proof placeholders, FAQs, membership positioning,
                and footer trust details.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-silver/35 bg-silver/10 text-silver">
              <Globe2 size={12} className="mr-1" />
              4 editable public content zones
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {feedback ? (
        <Card
          className={
            feedback.type === "error"
              ? "border-red-500/40 bg-red-500/10"
              : "border-gold/30 bg-gold/10"
          }
        >
          <CardContent className="py-3">
            <p
              className={
                feedback.type === "error"
                  ? "text-sm text-red-200"
                  : "text-sm text-gold"
              }
            >
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Homepage Content</CardTitle>
          <CardDescription>
            Controls hero positioning, homepage section intros, proof placeholders,
            FAQ content, and the closing CTA.
            {updatedAtLabel(recordMap.get("home")?.updatedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateHomeSiteContentAction} className="space-y-4">
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="space-y-2">
              <Label htmlFor="heroSupportLine">Hero Support Line</Label>
              <Input
                id="heroSupportLine"
                name="heroSupportLine"
                defaultValue={homeContent.heroSupportLine}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroTitle">Hero Title</Label>
              <Input id="heroTitle" name="heroTitle" defaultValue={homeContent.heroTitle} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
              <Textarea
                id="heroSubtitle"
                name="heroSubtitle"
                rows={4}
                defaultValue={homeContent.heroSubtitle}
                required
              />
            </div>
            <div className="gold-divider" />
            <div className="space-y-2">
              <Label htmlFor="whyTitle">Why This Exists Title</Label>
              <Input id="whyTitle" name="whyTitle" defaultValue={homeContent.whyTitle} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whyDescription">Why This Exists Description</Label>
              <Textarea
                id="whyDescription"
                name="whyDescription"
                rows={4}
                defaultValue={homeContent.whyDescription}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vibeTitle">Strategic Lens Section Title</Label>
              <Input id="vibeTitle" name="vibeTitle" defaultValue={homeContent.vibeTitle} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vibeDescription">Strategic Lens Section Description</Label>
              <Textarea
                id="vibeDescription"
                name="vibeDescription"
                rows={3}
                defaultValue={homeContent.vibeDescription}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audienceTitle">Who It Is For Title</Label>
              <Input
                id="audienceTitle"
                name="audienceTitle"
                defaultValue={homeContent.audienceTitle}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audienceDescription">Who It Is For Description</Label>
              <Textarea
                id="audienceDescription"
                name="audienceDescription"
                rows={3}
                defaultValue={homeContent.audienceDescription}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefitsTitle">What Members Get Title</Label>
              <Input
                id="benefitsTitle"
                name="benefitsTitle"
                defaultValue={homeContent.benefitsTitle}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefitsDescription">What Members Get Description</Label>
              <Textarea
                id="benefitsDescription"
                name="benefitsDescription"
                rows={3}
                defaultValue={homeContent.benefitsDescription}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="differenceTitle">Why This Is Different Title</Label>
              <Input
                id="differenceTitle"
                name="differenceTitle"
                defaultValue={homeContent.differenceTitle}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="differenceDescription">Why This Is Different Description</Label>
              <Textarea
                id="differenceDescription"
                name="differenceDescription"
                rows={3}
                defaultValue={homeContent.differenceDescription}
                required
              />
            </div>
            <div className="gold-divider" />
            <div className="space-y-2">
              <Label htmlFor="proofTitle">Proof Section Title</Label>
              <Input id="proofTitle" name="proofTitle" defaultValue={homeContent.proofTitle} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proofDescription">Proof Section Description</Label>
              <Textarea
                id="proofDescription"
                name="proofDescription"
                rows={3}
                defaultValue={homeContent.proofDescription}
                required
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {homeProofFieldIndexes.map((index) => (
                <div key={index} className="space-y-2 rounded-2xl border border-border/80 p-4">
                  <p className="text-sm font-medium text-foreground">Proof Card {index + 1}</p>
                  <div className="space-y-2">
                    <Label htmlFor={`proofItems.${index}.eyebrow`}>Eyebrow</Label>
                    <Input
                      id={`proofItems.${index}.eyebrow`}
                      name={`proofItems.${index}.eyebrow`}
                      defaultValue={homeContent.proofItems[index]?.eyebrow}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`proofItems.${index}.title`}>Title</Label>
                    <Input
                      id={`proofItems.${index}.title`}
                      name={`proofItems.${index}.title`}
                      defaultValue={homeContent.proofItems[index]?.title}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`proofItems.${index}.description`}>Description</Label>
                    <Textarea
                      id={`proofItems.${index}.description`}
                      name={`proofItems.${index}.description`}
                      rows={4}
                      defaultValue={homeContent.proofItems[index]?.description}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="gold-divider" />
            <div className="space-y-2">
              <Label htmlFor="faqTitle">Homepage FAQ Title</Label>
              <Input id="faqTitle" name="faqTitle" defaultValue={homeContent.faqTitle} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faqDescription">Homepage FAQ Description</Label>
              <Textarea
                id="faqDescription"
                name="faqDescription"
                rows={3}
                defaultValue={homeContent.faqDescription}
                required
              />
            </div>
            <div className="space-y-4">
              {homeFaqFieldIndexes.map((index) => (
                <div key={index} className="space-y-2 rounded-2xl border border-border/80 p-4">
                  <p className="text-sm font-medium text-foreground">FAQ {index + 1}</p>
                  <div className="space-y-2">
                    <Label htmlFor={`faqs.${index}.question`}>Question</Label>
                    <Input
                      id={`faqs.${index}.question`}
                      name={`faqs.${index}.question`}
                      defaultValue={homeContent.faqs[index]?.question}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`faqs.${index}.answer`}>Answer</Label>
                    <Textarea
                      id={`faqs.${index}.answer`}
                      name={`faqs.${index}.answer`}
                      rows={4}
                      defaultValue={homeContent.faqs[index]?.answer}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="gold-divider" />
            <div className="space-y-2">
              <Label htmlFor="ctaTitle">Homepage CTA Title</Label>
              <Input id="ctaTitle" name="ctaTitle" defaultValue={homeContent.ctaTitle} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctaDescription">Homepage CTA Description</Label>
              <Textarea
                id="ctaDescription"
                name="ctaDescription"
                rows={3}
                defaultValue={homeContent.ctaDescription}
                required
              />
            </div>
            <Button type="submit">
              <Save size={14} className="mr-1" />
              Save Homepage Content
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Page Intro</CardTitle>
          <CardDescription>
            Controls the intro text in the About page header section.
            {updatedAtLabel(recordMap.get("about")?.updatedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAboutSiteContentAction} className="space-y-4">
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="space-y-2">
              <Label htmlFor="intro">About Intro</Label>
              <Textarea
                id="intro"
                name="intro"
                rows={4}
                defaultValue={aboutContent.intro}
                required
              />
            </div>
            <Button type="submit" variant="outline">
              <Save size={14} className="mr-1" />
              Save About Intro
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membership Page Copy</CardTitle>
          <CardDescription>
            Controls membership page positioning, plan narratives, comparison copy,
            membership FAQ content, and the final CTA.
            {updatedAtLabel(recordMap.get("membership")?.updatedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateMembershipSiteContentAction} className="space-y-4">
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="space-y-2">
              <Label htmlFor="membershipIntro">Membership Intro</Label>
              <Textarea
                id="membershipIntro"
                name="intro"
                rows={4}
                defaultValue={membershipContent.intro}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="standardCopy">Foundation Plan Copy</Label>
              <Textarea
                id="standardCopy"
                name="standardCopy"
                rows={3}
                defaultValue={membershipContent.standardCopy}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="innerCircleCopy">Inner Circle Plan Copy</Label>
              <Textarea
                id="innerCircleCopy"
                name="innerCircleCopy"
                rows={3}
                defaultValue={membershipContent.innerCircleCopy}
                required
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2 rounded-2xl border border-border/80 p-4">
                <p className="text-sm font-medium text-foreground">Foundation Narrative</p>
                <div className="space-y-2">
                  <Label htmlFor="standard.whoItsFor">Who It Is For</Label>
                  <Textarea
                    id="standard.whoItsFor"
                    name="standard.whoItsFor"
                    rows={4}
                    defaultValue={membershipContent.standard.whoItsFor}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="standard.outcomes">Outcomes</Label>
                  <Textarea
                    id="standard.outcomes"
                    name="standard.outcomes"
                    rows={4}
                    defaultValue={membershipContent.standard.outcomes}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="standard.whyChoose">Why People Choose Foundation</Label>
                  <Textarea
                    id="standard.whyChoose"
                    name="standard.whyChoose"
                    rows={4}
                    defaultValue={membershipContent.standard.whyChoose}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2 rounded-2xl border border-border/80 p-4">
                <p className="text-sm font-medium text-foreground">Inner Circle Narrative</p>
                <div className="space-y-2">
                  <Label htmlFor="innerCircle.whoItsFor">Who It Is For</Label>
                  <Textarea
                    id="innerCircle.whoItsFor"
                    name="innerCircle.whoItsFor"
                    rows={4}
                    defaultValue={membershipContent.innerCircle.whoItsFor}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="innerCircle.outcomes">Outcomes</Label>
                  <Textarea
                    id="innerCircle.outcomes"
                    name="innerCircle.outcomes"
                    rows={4}
                    defaultValue={membershipContent.innerCircle.outcomes}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="innerCircle.whyChoose">Why People Upgrade To Inner Circle</Label>
                  <Textarea
                    id="innerCircle.whyChoose"
                    name="innerCircle.whyChoose"
                    rows={4}
                    defaultValue={membershipContent.innerCircle.whyChoose}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="gold-divider" />
            <div className="space-y-2">
              <Label htmlFor="comparisonTitle">Comparison Section Title</Label>
              <Input
                id="comparisonTitle"
                name="comparisonTitle"
                defaultValue={membershipContent.comparisonTitle}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comparisonDescription">Comparison Section Description</Label>
              <Textarea
                id="comparisonDescription"
                name="comparisonDescription"
                rows={3}
                defaultValue={membershipContent.comparisonDescription}
                required
              />
            </div>
            <div className="gold-divider" />
            <div className="space-y-2">
              <Label htmlFor="faqTitle">Membership FAQ Title</Label>
              <Input
                id="faqTitle"
                name="faqTitle"
                defaultValue={membershipContent.faqTitle}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faqDescription">Membership FAQ Description</Label>
              <Textarea
                id="faqDescription"
                name="faqDescription"
                rows={3}
                defaultValue={membershipContent.faqDescription}
                required
              />
            </div>
            <div className="space-y-4">
              {membershipFaqFieldIndexes.map((index) => (
                <div key={index} className="space-y-2 rounded-2xl border border-border/80 p-4">
                  <p className="text-sm font-medium text-foreground">Membership FAQ {index + 1}</p>
                  <div className="space-y-2">
                    <Label htmlFor={`faqs.${index}.question`}>Question</Label>
                    <Input
                      id={`faqs.${index}.question`}
                      name={`faqs.${index}.question`}
                      defaultValue={membershipContent.faqs[index]?.question}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`faqs.${index}.answer`}>Answer</Label>
                    <Textarea
                      id={`faqs.${index}.answer`}
                      name={`faqs.${index}.answer`}
                      rows={4}
                      defaultValue={membershipContent.faqs[index]?.answer}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="gold-divider" />
            <div className="space-y-2">
              <Label htmlFor="ctaTitle">Membership CTA Title</Label>
              <Input
                id="ctaTitle"
                name="ctaTitle"
                defaultValue={membershipContent.ctaTitle}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctaDescription">Membership CTA Description</Label>
              <Textarea
                id="ctaDescription"
                name="ctaDescription"
                rows={3}
                defaultValue={membershipContent.ctaDescription}
                required
              />
            </div>
            <Button type="submit" variant="outline">
              <Save size={14} className="mr-1" />
              Save Membership Copy
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer Contact Details</CardTitle>
          <CardDescription>
            Controls public footer support email, trust messaging, and founder-led footer statements.
            {updatedAtLabel(recordMap.get("footer")?.updatedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateFooterSiteContentAction} className="space-y-4">
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="space-y-2">
              <Label htmlFor="brandBlurb">Brand Blurb</Label>
              <Textarea
                id="brandBlurb"
                name="brandBlurb"
                rows={3}
                defaultValue={footerContent.brandBlurb}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  name="supportEmail"
                  type="email"
                  defaultValue={footerContent.supportEmail}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportLine">Support Line</Label>
                <Input
                  id="supportLine"
                  name="supportLine"
                  defaultValue={footerContent.supportLine}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trustLine">Trust Line</Label>
              <Input
                id="trustLine"
                name="trustLine"
                defaultValue={footerContent.trustLine}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="founderLine">Founder Line</Label>
              <Input
                id="founderLine"
                name="founderLine"
                defaultValue={footerContent.founderLine}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bottomLine">Footer Bottom Line</Label>
              <Input
                id="bottomLine"
                name="bottomLine"
                defaultValue={footerContent.bottomLine}
                required
              />
            </div>
            <Button type="submit" variant="outline">
              <Save size={14} className="mr-1" />
              Save Footer Content
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
