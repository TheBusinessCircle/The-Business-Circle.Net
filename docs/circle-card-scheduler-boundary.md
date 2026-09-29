# Circle Card scheduler boundary

Circle Card owns exactly two scheduled HTTP jobs:

- `POST /api/internal/circle-card/activation-reminders/run`
- `POST /api/internal/circle-card/weekly-summary/run`

Both routes are available only when the server runtime brand is `circle-card` and require an
exact `Authorization: Bearer ...` credential matching the protected
`CIRCLE_CARD_SCHEDULER_SECRET` runtime value. Query-string, request-body, shared BCN
`CRON_SECRET`, and alternate-header credentials are not accepted. Other `/api/internal/**`
routes remain outside the Circle runtime allowlist.

The services retain their existing per-recipient sent-state protection. They do not currently
provide a global distributed run lock, so scheduler configuration should prevent overlapping
runs. A failed email is not recorded as sent, increments the job's `failed` count, and makes the
HTTP route return a retryable partial-failure response. A process interruption after
provider acceptance but before sent-state persistence can still produce a duplicate delivery;
that limitation must be considered during private candidate validation.

## Future production transfer sequence

This source contract does not configure scheduling. Transfer ownership only in a separately
authorised production operation:

1. Prove both authenticated endpoints against the private Circle candidate using synthetic or
   operator-approved recipients.
2. Confirm the Circle runtime, protected scheduler credential, Circle email identity, and
   canonical origin are ready.
3. Atomically retarget the scheduler to the Circle runtime without enabling a second owner.
4. Verify one controlled delivery cycle and its sent-state evidence.
5. Disable and then retire the legacy BCN scheduler ownership.

Never run both scheduler owners concurrently during the transfer.
