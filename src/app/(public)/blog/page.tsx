import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogCards } from "@/components/bcn-v2/blog";
import { PageHeading } from "@/components/bcn-v2/shell";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { listBcnBlogPosts } from "@/lib/bcn-v2/blog";
import { createPageMetadata } from "@/lib/seo";

// Request-time dates: publication needs neither a paid API, cron nor a rebuild.
export const dynamic = "force-dynamic";
type Props = {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
};
export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  return {
    ...createPageMetadata({
      title: "Practical Business Blog | The Business Circle",
      description:
        "Useful ideas for starting and running a business: pricing, customers, websites, practical help and working together.",
      path: "/blog",
      noIndex: Boolean(params.q || params.category || params.page),
    }),
    alternates: {
      canonical: "/blog",
      types: { "application/rss+xml": "/blog/feed.xml" },
    },
  };
}
export default async function BlogPage({ searchParams }: Props) {
  if (!isBcnV2Enabled()) notFound();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100).trim() : "";
  const category =
    typeof params.category === "string" ? params.category.slice(0, 60) : "";
  const all = listBcnBlogPosts();
  const categories = [...new Set(all.map((post) => post.category))].sort();
  const filtered = all.filter(
    (post) =>
      (!category || post.category === category) &&
      (!q ||
        `${post.title} ${post.description} ${post.intro}`
          .toLowerCase()
          .includes(q.toLowerCase())),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12));
  const parsedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isSafeInteger(parsedPage)
    ? Math.max(1, Math.min(pageCount, parsedPage))
    : 1;
  const pageHref = (target: number) =>
    `/blog?${new URLSearchParams({ ...(q ? { q } : {}), ...(category ? { category } : {}), page: String(target) })}`;
  return (
    <>
      <PageHeading
        eyebrow="THE BCN BLOG · FREE TO READ"
        title="Useful ideas. Something you can do with them."
      >
        <p>
          Practical reading for new ideas, current businesses and people who
          want to help. Start with the question you are working through.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap">
          <form action="/blog" className="v2-blog-filters" role="search">
            <label className="v2-field">
              Search articles
              <input
                name="q"
                maxLength={100}
                defaultValue={q}
                placeholder="Pricing, first customers, quotes…"
              />
            </label>
            <label className="v2-field">
              Topic
              <select name="category" defaultValue={category}>
                <option value="">All topics</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <button className="v2-button" type="submit">
              Find articles
            </button>
            <Link href="/blog">Reset</Link>
          </form>
          {filtered.length > 0 ? (
            <>
              <p>
                {filtered.length}{" "}
                {filtered.length === 1 ? "article" : "articles"} · page {page}{" "}
                of {pageCount}
              </p>
              <BlogCards posts={filtered.slice((page - 1) * 12, page * 12)} />
              <nav className="v2-blog-pagination" aria-label="Blog pages">
                {page > 1 && (
                  <Link href={pageHref(page - 1)} rel="prev">
                    ← Previous page
                  </Link>
                )}
                {page < pageCount && (
                  <Link href={pageHref(page + 1)} rel="next">
                    Next page →
                  </Link>
                )}
              </nav>
            </>
          ) : (
            <div className="v2-card">
              <h2>
                {all.length
                  ? "No matching articles yet"
                  : "Start with a practical guide"}
              </h2>
              <p>
                {all.length
                  ? "Try a different question or browse all published articles."
                  : "The free guides and tools are ready to use. New blog articles appear here as they are released."}
              </p>
              <Link className="v2-text-link" href="/advice">
                Explore the business guides ↗
              </Link>
            </div>
          )}
          <div className="v2-prose" style={{ marginTop: 36 }}>
            <p>
              <Link href="/blog/feed.xml">Follow new articles by RSS</Link>.
              Reading does not require an account.
            </p>
            <p>
              Need help with your own next step?{" "}
              <Link href="/ideas">Build it together</Link> or{" "}
              <Link href="/find-help">request a private introduction</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
