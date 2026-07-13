import type { NextAuthConfig } from "next-auth";
import { logServerError, logServerWarning } from "@/lib/security/logging";

type AuthLogger = Required<NonNullable<NextAuthConfig["logger"]>>;

/**
 * Auth.js errors can contain attacker-controlled URLs, cookies and malformed
 * request bodies in their message, cause or stack. Never forward the supplied
 * values to application logging. All methods are present so Auth.js cannot
 * fall back to its more verbose default logger for an omitted level.
 */
export const safeAuthLogger: AuthLogger = {
  error() {
    logServerError("auth-request-failed", new Error("Authentication request failed."));
  },
  warn() {
    logServerWarning("auth-runtime-warning");
  },
  debug() {
    // Intentionally disabled. Auth.js debug metadata may contain credentials.
  }
};
