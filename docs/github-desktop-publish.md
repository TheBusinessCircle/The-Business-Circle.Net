# Publish This Project With GitHub Desktop

This project is now prepared for GitHub publishing:

- `.env` is ignored, so secrets stay local
- `.env.example` is included, so the repo stays shareable
- `node_modules`, `.next`, build output, and local tooling folders are ignored
- GitHub Actions CI is included in `.github/workflows/ci.yml`

## Important distinction

GitHub will hold the code.

GitHub will **not** run this full-stack platform by itself. This app still needs:

- a PostgreSQL database
- environment variables
- a deployment host or server

For the live deployment steps, use:

- [deployment-runbook.md](./deployment-runbook.md)

## Publish with GitHub Desktop

1. Open GitHub Desktop.
2. Select `File` -> `New repository`.
3. Use this folder as the local path:
   - `C:\The Business Circle\The Business Circle.Net`
4. Set the repository name.
   - Recommended: `the-business-circle-network`
5. Do **not** add a new README, `.gitignore`, or license in the setup form.
   - Those files already exist here.
6. Create the repository.
7. Review the changed files in GitHub Desktop.
   - You should **not** see `.env`, `.next`, `node_modules`, or `.sandbox`.
8. Commit everything to the `main` branch.
9. Click `Publish repository`.
10. Keep it `Private` unless you explicitly want the code public.

## After publishing

Once the repository is on GitHub, you can deploy from that repo using your preferred host.

Typical flow:

1. Push the code to GitHub.
2. Create a production database.
3. Add the production environment variables.
4. Connect the repository to your host or server.
5. Run the deployment steps from the runbook.

## CI included

The repository includes a GitHub Actions workflow that:

- installs dependencies
- generates Prisma client
- applies migrations against a temporary Postgres service
- runs tests
- runs a production build

That gives you a clean baseline check every time you push changes.
