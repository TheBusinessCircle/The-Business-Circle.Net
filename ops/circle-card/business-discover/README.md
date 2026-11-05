# Business Discover onboarding defaults

Selecting Business in first-card onboarding enables Discover and shows an editable
checkbox immediately. Explicit choices survive step changes and draft saves.
Existing Business draft preferences are loaded unchanged. Published cards cannot
be changed through this onboarding endpoint.

Drafts are excluded from Discover and local hubs by their unpublished state.
The saved preference takes effect only when the owner publishes. No database
migration or bulk update of existing cards is included.

The installer copies the active release and patches four onboarding files.
It retains existing Hucknall postcode/category additions, custom previews,
commissions navigation and the protected runtime launcher. It builds before
switching nginx and restores the previous nginx config if switch checks fail.
Source anchors that differ from the supported versions stop the deployment.

Local validation: onboarding/discovery unit tests, local-hub visibility tests,
patch compatibility tests and TypeScript/TSX syntax checks. A production build
and authenticated visual acceptance remain server-side deployment checks.

Next roadmap priority: finish and verify the business-card scanner invitation
and owner-claim journey, starting with one end-to-end card before a club wallet.
Automatic invitation sending is not part of this Discover update.
