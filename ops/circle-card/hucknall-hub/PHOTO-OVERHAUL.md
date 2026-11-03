# Hucknall photographic presentation

Prepared after the first public hub's visual review. This update is not deployed until the new pinned native installer completes.

- Hucknall town-centre photography fills the hero, with a forest-green overlay, warm stone/gold type and a compact local identity panel.
- St Mary Magdalene replaces the platform logo within the hub's existing Spin control and in the hub's persisted public profile/logo fields. Normal Spin, Wallet, share and connection server actions are retained.
- A town gallery introduces church/heritage, High Street and Titchfield Park photographs, with visible source, photographer, date and CC BY-SA 2.0 credit links. Historical photographs are dated; no current scene, photographer endorsement or official council status is implied.
- Directory rows now include the canonical public business logo, falling back to the public profile image. The card renderer provides initials if the image is absent or fails. No private upload URL or additional owner details are fetched for the directory.
- The stage downloads the four JPEGs from the reviewed Wikimedia URLs into its own public directory before building. Downloads have strict origin, file-size and JPEG checks. A failed download stops deployment before switching the live release. Visitors load the photographs from Circle Card itself.

Validation: focused hub presentation and directory tests; guarded native patch tests; TypeScript and ESLint; isolated Next.js production client build. Live image loading, mobile appearance and real enrolled-business image rendering still require acceptance after deployment. The earlier native identity remains the same account/card and the original design draft remains private.

## Deployment follow-up

The user supplied successful deployment output for release `circle-card-hucknall-20261103-121602`. Browser acceptance confirmed the new presentation and a real ScaleSmiths listing with its public image URL, plus the reciprocal membership link on the ScaleSmiths custom card. Town photo requests currently redirect to the homepage, so visual acceptance is incomplete.

`repair-photo-routes.py` serves exactly the four reviewed JPEGs through exact-match locations on the currently identified Circle Card Nginx server. It copies them from the deployed release into a stable root-owned public-photo directory, retains the existing app service, validates Nginx, reloads gracefully and verifies HTTP 200, JPEG content type and SHA-256 bytes through verified local TLS. Any verification failure restores the prior Nginx configuration. This requires no app build. Configuration-selection tests cover sibling vhost preservation, quoted braces, duplicate/unknown target refusal and exact route scope. The repair still requires execution and live acceptance.
