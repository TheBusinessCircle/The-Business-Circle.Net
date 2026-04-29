# Next 16 Readiness Notes

The app is currently on Next 15.5.x. Keep these items in place before a future Next 16 upgrade:

- Use the ESLint CLI through `npm run lint` (`eslint .`) rather than `next lint`.
- Keep `eslint.config.mjs` as the single flat config entry point with project ignores for build output, public assets, and Prisma migrations.
- Re-run `npm run test`, `npm run lint`, and `npm run build` after any framework, React, or ESLint config change.
- Check CSP changes against checkout, auth redirects, Cloudinary-hosted media, Ably refresh events, and LiveKit calling before deploying.
