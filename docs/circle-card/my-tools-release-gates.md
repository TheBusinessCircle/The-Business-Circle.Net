# Circle Card My Tools — staged delivery & safety gates
Date: 12 November 2026
Branch: feature/circle-card-my-tools-foundation-20261112
Draft PR: #26
Live public release before this branch: One Connected Ecosystem, approved BUILD_ID IlUYNmvKirPq-sFwpeimH

## Founder-approved product rules
1. My Tools has two initial **catalogue filters**, Creator and Business. Both are visible and selectable to **every account**. Neither imposes a permanent account type restriction.
2. A user's chosen set of tools is **card-scoped and portable across category filters**. A tool must not disappear merely because a user switches filters.
3. Free and Pro both have **unlimited standard links** (no marketing plan cap). This branch carries forward the verified production ecosystem patch. It MUST NOT regress.
4. Pro (£9.99/month) earns value from enhanced editing, presentation, analytics and working modules; not from link caps.
5. Bespoke custom-card design is a **£49.99 one-time add-on available for purchase only while Pro is active**. Free accounts must not see or call the purchase option. A server-side entitlement check is mandatory before quote request, checkout creation and fulfilment. Paid design data remains stored but the Pro-only presentation is disabled after Pro ends and restored upon renewal.
6. Existing paid customers, custom designs, card data, subscriptions, wallet contacts, referrals, commissions and existing public URLs must not be broken or destructively migrated.

## Release 1: My Tools foundation (this draft PR)
- New authenticated /dashboard/circle-card/tools route; two accessible filter links and catalogue search.
- Launch with 24 tools listed in a typed, testable registry: editor, recovery, or future.
- Save chosen shortcuts for a card in its existing contentBlocks.myTools without a schema migration.
- Save tools from either filter on the same card, even if the existing editor currently only supports the original card type.
- **Pinning means saved workspace shortcut only**. It does NOT enable or disable public content or override paid access.
- Reuse existing editor paths only when present, plan-eligible and card-type compatible. No fake activations or dead file-upload buttons.
- Authenticated action validates card ownership and active plan card limit before changing saved shortcut data.
- Link from existing current-card selector.
- Existing files and scan routes unchanged; no email sent, checkout started, or production changes.
- Unit tests cover cross-category persistence, unknown IDs, JSON preservation, safety and Pro editor gates.
- CI checks and signed-in preview QA must pass before considering release.

### Release 1 acceptance
- Free account: browse both filters, save/remove tools, access existing Free-eligible tools, no paid editor bypass, unlimited standard links remain.
- Pro account: existing active Pro modules open from My Tools; saved list persists across page loads and category changes.
- Account with two cards: saved tools remain independent; downgrade-locked second card cannot be modified via crafted form POST.
- Existing business and creator block data remains byte-for-byte logically intact when updating tools.
- No created/modified user payments, subscriptions, actual files, email invitations, moderation state, or live database migration.

## Release 2: true mixed-type tools (not implemented yet)
Currently some business action handlers and public rendering explicitly require cardType BUSINESS. Creator editors and renderers also use cardType CREATOR. The new My Tools shelf deliberately does not pretend those restrictions are solved.

Before promoting cross-type capability, inspect every writer, reader, public mapper, renderer, entitlement gate, builder component, analytics event and downgrade path. Changes must be compatible with PERSONAL, BUSINESS and CREATOR layouts and existing records.

- Creator + business modules on same card can be edited, toggled and publicly displayed with real persistent data.
- Creator still gets all Creator tools after adding Business tools; Business still gets all Business tools after adding Creator tools.
- No cross-card data leakage, backend authorization bypass or different limits for equivalent plans.
- Publish/unpublish choices for tool sections are explicit and reversible.

## Release 3: scanner -> wallet -> claim (recovery, not deployed)
Repo components already include BusinessCardScanner, /api/circle-card/business-card-scan, matching, scanned wallet contacts and a claim-token generator. The current claim link pre-fills /register; evidence of automatic email plus verified ownership handover is absent.

- Validate scan image type/size and privacy before extraction.
- User reviews parsed company email and details **before an invitation is sent**.
- Consent/responsible outreach: one clearly identified contact invite, no spam or email harvesting, visible sender/opt-out, per-user and per-address rate limits, expiry and suppression lists.
- Secure, expiring single-use token linked to verified recipient email; ensure claim cannot give a stranger control of existing cards or someone else's private contacts.
- No public page fabricated from an unclaimed scanned business card.
- Explicitly verify SMTP/provider config with safe test domain before switching production emails on.
- Mobile camera, desktop upload, OCR provider fallback, duplicate detection, wallet saving, generated-link and claimed-account journeys verified end-to-end.
- Preserve scanner access for Free unless user changes policy.

## Release 4: secure file sharing (DISABLED until audited)
At audit, CIRCLE_CARD_LAUNCH_FILE_LINKS_ENABLED=false. The old implementation contains 10 MB file limits, extension/MIME allow lists, conditional private-code access, response CSP / nosniff, but **not proven explicit-content moderation and malware scanning**.

Do NOT set CIRCLE_CARD_LAUNCH_FILE_LINKS_ENABLED=true as a shortcut.

- Actual signature and file-content validation (never trust extension or client-supplied MIME).
- Queue/quarantine upload pending antivirus scanning and content moderation; reject/hold explicit or abusive images and forbidden media. Human review and appeal for ambiguous moderation.
- Proper isolation to prevent execution, SSRF, HTML/ZIP active content injection, scriptable SVG masquerades, zip bombs, malformed documents, dangerous links and exfiltration.
- Initial narrow allow list such as vetted PDF and re-encoded JPG/PNG/WebP. Leave ZIP, HTML and video disabled for initial restoration.
- Exif stripping on shared images, encrypted private storage, per-owner quotas, ownership checks, access expiry, signed tokens (not just 4-digit codes), audit logging and report/abuse/takedown process.
- Public and private sharing tests for owner, visitor, unauthorized, logged-out, downgrade and deleted links.
- Privacy/security reviews for file names, caches, referrer headers and disk paths.

## Release 5: Pro-only bespoke custom-card add-on
- Server verifies active Pro before displaying checkout and before charging/fulfilling bespoke design.
- Free sees only existing Pro upgrade elsewhere; no bespoke purchase action shown.
- £49.99 one-time fixed price with clear scope, design queue, delivery and refund terms.
- Cancel Pro preserves bespoke configuration privately; reactivating Pro restores it.
- Cannot regain paid design via old API, copied checkout URL or a manipulated request.

## Release 6: new tools
Wish Lists, donations/tips, streams, events, additional integrations, and Teams administration. Every tool needs explicit scope, data ownership, trust/safety review, pricing and functional tests before promotion from future to editor.

## Production release gate
- Treat the running Circle Card production at 3387 and rollback at 3386 as separate from this GitHub branch.
- Source patches and deployment candidates MUST be rebased/reconciled with actual live version; no direct overwrite of production from main.
- Verify fresh recoverable DB+app backups, all test suites, mobile usability, Free/Pro signed-in, public content, live SSL, backup and rollback plan.
- Deploy only via isolated build then guarded Nginx cutover; preserve previous running release and backup record.
- Never automatically send real external invitations, accept real payments, activate unsafe uploads or mutate real customer data during test.
