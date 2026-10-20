# Verification results

20 October 2026. Tests used synthetic data and disposable local databases; no production migration or deployment was performed.

| Check | Result |
| --- | --- |
| Prisma generation | Passed |
| TypeScript `tsc --noEmit` | Passed |
| ESLint | 0 errors; 3 existing warnings outside this change |
| New tests | 46 passed across calculations, isolation, validation, moderated consent and free registration |
| Complete Vitest suite | 1,200 passed; 2 failed |
| Baseline reproduction | Both failures reproduced on unchanged main `5fa2bbf` |
| Production build | Passed; 311 pages generated and existing product server-action exports verified |
| Additive migration | Applied to a disposable PostgreSQL WASM baseline; 7 new tables; existing account/subscription fixture rows retained |
| Browser tools | All five tools exercised without an account; worked amounts and checklist progress confirmed |
| Quote output | An actual A4 PDF rendered from the editable quote using browser print media |
| Introduction flow | Public request → admin review → approved provider → explicit permission → introduction persisted; replay rejected |
| Security boundaries | Unauthorized admin mutation, foreign-origin intake, introduction without permission, missing agreement and duplicate receipt rejected |
| Production limiting | New help intake returned 503 with shared Redis absent, as designed |
| Public production-build crawl | All 242 sitemap pages returned 200 with no visible independent-product branding or links |
| Legacy entry routes | 11 product entry routes, including the product manifest, returned neutral 404s |
| Mobile | 390px homepage had no horizontal overflow; mobile navigation opened; sign-in and profile surfaces reviewed |
| Automated accessibility | Zero axe violations for WCAG A/AA tags on homepage, pricing calculator, help form, sign-in and quote builder at mobile size |
| Browser errors in main flow | No uncaught page errors |
| Private static review | 30 production-built public pages exported; mobile navigation and hydrated calculator tested; review-only banner confirmed |

## Existing test failures

- `src/server/circle-card/commission.service.test.ts`: the existing ledger idempotency fixture expects one eligible referral but the existing service reports zero. Both service and fixture remain unchanged; commissions are explicitly outside this change's scope.
- `tests/verify-circle-card-schema.test.ts`: the existing tsx CLI subprocess cannot create its Unix IPC pipe in this execution environment (`listen EPERM`). The same failure occurs on unchanged main. This is not a database schema failure.

The release is not described as a completely green test suite. Resolve or explicitly disposition the baseline failures before production approval; do not conceal them by disabling tests.

## Verification limits

The full introduction flow passed using PGlite/PostgreSQL WASM with a socket multiplexer, synthetic users and the actual browser/API/application layers. This is useful local integration evidence, not a substitute for ordinary PostgreSQL staging under realistic concurrency. The legacy paid dashboard encountered the test database's prepared-statement multiplexing limitation (`unnamed prepared statement does not exist` / mismatched bind parameter counts). Preserve the existing code and verify that screen, subscription portal and contracted member routes against ordinary staging PostgreSQL before release.

Free member mobile sign-in, dashboard and profile checks passed. Existing entitled accounts reached the new account screens; their legacy service/billing journey still needs the ordinary PostgreSQL staging check above. No real customer credentials, customer private pages or live billing mutation were tested.

The production-build crawl was sent the expected HTTPS proxy header while running locally. A canonical-host browser mapping was also used for authenticated production checks. The staging reverse proxy must supply trustworthy forwarding headers; do not weaken HTTPS or canonical-host validation to hide deployment configuration errors.

Automated accessibility sampling is not a full WCAG certification. Keyboard, screen-reader and broader device testing with actual owners should be part of the controlled launch. Public crawl results cover the source's sitemap and empty/synthetic database, not unpublished or private production records.

## Reproduce the core checks

```bash
npm ci
npm run db:generate
npx tsc --noEmit
npm run lint
npx vitest run src/lib/bcn-v2 src/server/bcn-v2 src/app/api/bcn/register/route.test.ts
npm test
npm run build
```

Use a dedicated synthetic PostgreSQL environment and the deployment settings described in the migration runbook. Enable the feature for both build and runtime to test the new public pages. Keep the separate product's build/configuration unchanged. The new admin view is `/admin/bcn-help`.
