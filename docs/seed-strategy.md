# Seed Strategy

## Modes

- `bootstrap` (default)
  - Seeds platform-critical lookup/config data only:
    - categories
    - channels
    - site content placeholders
    - optional admin account if `ADMIN_EMAIL` is set

- `demo`
  - Runs everything in `bootstrap`
  - Intended to add richer sample data (members, resources, events, message history)
  - Currently scaffolded but intentionally minimal until fixtures are defined

- `production`
  - Runs only stable system seeds and optional admin account
  - Avoids test/demo fixtures

## Principles

1. Idempotent: use `upsert` for all seed writes.
2. Deterministic: use stable `slug`/unique keys for repeatability.
3. Environment-aware: use `SEED_MODE` and env flags for behavior.
4. Safe for CI and local: no destructive resets in the seed script.
5. Progressive fixtures: keep demo content in separate modules so it can evolve independently.

## Recommended Evolution

1. Keep `prisma/seeds/bootstrap.ts` lightweight and permanent.
2. Expand `prisma/seeds/demo.ts` with realistic network scenarios.
3. Add domain fixture modules (`demo-members.ts`, `demo-resources.ts`, `demo-events.ts`) when needed.
4. Add `SEED_DEMO_RESET=true` only if you later need controlled wipe/reseed behavior.