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
- `BCN_COMMUNITY_SOURCE_URL` points to the RSS, Atom, or JSON feed to ingest.
- `BCN_COMMUNITY_SOURCE_NAME` controls the source label shown in the generated post body.

Cron example:

- `GET /api/internal/community/prompts/run?secret=YOUR_SECRET`
- or send `Authorization: Bearer YOUR_SECRET`
- `GET /api/internal/community/bcn-updates/run?secret=YOUR_SECRET`

Vercel:

- `vercel.json` schedules the internal automation routes directly.
- If `CRON_SECRET` is set in Vercel, cron requests are authorized via `Authorization: Bearer $CRON_SECRET`.
