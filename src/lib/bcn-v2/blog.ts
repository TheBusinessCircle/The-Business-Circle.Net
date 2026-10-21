import { BCN_BLOG_DRAFTS } from "@/content/bcn-blog";
import { isBcnV2Enabled } from "./flags";
import { zonedDateTimeToUtc } from "@/lib/resources/schedule";
import type { BcnBlogDraft } from "@/content/bcn-blog/types";

export type BlogConfig = {
  startDate: string | null;
  releaseLimit: number;
  error: string | null;
};
export type BcnBlogPost = BcnBlogDraft & {
  sequence: number;
  publishedAt: string;
  dateKey: string;
};

/** An explicit launch date prevents accidental backlog publication on a late deployment. */
export function getBlogConfig(
  env: Record<string, string | undefined> = process.env,
): BlogConfig {
  const startDate = env.BCN_BLOG_START_DATE?.trim() || null;
  const limit = env.BCN_BLOG_RELEASE_LIMIT?.trim();
  const releaseLimit =
    limit === undefined || limit === ""
      ? BCN_BLOG_DRAFTS.length
      : Number(limit);
  if (
    !Number.isInteger(releaseLimit) ||
    releaseLimit < 0 ||
    releaseLimit > BCN_BLOG_DRAFTS.length
  ) {
    return {
      startDate,
      releaseLimit: 0,
      error: "BCN_BLOG_RELEASE_LIMIT must be a whole number from 0 to 104.",
    };
  }
  if (!startDate) return { startDate: null, releaseLimit, error: null };
  const date = new Date(`${startDate}T12:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== startDate ||
    ![1, 4].includes(date.getUTCDay())
  ) {
    return {
      startDate: null,
      releaseLimit: 0,
      error:
        "BCN_BLOG_START_DATE must be a real Monday or Thursday in YYYY-MM-DD format.",
    };
  }
  return { startDate, releaseLimit, error: null };
}

export function getBlogSchedule(
  config: BlogConfig = getBlogConfig(),
): BcnBlogPost[] {
  if (!config.startDate || config.error) return [];
  const start = new Date(`${config.startDate}T12:00:00.000Z`);
  const secondDayOffset = start.getUTCDay() === 1 ? 3 : 4;
  return BCN_BLOG_DRAFTS.map((draft, index) => {
    const dayOffset =
      Math.floor(index / 2) * 7 + (index % 2 ? secondDayOffset : 0);
    const day = new Date(start.getTime() + dayOffset * 86_400_000);
    const dateKey = day.toISOString().slice(0, 10);
    const at = zonedDateTimeToUtc(
      {
        year: day.getUTCFullYear(),
        month: day.getUTCMonth() + 1,
        day: day.getUTCDate(),
        hour: 8,
        minute: 0,
      },
      "Europe/London",
    );
    return {
      ...draft,
      sequence: index + 1,
      publishedAt: at.toISOString(),
      dateKey,
    };
  });
}

export function listBcnBlogPosts(
  now = new Date(),
  config = getBlogConfig(),
): BcnBlogPost[] {
  if (!isBcnV2Enabled() || config.error || !Number.isFinite(now.getTime()))
    return [];
  return getBlogSchedule(config)
    .filter(
      (post) =>
        post.sequence <= config.releaseLimit &&
        Date.parse(post.publishedAt) <= now.getTime(),
    )
    .reverse();
}

export function getBcnBlogPost(
  slug: string,
  now = new Date(),
  config = getBlogConfig(),
) {
  return (
    listBcnBlogPosts(now, config).find((post) => post.slug === slug) ?? null
  );
}

export function relatedBcnBlogPosts(current: BcnBlogPost, now = new Date()) {
  const posts = listBcnBlogPosts(now).filter(
    (post) => post.slug !== current.slug,
  );
  return [
    ...posts.filter((post) => post.category === current.category),
    ...posts.filter((post) => post.category !== current.category),
  ].slice(0, 3);
}

export function blogDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function blogReadingMinutes(post: BcnBlogDraft) {
  return Math.max(
    1,
    Math.ceil(
      [
        post.intro,
        ...post.sections.flat(),
        post.example,
        ...post.checklist,
        post.helpPrompt,
      ]
        .join(" ")
        .split(/\s+/).length / 200,
    ),
  );
}

export function escapeXml(value: string) {
  return value.replace(
    /[<>&"']/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );
}

export function buildBlogFeed(posts: BcnBlogPost[], origin: string) {
  const items = posts
    .slice(0, 20)
    .map((post) => {
      const url = `${origin}/blog/${post.slug}`;
      return `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><description>${escapeXml(post.description)}</description><pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate><category>${escapeXml(post.category)}</category></item>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>The Business Circle: practical business help</title><link>${escapeXml(origin)}/blog</link><description>Useful ideas and practical next steps for starting and running a business.</description><language>en-GB</language>${items}</channel></rss>`;
}
