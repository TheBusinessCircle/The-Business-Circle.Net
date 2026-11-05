import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeading } from "@/components/bcn-v2/shell";
import { BusinessTool } from "@/components/bcn-v2/tools-client";
import { tools, vatSources } from "@/lib/bcn-v2/catalogue";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { createPageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/public";
import { SITE_CONFIG } from "@/config/site";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const t = tools.find((t) => t.slug === slug);
  return t
    ? createPageMetadata({
        title: t.title,
        description: t.description,
        path: `/tools/${slug}`,
      })
    : {};
}
export default async function ToolPage({ params }: Props) {
  if (!isBcnV2Enabled()) notFound();
  const { slug } = await params;
  const t = tools.find((t) => t.slug === slug);
  if (!t) notFound();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: t.title,
          url: `${SITE_CONFIG.url}/tools/${slug}`,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: 0, priceCurrency: "GBP" },
        }}
      />
      <PageHeading
        eyebrow={`${t.tag} · FREE, NO ACCOUNT NEEDED`}
        title={t.title}
      >
        <p>{t.description}</p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap">
          <BusinessTool slug={t.slug} />
          <div className="v2-prose" style={{ marginTop: 40 }}>
            <h2>Use the result with confidence.</h2>
            {slug === "job-pricing-calculator" ? (
              <p>
                Price = total cost ÷ (1 − target margin). Labour includes your
                own time. Include irrecoverable VAT in costs; use net costs
                where input VAT is recoverable. Profit here is before income or
                corporation tax. VAT collected is not profit. This tool covers
                simple supplies and does not handle construction reverse charge
                or special schemes.
              </p>
            ) : slug === "profit-break-even-calculator" ? (
              <p>
                Break-even units = fixed costs ÷ (price per sale − variable cost
                per sale), rounded up. Choose one consistent period. Exclude
                recoverable VAT and VAT collected. Include your own labour in
                costs. If contribution is zero or negative, this model cannot
                break even.
              </p>
            ) : slug === "business-cost-comparison" ? (
              <p>
                Total cost = monthly cost × months + setup + exit costs. Use a
                consistent VAT basis. Spread annual charges into monthly
                equivalents and include any minimum commitment. This comparison
                excludes inflation, financing costs and service-quality
                differences.
              </p>
            ) : slug === "quote-builder" ? (
              <p>
                Review every item, the scope, exclusions and dates before
                sending. VAT is calculated per item and rounded to pence. Only
                charge VAT if you are registered and the supply requires it.
                Your browser’s print dialog provides Save as PDF; turn off
                browser headers and footers for a clean document.
              </p>
            ) : (
              <p>
                The checklist records only your own selections. For measured
                tests, use official services such as{" "}
                <a href="https://pagespeed.web.dev/" rel="noreferrer">
                  PageSpeed Insights
                </a>{" "}
                and{" "}
                <a
                  href="https://search.google.com/search-console/about"
                  rel="noreferrer"
                >
                  Search Console
                </a>
                . Never treat a completed checklist as a security certification.
              </p>
            )}
            <p className="v2-small">
              Assumptions reviewed 20 October 2026. General planning help, not
              personalised financial, legal or tax advice.
            </p>
            {slug !== "website-health-checklist" && (
              <p>
                UK standard VAT is 20%, with reduced, zero-rated and exempt
                supplies treated differently. Check your supply’s treatment.
                Sources:{" "}
                {vatSources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 ? " · " : ""}
                    <a href={s.url}>{s.title}</a>
                  </span>
                ))}
                .
              </p>
            )}
            <p>
              <Link href="/tools">Explore all free tools</Link> ·{" "}
              <Link href="/find-help">Ask for business help</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
