# Hucknall native hub live acceptance: 3 November 2026

The user supplied server output showing successful deployment to `/var/www/releases/circle-card-hucknall-20261103-100951`, service `circle-card-hucknall-20261103-100951.service`. The previous public release remains on port 3374. Nginx rollback: `/var/lib/circle-card-hucknall/20261103-100951/nginx.previous.conf`. The supplied install command pinned source ref `0ecb6fd9d4f4557cd5fa8e12d3e64b8544c555df`.

Historical service retirement completed before the build. The displayed output retained the live private-preview release and its immediate predecessor, retained release files, and reported about 9.1 GiB available RAM. Retirement restore record: `/var/lib/circle-card-hucknall/retire-20261103-100946/services.json`. The build then used a 3072 MiB heap and the installer reported compiled release, native identity activation, publication, Discover ON and successful Nginx checks.

## Independently observed in the live browsers

- The canonical public hub loads while signed out, without authentication, at https://circlecard.co.uk/card/hucknall-circle-hub . The page has the intended Hucknall presentation, real empty directory, standard Spin, Save to Wallet, share, contact and QR controls, and no illustrative business listings.
- The signed-in owner's workspace lists Hucknall Circle Hub alongside the existing ScaleSmiths and Trevor Newton cards. Selecting the native hub shows PUBLIC CARD and Discover: On. The original prepared draft remains separately present.
- The public About page loads while signed out. It contains the researched town, heritage, market, travel and joining content and source links. Its canonical is the About URL; robots metadata is `index, follow`; JSON-LD contains WebSite and AboutPage entities.
- Public robots.txt advertises the dedicated hub sitemap and allows hub/About content while excluding the authenticated join route. The sitemap displays the two public canonical URLs. These are crawlability checks, not evidence of actual Google indexing.
- At a 390 by 844 viewport the public hub has no horizontal overflow; document width and scroll width both measured 375 CSS pixels excluding the scrollbar. The browser viewport override was reset afterwards.
- Signed-out Spin opens the standard acquisition modal with signup and sign-in links returning to the hub. Save to Wallet navigates to sign-in with the hub return path.
- The signed-in free join page loads and offers the owner's eligible ScaleSmiths card, postcode/category fields and explicit Discover consent. No data was submitted and no existing business was enrolled merely to manufacture a test listing.
- The Lawrence Severn custom private preview and Precision Pro private preview still render their expected business content.

## Outstanding acceptance and polish

- Actual Wallet save/remove and an accepted connection must still be tested from a different signed-in account. Owner self-save is correctly replaced with Back to My Card; no second test account was available in the active sessions.
- No businesses are enrolled yet. Live directory membership and its reciprocal badge require a real, consenting NG15 business; policy, query, privacy and rendering tests cover the implementation but are not a live enrolment acceptance test.
- The workspace's card counter still reads 3 of 2 because it does not label the sponsored community identity separately. The exact-ID entitlement exception keeps the hub and the two existing cards accessible; counter presentation remains to polish.
- General postcode capture/enforcement across every older live signup/editor is broader integration work. The dedicated authenticated join route is deployed now.
