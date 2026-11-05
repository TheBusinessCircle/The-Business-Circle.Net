import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogArticle, BlogCards } from "@/components/bcn-v2/blog";
import { PageHeading } from "@/components/bcn-v2/shell";
import { JsonLd } from "@/components/public";
import { SITE_CONFIG } from "@/config/site";
import {
  blogDate,
  blogReadingMinutes,
  getBcnBlogPost,
  relatedBcnBlogPosts,
} from "@/lib/bcn-v2/blog";
import { createPageMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBcnBlogPost(slug);
  if (!post)
    return createPageMetadata({
      title: "Article unavailable",
      description: "This article is not currently available.",
      path: "/blog",
      noIndex: true,
    });
  const meta = createPageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
  });
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: "article",
      publishedTime: post.publishedAt,
      section: post.category,
    },
  };
}
export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = getBcnBlogPost(slug);
  if (!post) notFound();
  const related = relatedBcnBlogPosts(post);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: post.publishedAt,
          mainEntityOfPage: `${SITE_CONFIG.url}/blog/${post.slug}`,
          author: {
            "@type": "Organization",
            name: "The Business Circle",
            url: SITE_CONFIG.url,
          },
          publisher: {
            "@type": "Organization",
            name: "The Business Circle",
            url: SITE_CONFIG.url,
          },
          image: `${SITE_CONFIG.url}/bcn-v2-share.png`,
          inLanguage: "en-GB",
          isAccessibleForFree: true,
          articleSection: post.category,
        }}
      />
      <PageHeading eyebrow={post.category.toUpperCase()} title={post.title}>
        <p>{post.description}</p>
        <p>
          <time dateTime={post.publishedAt}>{blogDate(post.publishedAt)}</time>{" "}
          · {blogReadingMinutes(post)} min read · The Business Circle
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap">
          <nav aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <Link href="/blog">Blog</Link> /{" "}
            <span aria-current="page">{post.title}</span>
          </nav>
          <BlogArticle post={post} />
        </div>
      </section>
      {related.length > 0 && (
        <section className="v2-section">
          <div className="v2-wrap">
            <h2>Another useful next step</h2>
            <BlogCards posts={related} />
          </div>
        </section>
      )}
    </>
  );
}
