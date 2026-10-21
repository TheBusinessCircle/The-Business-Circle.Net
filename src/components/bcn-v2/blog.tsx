import Link from "next/link";
import { BLOG_PREPARED_AT, BLOG_SOURCES } from "@/content/bcn-blog/types";
import {
  blogDate,
  blogReadingMinutes,
  type BcnBlogPost,
} from "@/lib/bcn-v2/blog";

export function BlogCards({ posts }: { posts: BcnBlogPost[] }) {
  return (
    <div className="v2-grid">
      {posts.map((post) => (
        <article key={post.slug} className="v2-card">
          <p className="v2-tag">{post.category}</p>
          <h2 style={{ fontSize: 24 }}>
            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
          </h2>
          <p>{post.description}</p>
          <p className="v2-muted">
            <time dateTime={post.publishedAt}>
              {blogDate(post.publishedAt)}
            </time>{" "}
            · {blogReadingMinutes(post)} min read
          </p>
          <Link className="v2-text-link" href={`/blog/${post.slug}`}>
            Read the article ↗
          </Link>
        </article>
      ))}
    </div>
  );
}

export function BlogArticle({ post }: { post: BcnBlogPost }) {
  const sources = (post.sources ?? [])
    .map((key) => BLOG_SOURCES[key])
    .filter(Boolean);
  return (
    <article className="v2-prose v2-blog-article">
      <p>{post.intro}</p>
      {post.sections.map(([heading, body]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}
      <section>
        <h2>A worked example</h2>
        <p className="v2-muted">
          Illustrative, rather than a reported customer result.
        </p>
        <p>{post.example}</p>
      </section>
      <section>
        <h2>Try this next</h2>
        <ol>
          {post.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
      <section className="v2-blog-help">
        <h2>A useful way to ask for help</h2>
        <p>
          Adapt this to your situation and keep private details out of a public
          request:
        </p>
        <blockquote>
          <p>{post.helpPrompt}</p>
        </blockquote>
        <p>
          <Link className="v2-text-link" href="/ideas/new">
            Ask the BCN community ↗
          </Link>
        </p>
        <p>
          Free, discounted, paid and skill-swap contributions are clearly
          labelled. A public request needs an optional verified account and
          moderation.
        </p>
      </section>
      <p>
        <Link className="v2-button" href={post.nextStep.href}>
          {post.nextStep.label} ↗
        </Link>
      </p>
      {sources.length > 0 && (
        <section>
          <h2>Official guidance and further reading</h2>
          <ul>
            {sources.map((source) => (
              <li key={source.href}>
                <a href={source.href} rel="noopener noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
          <p>
            Check current guidance for your circumstances before acting. Links
            are further reading, not BCN partners or endorsements.
          </p>
        </section>
      )}
      <aside className="v2-blog-editorial">
        <h2>About this article</h2>
        <p>
          Prepared by The Business Circle with AI assistance. Preparation date:{" "}
          {blogDate(`${BLOG_PREPARED_AT}T12:00:00Z`)}. Publication follows our
          release schedule; it does not imply a new professional review on that
          date.
        </p>
        <p>
          General business guidance, not personalised tax, financial or legal
          advice. Examples are illustrative. No rankings, income or business
          outcomes are guaranteed.{" "}
          <Link href="/contact">
            Tell us about an error or unclear explanation
          </Link>
          .
        </p>
      </aside>
    </article>
  );
}
