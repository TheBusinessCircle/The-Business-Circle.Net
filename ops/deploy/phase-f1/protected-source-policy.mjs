import { basename } from "node:path";

export const PROTECTED_BACKUP_PATH =
  "/var/www/The-Business-Circle.Net/.env.backup-20260720-164833";
const PROTECTED_BACKUP_BASENAME = basename(PROTECTED_BACKUP_PATH);

export const PROTECTED_BACKUP_SOURCE_ID = "PROTECTED_BACKUP_SOURCE";
export const PROTECTED_BACKUP_DENIAL_CODE =
  "PROTECTED_BACKUP_SOURCE_DENIED";

export function isProtectedBackupSelector(candidate) {
  return (
    typeof candidate === "string" &&
    (candidate === PROTECTED_BACKUP_PATH ||
      basename(candidate) === PROTECTED_BACKUP_BASENAME)
  );
}
