const CONNECTION_WIN_HEADINGS = {
  happened: "What happened",
  connectedWith: "Who did you connect with",
  changed: "What changed",
  result: "What is the result so far"
} as const;

const CONNECTION_WIN_SECTION_PATTERN =
  /^What happened\s*\n([\s\S]*?)\n\s*Who did you connect with\s*\n([\s\S]*?)\n\s*What changed\s*\n([\s\S]*?)\n\s*What is the result so far\s*\n([\s\S]*)$/i;

export const CONNECTION_WIN_TAG = "connection-win";
export const CONNECTION_WIN_INTERNAL_TAGS = new Set([
  CONNECTION_WIN_TAG,
  "inside-circle",
  "member-win"
]);

export type ConnectionWinInput = {
  whatHappened: string;
  whoConnectedWith: string;
  whatChanged: string;
  resultSoFar: string;
};

export type ParsedConnectionWin = ConnectionWinInput & {
  summary: string;
};

function normalizeLine(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength).trim();
}

function truncateSentence(value: string, maxLength: number) {
  const normalized = normalizeLine(value, maxLength + 24);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 48 ? lastSpace : truncated.length).trim()}...`;
}

export function isConnectionWinTags(tags: string[]) {
  return tags.includes(CONNECTION_WIN_TAG);
}

export function buildConnectionWinTitle(input: ConnectionWinInput) {
  const preferred =
    normalizeLine(input.whatChanged, 96) ||
    normalizeLine(input.resultSoFar, 96) ||
    normalizeLine(input.whatHappened, 96);

  if (!preferred) {
    return "Connection win inside the Circle";
  }

  return truncateSentence(preferred, 76);
}

export function serializeConnectionWin(input: ConnectionWinInput) {
  return [
    CONNECTION_WIN_HEADINGS.happened,
    input.whatHappened.trim(),
    "",
    CONNECTION_WIN_HEADINGS.connectedWith,
    input.whoConnectedWith.trim(),
    "",
    CONNECTION_WIN_HEADINGS.changed,
    input.whatChanged.trim(),
    "",
    CONNECTION_WIN_HEADINGS.result,
    input.resultSoFar.trim()
  ].join("\n");
}

export function buildConnectionWinTags() {
  return [CONNECTION_WIN_TAG, "inside-circle", "member-win"].join(", ");
}

export function parseConnectionWin(content: string, tags: string[]): ParsedConnectionWin | null {
  if (!isConnectionWinTags(tags)) {
    return null;
  }

  const match = content.trim().match(CONNECTION_WIN_SECTION_PATTERN);
  if (!match) {
    return null;
  }

  const [, whatHappened, whoConnectedWith, whatChanged, resultSoFar] = match;
  const summary = truncateSentence(
    `${normalizeLine(whatChanged, 140)} ${normalizeLine(resultSoFar, 140)}`.trim(),
    180
  );

  return {
    whatHappened: whatHappened.trim(),
    whoConnectedWith: whoConnectedWith.trim(),
    whatChanged: whatChanged.trim(),
    resultSoFar: resultSoFar.trim(),
    summary
  };
}

export function buildConnectionWinPreview(content: string, tags: string[]) {
  const parsed = parseConnectionWin(content, tags);

  if (!parsed) {
    return null;
  }

  return parsed.summary || truncateSentence(parsed.whatHappened, 180);
}
