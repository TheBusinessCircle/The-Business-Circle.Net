import { writeFileSync } from "node:fs";
import { BCN_BLOG_DRAFTS, BLOG_PREPARED_AT } from "../src/content/bcn-blog";
import { getBlogConfig, getBlogSchedule } from "../src/lib/bcn-v2/blog";

const args = process.argv.slice(2);
const startIndex = args.indexOf("--example-start");
const exampleStart = startIndex >= 0 ? args[startIndex + 1] : undefined;
const config = getBlogConfig(
  exampleStart ? { BCN_BLOG_START_DATE: exampleStart } : process.env,
);
if (config.error) throw new Error(config.error);
const schedule = getBlogSchedule(config);
const words = (post: (typeof BCN_BLOG_DRAFTS)[number]) =>
  [
    post.intro,
    ...post.sections.flat(),
    post.example,
    ...post.checklist,
    post.helpPrompt,
  ]
    .join(" ")
    .split(/\s+/).length;
const summary = {
  articles: BCN_BLOG_DRAFTS.length,
  categories: new Set(BCN_BLOG_DRAFTS.map((post) => post.category)).size,
  preparedAt: BLOG_PREPARED_AT,
  bodyWords: BCN_BLOG_DRAFTS.reduce((sum, post) => sum + words(post), 0),
  startDate: config.startDate,
  releaseLimit: config.releaseLimit,
  schedule: "Monday and Thursday, 08:00 Europe/London",
  dateMode: exampleStart
    ? "Illustrative dates only, not configured production publication"
    : "Current process configuration",
  firstRelease: schedule[0]?.publishedAt ?? null,
  lastRelease: schedule.at(-1)?.publishedAt ?? null,
};
console.log(JSON.stringify(summary, null, 2));

if (args.includes("--write-calendar")) {
  const rows = BCN_BLOG_DRAFTS.map(
    (post, index) =>
      `| ${index + 1} | ${schedule[index]?.dateKey ?? "Launch date required"} | ${post.category} | [${post.title}](/blog/${post.slug}) |`,
  );
  const text = [
    "# BCN 2.0 editorial calendar",
    "",
    `Prepared ${BLOG_PREPARED_AT}. ${summary.articles} complete short practical articles, ${summary.categories} rotating topics and ${summary.bodyWords.toLocaleString("en-GB")} body words, excluding shared page copy.`,
    "",
    "Two releases weekly for 52 weeks. Every article contains an original task-focused explanation, illustrative example, four actions, a suggested specific help request and a relevant free next step. These are AI-assisted drafts, not independently professionally reviewed articles or real customer case studies.",
    "",
    exampleStart
      ? `**Dates below are an example starting ${exampleStart}, not a claim of live publication.** Set the actual launch date on deployment.`
      : "Dates reflect the current process configuration. No launch date means no public releases.",
    "",
    "Keep existing insights and their URLs. New free posts use /blog. The dedicated public routes check the clock at request time; future and held posts remain unavailable. The sitemap refreshes hourly. Publication does not guarantee crawling, rankings, visitors or revenue.",
    "",
    "| # | Release date | Topic | Article |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "See editorial-operations.md for release configuration, holds, maintenance, sources and verification limits.",
    "",
  ].join("\n");
  writeFileSync("docs/bcn-v2/editorial-calendar.md", text);
}
