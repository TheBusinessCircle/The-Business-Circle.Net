# Circle Card registration manual test

Use an incognito/private browser and a completely new email address for each registration case.

## Direct registration

- Open `/register` without query parameters and confirm the free Circle Card form appears; it must not redirect to paid BCN membership selection.
- Submit once with an invalid email or weak password and confirm the field error is clear, non-sensitive fields remain filled, and the submit button is not double-clickable while loading.
- Register with valid details and confirm the account is created, automatic sign-in succeeds, and `/dashboard/circle-card/onboarding` opens.
- Complete onboarding once, refresh, and confirm only one Circle Card exists.
- Open the verification email, follow the newest link, confirm the success notice on login, then sign in and confirm Circle Card—not paid membership selection—is the destination.
- Log out and sign in again from `/login?from=/dashboard/circle-card`; confirm the Circle Card workspace opens.

## Public-card and Spin registration

- In a separate signed-in browser, open an existing user's published `/card/{slug}` and note the owning user/card for later database verification.
- In incognito, open that public card, use Spin To Connect, and choose **Create Free Circle Card**.
- Confirm the registration URL retains an internal card return path and source-card slug, then complete registration.
- Confirm the original public card reopens with `spin=return`, the new account has exactly one unpublished starter card, and Spin can create the connection.
- Confirm the growth-referral record points to the original referrer and originating card, has the new user only once, and remains unchanged after visiting a different referral link.
- Repeat with a missing or deliberately invalid referral/source-card value and confirm account creation still succeeds without a referral record.

## Recovery, duplicate, and mobile checks

- Attempt registration again with the same email and confirm the UI says the account already exists and offers sign-in/reset recovery.
- Open the newest verification email after requesting a resend; confirm older tokens do not become the active recovery path.
- At a narrow mobile viewport (for example 375 x 812), repeat direct registration and Spin registration; confirm all inputs, checkboxes, errors, buttons, modal actions, and links remain visible and tappable without horizontal scrolling.
- Try `returnTo=https://example.com`, `returnTo=//example.com`, and a backslash-host path; confirm all are ignored in favour of the Circle Card onboarding destination.
