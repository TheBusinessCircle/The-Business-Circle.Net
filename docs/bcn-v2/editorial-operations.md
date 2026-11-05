# BCN 2.0 publication and launch operations

## Owner direction and current release boundary

On 21 October 2026 the owner authorised switching to BCN 2.0 and preparing two useful blog posts weekly for one year. That permission is recorded; another conversational launch approval is not required. It does not authorise billing changes, shared-product damage, spending, deletion or bypassing access controls. The remaining release boundary is technical access and verification, not missing owner intent.

No live hosting credentials, authorised server session, deployed-commit record or proxy/process topology are available in this environment. Public BCN still serves the old join experience. The existing deploy.sh identifies itself as a Circle Card deployment helper and includes separate-product Stripe certification and schema checks. Do not run it blindly for this release. Confirm the actual BCN checkout, upstream, process and environment on the existing server first. A generic Hostinger connector discovered during access investigation is unrelated to the known HyberHost setup and was not connected or used.

Follow deployment-migration.md for isolated staging, backup/restore verification, additive migrations, member rights, existing billing, smoke checks and rollback. Keep direct video disabled until the real staging media checks pass. Existing independent-product login/wallet/referral/billing tests still require authorised test access. No live switch, billing mutation or separate-product deployment occurred here.

## Implemented content

- 104 complete short practical articles, not just titles or outlines. Thirteen groups of eight rotate across the calendar: starting, customers, pricing, cash, websites, marketing, helping, buying, delivery, growth, resilience, accessible participation and review.
- Body copy totals 22,848 words before shared page sections. The format deliberately answers one bounded question, with an illustrative example, four actions, a specific help-request brief and a useful next step. No invented customers, income, qualifications, programme approval or affiliate links.
- The new free blog lives at /blog and /blog/[slug], with search, topic filtering, twelve-post pagination, published-only related reading, Article metadata and /blog/feed.xml RSS. Existing /insights and protected resource publishing are preserved.
- New routes use the established BCN isolation flag. They are unavailable on an independent-product deployment or when BCN 2.0 is off. No new database tables, cron credentials, paid APIs or background writer are needed.
- /admin/bcn-content uses existing administrator authentication and shows the complete queue, preparation date, configured release dates, released count and future holds. It does not imply that a scheduled page has been indexed or read.

## Turn on the schedule at the actual release

In the **isolated BCN environment only**, set these in both build and runtime:

```dotenv
BCN_V2_ENABLED=true
BCN_DIRECT_CALLS_ENABLED=false
# Choose the actual first Monday or Thursday at release time.
BCN_BLOG_START_DATE=YYYY-MM-DD
BCN_BLOG_RELEASE_LIMIT=104
```

The start placeholder must be replaced with a real date, never copied literally. Monday and Thursday releases occur at 08:00 Europe/London, including clock changes. A missing launch date releases nothing. Invalid dates/limits fail closed and are explained in the admin queue. Never use the historic QA or example-calendar start date in production: it would release a backlog. Once launched, keep the start date fixed.

Public article/list/feed requests evaluate release dates at request time. No manual weekly posting, deployment or cron is needed. Existing sitemap ISR can lag by up to an hour after the first revalidation request; a reverse proxy must not indefinitely cache dynamic blog pages or future 404s. Check real cache headers at staging. Google independently decides when to crawl or index. RSS is not an email subscription and no newsletter sender was enabled.

To hold future posts, set BCN_BLOG_RELEASE_LIMIT to the number already released and restart the BCN process with the approved configuration mechanism. Do not reduce below that count or move the launch date unless intentionally withdrawing content. Raise it after review to resume. A delay can release several already-due posts on resumption; if a paced reschedule is needed, edit the schedule deliberately rather than silently changing historic publication dates.

Inspect configuration without exposing unrelated environment values:

```sh
node --import tsx scripts/bcn-blog-status.ts
```

Regenerate the reference calendar with explicitly illustrative dates:

```sh
node --import tsx scripts/bcn-blog-status.ts --example-start 2026-10-22 --write-calendar
```

The script outputs counts and public scheduling settings only. It does not publish, alter billing, connect a database or write environment files.

## Editorial standards and maintenance

All drafts are AI-assisted. Public pages disclose that and distinguish the preparation date from scheduled publication; no independent professional review is claimed. Examples are explicitly illustrative. The source registry contains official GOV.UK, HMRC, ICO, ASA, Acas, NCSC, W3C and Google reading checked during this implementation. Those are sources, not commercial partners. General operating methods are original practical suggestions, not claimed research findings or guarantees.

Avoid stale hard-coded thresholds, programme prices, regulatory deadlines and volatile product comparisons. The VAT example is explicitly conditional; the article directs the actual transaction to current HMRC guidance or an accountant. Contract, tax, safety and specialist issues are not settled by community opinion. Source links do not certify every circumstance. Maintain substantive correction history; do not refresh dates merely for search engines.

Periodically check upcoming source links and examples, prioritising rule-sensitive topics. Correct inaccurate material before release or use the ceiling to hold it. A year of copy reduces publishing work, but does not remove accuracy, security or moderation duties. Automated link checks are signals, not professional review. Search traffic, helper participation and revenue have not been established by preparing this queue.

## Community and revenue remain operated services

Help requests and offers still need a named moderator. Introductions require the actual consent and matching process. A future commercial receipt requires evidence; clicks, forms and quote acceptance remain activity rather than revenue. No customer replies, newsletters, outreach or other messages were sent. No paid writing service or new chargeable account was created.

Use the queue for publication, /admin/bcn-ideas for community moderation and /admin/bcn-help for introductions and evidenced BCN receipts. Before a broad launch, complete the existing legal/safety operating reviews and assign someone to respond to submissions and reports. Publishing articles does not make that workflow unattended.
