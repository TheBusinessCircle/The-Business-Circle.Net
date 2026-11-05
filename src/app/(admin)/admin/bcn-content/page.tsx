import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { BCN_BLOG_DRAFTS, BLOG_PREPARED_AT } from "@/content/bcn-blog";
import {
  blogDate,
  getBlogConfig,
  getBlogSchedule,
  listBcnBlogPosts,
} from "@/lib/bcn-v2/blog";
import "@/components/bcn-v2/v2.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "BCN publication queue",
  robots: { index: false, follow: false },
};
export default async function ContentQueue() {
  if (!isBcnV2Enabled()) notFound();
  await requireAdmin();
  const config = getBlogConfig();
  const schedule = getBlogSchedule(config);
  const now = new Date();
  const published = listBcnBlogPosts(now, config);
  const next = schedule.find(
    (post) =>
      post.sequence <= config.releaseLimit &&
      Date.parse(post.publishedAt) > now.getTime(),
  );
  return (
    <div className="bcn-v2">
      <section className="v2-section">
        <div className="v2-wrap">
          <h1>BCN publication queue</h1>
          <p>
            {BCN_BLOG_DRAFTS.length} prepared articles · {published.length}{" "}
            currently released · preparation date{" "}
            {blogDate(`${BLOG_PREPARED_AT}T12:00:00Z`)}.
          </p>
          <p>
            Publication: Monday and Thursday at 08:00 Europe/London. Blog pages
            check the release time on each request; no writing API or posting
            job is required. The sitemap can take up to an hour to refresh.
          </p>
          {config.error && (
            <p role="alert">Publication is stopped: {config.error}</p>
          )}
          {!config.startDate && !config.error && (
            <p>
              The release date is not configured. Set BCN_BLOG_START_DATE to the
              Monday or Thursday chosen for launch. No articles are publicly
              released yet.
            </p>
          )}
          {next && (
            <p>
              Next release: {blogDate(next.publishedAt)} at 08:00 UK time,{" "}
              {next.title}.
            </p>
          )}
          <p>
            Release ceiling: {config.releaseLimit} of 104. To hold future
            releases, an authorised operator can set BCN_BLOG_RELEASE_LIMIT to
            the number already published. Keep the launch date unchanged and do
            not lower the ceiling below the released count unless deliberately
            withdrawing content.
          </p>
          <p>
            Articles are AI-assisted drafts checked during implementation, not
            individually reviewed by an independent professional. Review
            changing facts, source links and corrections regularly. This queue
            handles publication; it does not moderate community requests or
            respond to customers.
          </p>
          <p>
            <Link href="/blog">Open the public blog</Link> ·{" "}
            <Link href="/admin/bcn-ideas">Community moderation</Link>
          </p>
          <div className="v2-blog-table">
            <table>
              <caption>Prepared articles and release status</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Article</th>
                  <th scope="col">Topic</th>
                  <th scope="col">Release, UK time</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {BCN_BLOG_DRAFTS.map((draft, index) => {
                  const post = schedule[index];
                  const released =
                    post && published.some((item) => item.slug === post.slug);
                  const status = !post
                    ? "Not scheduled"
                    : post.sequence > config.releaseLimit
                      ? "Held"
                      : released
                        ? "Released"
                        : "Scheduled";
                  return (
                    <tr key={draft.slug}>
                      <td>{index + 1}</td>
                      <td>
                        {released ? (
                          <Link href={`/blog/${draft.slug}`}>
                            {draft.title}
                          </Link>
                        ) : (
                          draft.title
                        )}
                      </td>
                      <td>{draft.category}</td>
                      <td>
                        {post
                          ? `${blogDate(post.publishedAt)}, 08:00`
                          : "Launch date required"}
                      </td>
                      <td>{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
