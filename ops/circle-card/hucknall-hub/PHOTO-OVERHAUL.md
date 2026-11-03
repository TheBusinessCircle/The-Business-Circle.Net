# Hucknall photographic presentation

Prepared after the first public hub's visual review. This update is not deployed until the new pinned native installer completes.

- Hucknall town-centre photography fills the hero, with a forest-green overlay, warm stone/gold type and a compact local identity panel.
- St Mary Magdalene replaces the platform logo within the hub's existing Spin control and in the hub's persisted public profile/logo fields. Normal Spin, Wallet, share and connection server actions are retained.
- A town gallery introduces church/heritage, High Street and Titchfield Park photographs, with visible source, photographer, date and CC BY-SA 2.0 credit links. Historical photographs are dated; no current scene, photographer endorsement or official council status is implied.
- Directory rows now include the canonical public business logo, falling back to the public profile image. The card renderer provides initials if the image is absent or fails. No private upload URL or additional owner details are fetched for the directory.
- The stage downloads the four JPEGs from the reviewed Wikimedia URLs into its own public directory before building. Downloads have strict origin, file-size and JPEG checks. A failed download stops deployment before switching the live release. Visitors load the photographs from Circle Card itself.

Validation: focused hub presentation and directory tests; guarded native patch tests; TypeScript and ESLint; isolated Next.js production client build. Live image loading, mobile appearance and real enrolled-business image rendering still require acceptance after deployment. The earlier native identity remains the same account/card and the original design draft remains private.
