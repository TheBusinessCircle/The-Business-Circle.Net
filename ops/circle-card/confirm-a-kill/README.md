# Confirm A Kill private bespoke draft

Trev requested a Circle Card like Precision's, saved as a draft in his account only.

## Saved through the signed-in workspace

- Draft ID: `cmw2jnnc6005xzfahkcfm7q39`
- Stable slug: `confirm-a-kill-73f64ae9cc20`
- Builder: https://circlecard.co.uk/app/prepared/cmw2jnnc6005xzfahkcfm7q39
- Pro preview: https://circlecard.co.uk/app/prepared/cmw2jnnc6005xzfahkcfm7q39/preview?plan=pro
- Public-showcase checkbox remains off. No invitations or account grants.
- Saved eight services, four website images, five enquiry/proof links, official contact details and hours.
- The real site supplies navy `#101923` and yellow `#f4cb38`, plus a black logo. Public website images were imported to the connected Cloudinary account because Circle Card rejects arbitrary remote image hosts. The bullseye emblem was cropped and padded for the native spinning circle.
- Sources: official homepage, services, about and commercial pages, inspected 4 November 2026. Google Maps reviews CID copied from the official website. No rating or review count is represented as current.

## Template installation still required

The new bespoke component supplies a yellow masthead, photographic hero, prominent call/quote actions, Website followed immediately by Google reviews, services, home/business panels, gallery lightbox, process, about and contact sections. Native spin, save/share, trust and QR controls are reused. The authenticated prepared page verifies ownership, the exact persisted draft ID and slug, and the selected Pro plan before passing an explicit presentation flag. The renderer also checks the exact prepared route, demo flag and official HTTPS domain. It does not infer preview permission from a synthetic card ID or account entitlement. Public native cards and Free previews do not select this renderer.

`install-preview.py` copies the actual current live release, adds four scoped files, patches a checked renderer entry point and builds in isolation. It preserves Precision and existing native shared-card code. It checks authentication redirects and private public-route 404s, public Precision/ScaleSmiths/Hucknall/personal-card responses and compiled template presence before switching the application upstream. There are no database scripts, migrations, invitations, new memberships, subscription changes or card-publication actions. Failed builds retain the current serving release. The installer preserves the protected launcher and its billing checks.

After Trev runs the pinned installer, verify the authenticated Pro preview in the browser and that the private checkbox is still off. Do not describe the bespoke template as installed until those checks pass.

## First installation and preview-selector correction

Trev's installer output confirms installation at `/var/lib/circle-card-confirm-a-kill/20261104-201336`. The authenticated browser preview was refreshed and still showed the standard renderer. Compiled presence was therefore insufficient for acceptance. The initial selector incorrectly relied on fields of the synthetic presentation record. The corrected patch passes the owned draft ID and explicit selected plan from the existing protected prepared-page boundary, retaining its original authorization and every other custom branch. Regression tests cover upgrading the exact initial patch, preserving ownership lookup, Free/public exclusions and synthetic preview data. The corrective template build remains pending the next SSH run; no publication or account changes are required.
