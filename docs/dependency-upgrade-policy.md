# Dependency Upgrade Policy

This project intentionally pins Auth.js and Prisma versions to reduce unexpected breakage:

- `next-auth` (Auth.js)
- `@auth/prisma-adapter`
- `prisma`
- `@prisma/client`
- `@prisma/adapter-pg`

## Why

Auth.js v5 and Prisma major releases can introduce behavior changes that affect login, session handling, and database operations. Pinned versions ensure production behavior stays stable between deployments.

## Monitoring cadence

Run this check once per week (or before any deployment):

```bash
npm run deps:check:critical
```

If packages are outdated, evaluate changelogs before upgrading.

## Safe upgrade workflow

1. Create a feature branch for dependency updates.
2. Upgrade only the pinned Auth/Prisma packages in one PR.
3. Regenerate Prisma client:
   - `npx prisma generate`
4. Run verification:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm run build`
5. Smoke test core flows:
   - Credentials login/logout
   - Protected route access checks
   - Community message read/write/delete
   - Resource hub and admin CMS
   - Stripe checkout + webhook sync in test mode
6. Deploy to staging first and re-run smoke tests.
7. Promote to production after staging passes.

## Rollback

If an upgrade breaks auth or database behavior:

1. Revert the dependency PR.
2. Re-run `npm install`.
3. Re-run `npx prisma generate`.
4. Redeploy with previous lockfile.
