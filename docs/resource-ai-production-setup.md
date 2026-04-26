# Resource AI production setup

Put the real OpenAI API key only in the production server environment, such as the production `.env` file used by PM2. Do not commit it to GitHub, do not add it to `.env.example`, and do not expose it through any `NEXT_PUBLIC_` variable.

Required production values:

```env
RESOURCE_GENERATION_PROVIDER="openai"
OPENAI_API_KEY="PASTE_REAL_KEY_ON_SERVER_ONLY"
RESOURCE_CONTENT_MODEL="gpt-5.4-mini"
RESOURCE_IMAGE_MODEL="gpt-image-2"
RESOURCE_IMAGE_SIZE="1024x1024"
RESOURCE_IMAGE_QUALITY="medium"
```

After changing the production environment, rebuild if needed and restart PM2 with updated env:

```bash
npm run db:generate
npm run build
pm2 restart the-business-circle-network --update-env
```

Before generating real backfill images, run a dry run first:

```bash
npx tsx scripts/backfill-resource-images.ts --dry-run --published-only --limit 5
```
