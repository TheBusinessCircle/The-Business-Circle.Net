export const CIRCLE_CARD_LINK_ACTION_MODES = ["AUTO", "VIEW", "DOWNLOAD"] as const;

export type CircleCardLinkActionMode = (typeof CIRCLE_CARD_LINK_ACTION_MODES)[number];
export type CircleCardResolvedFileAction = "VIEW" | "DOWNLOAD";
export type CircleCardDetectedFileKind = "PDF" | "HTML" | "JPG" | "PNG" | "WEBP" | "ZIP" | "UNKNOWN";

export const CIRCLE_CARD_SUPPORTED_LINK_FILE_MIME_TYPES = [
  "application/pdf",
  "text/html",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed"
] as const;

export const CIRCLE_CARD_SUPPORTED_LINK_FILE_EXTENSIONS = [
  ".pdf",
  ".html",
  ".htm",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".zip"
] as const;

export const CIRCLE_CARD_LINK_FILE_MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".html": "text/html",
  ".htm": "text/html",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".zip": "application/zip"
};

type CircleCardFileDetectionInput = {
  fileMimeType?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
};

type CircleCardFileActionInput = CircleCardFileDetectionInput & {
  actionMode?: string | null;
};

type CircleCardFileLabelInput = CircleCardFileActionInput & {
  linkType?: string | null;
  label?: string | null;
  buttonText?: string | null;
};

const VIEWABLE_FILE_KINDS = new Set<CircleCardDetectedFileKind>(["PDF", "HTML", "JPG", "PNG", "WEBP"]);

function extensionFromValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const cleanValue = value.split(/[?#]/)[0] ?? value;
  const match = cleanValue.match(/\.([a-z0-9]+)$/i);
  return match ? `.${match[1].toLowerCase()}` : "";
}

function normalizedActionMode(value?: string | null): CircleCardLinkActionMode {
  return CIRCLE_CARD_LINK_ACTION_MODES.includes(value as CircleCardLinkActionMode)
    ? (value as CircleCardLinkActionMode)
    : "AUTO";
}

export function detectCircleCardFileKind(input: CircleCardFileDetectionInput): CircleCardDetectedFileKind {
  const mimeType = input.fileMimeType?.trim().toLowerCase();

  if (mimeType === "application/pdf") {
    return "PDF";
  }

  if (mimeType === "text/html") {
    return "HTML";
  }

  if (mimeType === "image/jpeg") {
    return "JPG";
  }

  if (mimeType === "image/png") {
    return "PNG";
  }

  if (mimeType === "image/webp") {
    return "WEBP";
  }

  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") {
    return "ZIP";
  }

  const extension = extensionFromValue(input.fileName) || extensionFromValue(input.fileUrl);

  switch (extension) {
    case ".pdf":
      return "PDF";
    case ".html":
    case ".htm":
      return "HTML";
    case ".jpg":
    case ".jpeg":
      return "JPG";
    case ".png":
      return "PNG";
    case ".webp":
      return "WEBP";
    case ".zip":
      return "ZIP";
    default:
      return "UNKNOWN";
  }
}

export function circleCardFileKindLabel(kind: CircleCardDetectedFileKind) {
  return kind === "UNKNOWN" ? "Unknown" : kind;
}

export function isCircleCardFileViewable(input: CircleCardFileDetectionInput) {
  return VIEWABLE_FILE_KINDS.has(detectCircleCardFileKind(input));
}

export function recommendedCircleCardFileAction(input: CircleCardFileDetectionInput): CircleCardResolvedFileAction {
  return isCircleCardFileViewable(input) ? "VIEW" : "DOWNLOAD";
}

export function resolveCircleCardFileAction(input: CircleCardFileActionInput): CircleCardResolvedFileAction {
  const actionMode = normalizedActionMode(input.actionMode);

  if (actionMode === "DOWNLOAD") {
    return "DOWNLOAD";
  }

  if (actionMode === "VIEW") {
    return isCircleCardFileViewable(input) ? "VIEW" : "DOWNLOAD";
  }

  return recommendedCircleCardFileAction(input);
}

export function circleCardFileActionLabel(action: CircleCardResolvedFileAction) {
  return action === "VIEW" ? "View" : "Download";
}

function cleanActionNoun(label?: string | null) {
  return (label ?? "")
    .trim()
    .replace(/^(download|view|open)\s+/i, "")
    .replace(/^(pdf|html|image|zip)\s+/i, "")
    .replace(/\s+(pdf|html|image|zip)$/i, "")
    .replace(/\s+/g, " ");
}

function fallbackFileNoun(input: CircleCardFileLabelInput) {
  const linkType = input.linkType ?? "";
  const kind = detectCircleCardFileKind(input);

  if (linkType === "MENU") {
    return "Menu";
  }

  if (linkType === "CASE_STUDY") {
    return "Case Study";
  }

  if (kind === "HTML") {
    return "Audit";
  }

  if (kind === "PDF") {
    return "PDF";
  }

  if (kind === "ZIP") {
    return "File";
  }

  if (kind === "JPG" || kind === "PNG" || kind === "WEBP") {
    return "Image";
  }

  return "File";
}

export function buildCircleCardFileActionLabel(input: CircleCardFileLabelInput) {
  const explicitButtonText = input.buttonText?.trim();
  if (explicitButtonText) {
    return explicitButtonText;
  }

  const action = resolveCircleCardFileAction(input);
  const kind = detectCircleCardFileKind(input);
  const noun = cleanActionNoun(input.label) || fallbackFileNoun(input);
  const normalizedNoun = noun.toLowerCase();

  if (action === "DOWNLOAD") {
    return normalizedNoun === "file" ? "Download File" : `Download ${noun}`;
  }

  if (input.linkType === "MENU") {
    return "View Menu";
  }

  if (input.linkType === "CASE_STUDY") {
    return "View Case Study";
  }

  if (kind === "HTML") {
    return normalizedNoun.includes("audit") ? `Open ${noun}` : `Open ${noun}`;
  }

  if (normalizedNoun.includes("audit")) {
    return `Open ${noun}`;
  }

  return `View ${noun}`;
}
