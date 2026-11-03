# Connect the Hucknall Hub design to Trev's private draft

The existing saved draft is `cmvzwzm3y000amkahigz25s8r`, slug `hucknall-circle-hub-40f0517a277b`. The standard card was saved successfully, but that alone did not connect the separately built hub design. This scoped installer supplies that missing connection.

It identifies the active Circle Card release from its Nginx proxy and protected systemd launcher, clones that release, and copies exactly three files: the hub component, private preview wrapper, and pure local-hub helpers. It adds one guarded branch to the existing prepared-card preview after the authenticated owned-card lookup. Only the exact draft ID and slug use the hub design. Existing bespoke-card rendering remains in place.

The private presentation uses clearly labelled illustrative listings so its search and category navigation can be demonstrated before local businesses enrol. It hides public sharing and signup actions. No database migration, account change, invitation, billing change or public launch is performed by this installer.

Run `install-private-preview.py --ref <pinned-40-character-commit>` inside the existing root SSH session. The server requires at least 4 GiB available RAM for the staged build. The installer stops if it cannot identify the current release, if the preview source has changed, if protected launcher checks differ, or if the build or health checks fail. It prints the staged build log location and keeps the old release available for rollback.

After a successful deployment, verify the existing signed-in private preview on phone and desktop. The headline must say “Hucknall. All together.”, category tiles must filter the sample cards, and the page must identify the listings as illustrative. Check the butcher and Precision previews too. No claim of installation or live acceptance should be made until those checks have completed.

The production NG15 enrolment and real-business directory code remains a separate launch integration. This private draft is for presentation, with no businesses falsely shown as having joined.
