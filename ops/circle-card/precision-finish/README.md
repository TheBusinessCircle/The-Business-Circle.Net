# Precision Finish: native shared business Circle Card

Run `install.py --ref <pinned-40-character-commit>` from the existing root SSH session after verifying the downloaded installer checksum. Keep the SSH window open until it returns.

The installer stages the current production release instead of deploying this repository's older shared app source. It adds only the scoped Precision renderer, its stylesheet/gallery, the guarded patch and the activation snapshot/script. The existing public card renderer retains all other businesses, the local hub and native account/connection functionality.

The public URL after a successful installation is:

`https://circlecard.co.uk/card/precision-finish-plastering-rendering-ecb582748528`

Shared editing uses the existing editor route:

`/app/shared/cmvwefhtp00csu7ahdicybag5`

Ged is the native business card's owner. Harrison is its active shared editor. Existing personal cards, billing, complimentary grants, account credentials, private contacts, referrals and other businesses are not modified. Discover remains off unless the business later opts in.

## Verification

Before a traffic switch the installer requires a completed build and action-export verification, signed-out login protection on both editors, both existing accounts passing the current shared-card authorization rule, the bespoke marker and expected CTAs in the public HTML, both personal URLs returning successfully and the business vCard returning successfully.

Each installation writes a root-only directory under `/var/lib/circle-card-precision/<timestamp>` with `build.log`, `native-before.json`, `activation.json`, `nginx.previous.conf` and `deployment.json`. Build errors print only the last ten redacted lines. Never publish these operational files or their database snapshots.

The normal runtime role keeps its existing permissions. Shared access-control writes run in a short local PostgreSQL administrator transaction, only after the backup has been saved. No migrations, package upgrades, password resets, emails or subscription changes are part of this installer.

Production visual and signed-in editing acceptance remain required after the command succeeds. A successful installer receipt is not proof of a save performed from each user's own session.

## Preparation checks

```bash
node --test ops/circle-card/precision-finish/test_activation.mjs
python3 -m unittest discover -s ops/circle-card/precision-finish -p 'test_*.py'
npx vitest run src/components/circle-card/precision/precision-business-card.test.ts
```
