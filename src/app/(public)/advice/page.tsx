import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/bcn-v2/shell";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { guides } from "@/lib/bcn-v2/guides";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata({
  title: "Practical Business Advice for UK Owners",
  description:
    "Clear guides to pricing, profit, quotes, websites, software and finding business help, each with a practical next step.",
  path: "/advice",
});
export default function AdvicePage() {
  if (!isBcnV2Enabled()) notFound();
  return (
    <>
      <PageHeading eyebrow="BUSINESS ADVICE" title="Work through the problem.">
        <p>
          Short, practical guides with worked examples, sources and a useful
          next step. Start with the decision on your desk.
        </p>
        <p>
          <Link href="/blog">Read the BCN blog</Link> for more practical ideas
          about starting, running and helping a business.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap v2-grid">
          {guides.map((g) => (
            <Link
              className="v2-card v2-card-link"
              key={g.slug}
              href={`/advice/${g.slug}`}
            >
              <span className="v2-tag">PRACTICAL GUIDE</span>
              <h2 style={{ fontSize: 24 }}>{g.title}</h2>
              <p>{g.description}</p>
              <span className="v2-text-link">Read the guide ↗</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
