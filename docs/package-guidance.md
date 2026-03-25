# Package Guidance

This project follows a layered architecture to keep features scalable and maintainable.

## Package and Module Boundaries

- `src/app`: Route handlers and page composition only.
- `src/components`: Reusable UI and shells (no direct DB writes).
- `src/actions`: Server Actions grouped by domain.
- `src/server`: Domain services, repositories, and policy guards.
- `src/lib`: Shared framework-level utilities (`db`, auth helpers, Stripe helpers).
- `src/config`: Typed runtime-safe site and membership configuration.
- `src/types`: Shared domain contracts and view model types.
- `prisma`: Data model and seed scripts.

## Scalability Rules

1. Keep DB access inside `src/server/repositories` or `src/lib/db.ts` consumers.
2. Keep route handlers thin by delegating business logic to `src/server/services`.
3. Reuse typed contracts from `src/types` to avoid duplicate interfaces.
4. Keep Stripe operations centralized in `src/server/stripe` and `src/server/subscriptions`.
5. Keep role/tier policy checks in one place (`src/server/auth/guards.ts`).

## Naming Convention

- Components: `PascalCase`.
- Hooks: `useXxx`.
- Server services: `xxx.service.ts`.
- Repositories: `xxx.repository.ts`.
- Config objects: `UPPER_SNAKE_CASE` keys with `as const` typing.