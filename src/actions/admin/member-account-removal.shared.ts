const DELETION_CONFIRMATION_BYPASS_EMAILS = new Set([
  "trev@vuicevapes.com",
  "tr3vornewton@gmail.com",
  "tr3vornewton@hotmail.co.uk",
  "you@me.com",
  "me@you.com"
]);

export function canBypassDeleteConfirmation(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return DELETION_CONFIRMATION_BYPASS_EMAILS.has(email.trim().toLowerCase());
}
