import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/bcn-v2/shell";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { guides } from "@/lib/bcn-v2/guides";
import { createPageMetadata } from "@/lib/seo";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const g = guides.find((g) => g.slug === slug);
  return g
    ? createPageMetadata({
        title: g.title,
        description: g.description,
        path: `/advice/${slug}`,
      })
    : {};
}
export default async function GuidePage({ params }: Props) {
  if (!isBcnV2Enabled()) notFound();
  const { slug } = await params;
  const g = guides.find((g) => g.slug === slug);
  if (!g) notFound();
  return (
    <>
      <PageHeading eyebrow="PRACTICAL BUSINESS GUIDE" title={g.title}>
        <p>{g.description}</p>
      </PageHeading>
      <section className="v2-section">
        <article className="v2-wrap v2-prose">
          <p className="v2-small">
            The Business Circle editorial draft · Sources checked 20 October
            2026
          </p>
          {g.sections.map(([title, body]) => (
            <section key={title}>
              <h2>{title}</h2>
              <p>{body}</p>
            </section>
          ))}
          <p>
            Source and further reading: <a href={g.source}>{g.sourceTitle}</a>.
          </p>
          <p>
            General business guidance, not personalised legal, financial or tax
            advice. Figures are examples. Check current rules and the needs of
            your business before acting.
          </p>
          <div className="v2-actions">
            <Link href={`/tools/${g.tool}`} className="v2-button">
              Use a free tool ↗
            </Link>
            <Link href="/find-help" className="v2-text-link">
              Ask for relevant help
            </Link>
          </div>
          <p>
            <Link href="/advice">More practical guides</Link>
          </p>
        </article>
      </section>
    </>
  );
}
