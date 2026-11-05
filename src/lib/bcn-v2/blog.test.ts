import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BCN_BLOG_DRAFTS, BLOG_SOURCES } from "@/content/bcn-blog";
import {
  buildBlogFeed,
  getBcnBlogPost,
  getBlogConfig,
  getBlogSchedule,
  listBcnBlogPosts,
  relatedBcnBlogPosts,
} from "./blog";

const saved = { ...process.env };
beforeEach(() => {
  process.env.BCN_V2_ENABLED = "true";
  process.env.APP_URL = "https://thebusinesscircle.net";
  process.env.NEXTAUTH_URL = "https://thebusinesscircle.net";
  process.env.BCN_BLOG_START_DATE = "2026-10-22";
  delete process.env.BCN_BLOG_RELEASE_LIMIT;
});
afterEach(() => {
  process.env = { ...saved };
});

describe("BCN editorial releases", () => {
  it("releases exactly two slots per week across 52 weeks", () => {
    const schedule = getBlogSchedule();
    expect(schedule).toHaveLength(104);
    const uk = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    for (let i = 0; i < 104; i += 2) {
      expect(uk.format(new Date(schedule[i].publishedAt))).toBe(
        "Thursday 08:00",
      );
      expect(uk.format(new Date(schedule[i + 1].publishedAt))).toBe(
        "Monday 08:00",
      );
      expect(Date.parse(schedule[i + 1].publishedAt)).toBeGreaterThan(
        Date.parse(schedule[i].publishedAt),
      );
    }
    expect(schedule[0].dateKey).toBe("2026-10-22");
    expect(schedule[103].dateKey).toBe("2027-10-18");
  });
  it("uses UK local time across both clock changes", () => {
    const schedule = getBlogSchedule();
    expect(schedule[0].publishedAt).toBe("2026-10-22T07:00:00.000Z");
    expect(schedule[1].publishedAt).toBe("2026-10-26T08:00:00.000Z");
    expect(
      schedule.find((post) => post.dateKey === "2027-03-25")?.publishedAt,
    ).toBe("2027-03-25T08:00:00.000Z");
    expect(
      schedule.find((post) => post.dateKey === "2027-03-29")?.publishedAt,
    ).toBe("2027-03-29T07:00:00.000Z");
  });
  it("supports a Monday launch without changing the cadence", () => {
    const config = getBlogConfig({ BCN_BLOG_START_DATE: "2026-10-26" });
    expect(
      getBlogSchedule(config)
        .slice(0, 3)
        .map((post) => post.dateKey),
    ).toEqual(["2026-10-26", "2026-10-29", "2026-11-02"]);
  });
  it("does not expose a post even one millisecond before release", () => {
    const schedule = getBlogSchedule();
    const at = new Date(schedule[0].publishedAt);
    expect(listBcnBlogPosts(new Date(at.getTime() - 1))).toEqual([]);
    expect(
      getBcnBlogPost(schedule[0].slug, new Date(at.getTime() - 1)),
    ).toBeNull();
    expect(listBcnBlogPosts(at).map((post) => post.slug)).toEqual([
      schedule[0].slug,
    ]);
    expect(getBcnBlogPost(schedule[1].slug, at)).toBeNull();
  });
  it("requires an explicit launch date rather than publishing a historic backlog", () => {
    delete process.env.BCN_BLOG_START_DATE;
    expect(getBlogSchedule()).toEqual([]);
    expect(listBcnBlogPosts(new Date("2028-01-01"))).toEqual([]);
  });
  it.each([
    "2026-10-21",
    "2026-02-30",
    "not-a-date",
    "2026-1-01",
    "2026-10-22T08:00:00Z",
  ])("fails closed for invalid start date %s", (value) => {
    const config = getBlogConfig({ BCN_BLOG_START_DATE: value });
    expect(config.error).toBeTruthy();
    expect(listBcnBlogPosts(new Date("2028-01-01"), config)).toEqual([]);
  });
  it.each(["-1", "105", "1.5", "NaN", "infinity"])(
    "fails closed for invalid release limit %s",
    (value) => {
      const config = getBlogConfig({
        BCN_BLOG_START_DATE: "2026-10-22",
        BCN_BLOG_RELEASE_LIMIT: value,
      });
      expect(config.error).toBeTruthy();
      expect(listBcnBlogPosts(new Date("2028-01-01"), config)).toEqual([]);
    },
  );
  it("holds future posts while preserving the already released prefix", () => {
    process.env.BCN_BLOG_RELEASE_LIMIT = "2";
    expect(
      listBcnBlogPosts(new Date("2028-01-01")).map((post) => post.sequence),
    ).toEqual([2, 1]);
    process.env.BCN_BLOG_RELEASE_LIMIT = "0";
    expect(listBcnBlogPosts(new Date("2028-01-01"))).toEqual([]);
  });
  it("never exposes future or held titles through related posts or RSS", () => {
    const now = new Date("2026-10-26T08:00:00Z");
    const posts = listBcnBlogPosts(now);
    expect(posts).toHaveLength(2);
    expect(
      relatedBcnBlogPosts(posts[0], now).map((post) => post.sequence),
    ).toEqual([1]);
    const feed = buildBlogFeed(posts, "https://thebusinesscircle.net");
    expect(feed.match(/<item>/g)).toHaveLength(2);
    expect(feed).not.toContain(BCN_BLOG_DRAFTS[2].title);
  });
  it("escapes titles, summaries and URLs in RSS", () => {
    const post = {
      ...getBlogSchedule()[0],
      title: 'A < B & "quoted"',
      description: "</description><script>bad()</script>",
    };
    const feed = buildBlogFeed([post], "https://example.test?a=1&b=2");
    expect(feed).toContain("A &lt; B &amp; &quot;quoted&quot;");
    expect(feed).toContain("&lt;script&gt;");
    expect(feed).not.toContain("<script>");
    expect(feed).toContain("a=1&amp;b=2");
  });
  it("remains hidden with BCN disabled or on the independent product deployment", () => {
    process.env.BCN_V2_ENABLED = "false";
    expect(listBcnBlogPosts(new Date("2028-01-01"))).toEqual([]);
    process.env.BCN_V2_ENABLED = "true";
    process.env.APP_URL = "https://circlecard.co.uk";
    expect(listBcnBlogPosts(new Date("2028-01-01"))).toEqual([]);
  });
});

describe("BCN content-bank integrity", () => {
  it("contains 104 distinct complete articles across 13 rotating topics", () => {
    expect(BCN_BLOG_DRAFTS).toHaveLength(104);
    for (const key of [
      "slug",
      "title",
      "description",
      "intro",
      "example",
      "helpPrompt",
    ] as const) {
      expect(new Set(BCN_BLOG_DRAFTS.map((post) => post[key])).size).toBe(104);
    }
    expect(new Set(BCN_BLOG_DRAFTS.map((post) => post.category)).size).toBe(13);
    expect(
      new Set(BCN_BLOG_DRAFTS.slice(0, 13).map((post) => post.category)).size,
    ).toBe(13);
  });
  it("has valid internal journeys and identified primary reading", () => {
    const routes = new Set([
      "/start",
      "/ideas",
      "/ideas/mine",
      "/connections",
      "/find-help",
      "/business-directory",
      "/how-we-work",
      "/advice",
      "/tools/job-pricing-calculator",
      "/tools/profit-break-even-calculator",
      "/tools/business-cost-comparison",
      "/tools/website-health-checklist",
      "/tools/quote-builder",
    ]);
    for (const post of BCN_BLOG_DRAFTS) {
      expect(post.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(post.sections).toHaveLength(2);
      expect(post.checklist).toHaveLength(4);
      expect(routes.has(post.nextStep.href)).toBe(true);
      for (const source of post.sources ?? [])
        expect(BLOG_SOURCES[source]?.href).toMatch(/^https:\/\//);
      expect(JSON.stringify(post)).not.toMatch(
        /Circle Card|circlecard\.co\.uk|ScaleSmiths|TODO|Lorem ipsum|—/i,
      );
    }
  });
});
