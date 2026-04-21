# Community Prompt Automation

The quiet-time prompt system is intentionally conservative.

- Member page loads can run an opportunistic check through `maybePublishQuietCommunityPrompt(...)`.
- A secure internal route is available at `/api/internal/community/prompts/run`.
- Manual admin checks are available from `/admin/community`.

Safeguards:

- Maximum 3 automated prompts per rolling 7 days.
- Minimum 48 hours between published automated prompts.
- Recent manual founder posts suppress prompt publication in the same window.
- Only inactive categories with active prompt inventory are considered.
- Prompt rotation respects per-prompt cooldown windows.
- Category choice is narrowed and randomized so the behaviour does not feel mechanical.

Environment:

- `COMMUNITY_AUTOMATION_SECRET` secures the internal route.
- `CRON_SECRET` can secure Vercel cron requests across internal scheduled routes.
- `COMMUNITY_AUTOMATION_AUTHOR_ID` can pin the author account used for automated community publishing. If omitted, the oldest active admin account is used.
- `COMMUNITY_PROMPT_AUTHOR_ID` still works as a fallback for quiet prompts.
- `BCN_COMMUNITY_AUTOMATION_ENABLED` toggles the BCN curated updates lane on or off.
- `BCN_COMMUNITY_SOURCE_URLS` is the preferred production setting and accepts a comma-separated list of RSS, Atom, or JSON feeds.
- `BCN_COMMUNITY_SOURCE_URL` remains available as a legacy single-source fallback.
- `BCN_COMMUNITY_SOURCE_NAME` only affects the legacy single-source label; multi-source runs derive labels from each feed.
- `BCN_COMMUNITY_LOOKBACK_HOURS` should stay at `24` so BCN Updates stays focused on the latest day of useful business news.
- `BCN_COMMUNITY_AUTOMATION_THROTTLE_MS` now defaults to `300000` so opportunistic checks never outrun the 5-minute scheduler target.
- `BCN_COMMUNITY_MAX_POSTS_PER_RUN` now defaults to `2` so BCN Intelligence stays selective even when many sources are configured.

Cron example:

- `GET /api/internal/community/prompts/run?secret=YOUR_SECRET`
- or send `Authorization: Bearer YOUR_SECRET`
- `GET /api/internal/community/bcn-updates/run?secret=YOUR_SECRET`

BCN Updates production guidance:

- Treat `/api/internal/community/bcn-updates/run` as the primary production trigger.
- Keep member-page opportunistic publishing as a fallback only; do not rely on page visits for fresh news.
- The practical near-live target is a 5-minute cron. The importer is still pull-based, so this is near-live rather than true event-driven instant publishing.
- Recommended feed set:
  - `https://feeds.bbci.co.uk/news/business/rss.xml`
  - `https://feeds.bbci.co.uk/news/technology/rss.xml`
  - `https://www.reutersagency.com/feed/?best-regions=world&post_type=best`

VPS cron example:

- `*/5 * * * * curl -fsS "https://YOUR_DOMAIN/api/internal/community/bcn-updates/run?secret=YOUR_SECRET" >/dev/null`

Vercel:

- `vercel.json` schedules the internal automation routes directly.
- If `CRON_SECRET` is set in Vercel, cron requests are authorized via `Authorization: Bearer $CRON_SECRET`.
