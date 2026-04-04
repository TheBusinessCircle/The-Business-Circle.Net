type SafeLogValue = string | number | boolean | null | undefined;

export type SafeLogDetails = Record<string, SafeLogValue>;

function compactDetails(details?: SafeLogDetails) {
  if (!details) {
    return undefined;
  }

  const entries = Object.entries(details).filter(([, value]) => value !== undefined);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function summarizeError(error: unknown): SafeLogDetails {
  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: unknown };
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorCode: typeof errorWithCode.code === "string" ? errorWithCode.code : undefined,
      errorStack:
        process.env.NODE_ENV !== "production"
          ? error.stack
              ?.split("\n")
              .map((line) => line.trim())
              .slice(0, 8)
              .join(" | ")
          : undefined
    };
  }

  return {
    errorType: typeof error
  };
}

export function logServerError(
  event: string,
  error: unknown,
  details?: SafeLogDetails
) {
  console.error(`[server] ${event}`, {
    ...compactDetails(details),
    ...summarizeError(error)
  });
}

export function logServerWarning(event: string, details?: SafeLogDetails) {
  const payload = compactDetails(details);

  if (payload) {
    console.warn(`[server] ${event}`, payload);
    return;
  }

  console.warn(`[server] ${event}`);
}
