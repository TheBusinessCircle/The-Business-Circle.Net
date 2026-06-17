"use client";

import { useMemo, useState } from "react";
import { CircleCardImageUploadField } from "@/components/circle-card/circle-card-image-upload-field";
import { CircleCardLinkFileUploadField } from "@/components/circle-card/circle-card-link-file-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CIRCLE_CARD_LINK_ACTION_MODES,
  circleCardFileActionLabel,
  circleCardFileKindLabel,
  detectCircleCardFileKind,
  recommendedCircleCardFileAction,
  type CircleCardLinkActionMode
} from "@/lib/circle-card/file-actions";
import {
  CIRCLE_CARD_FILE_LINK_TYPES,
  CIRCLE_CARD_LINK_TYPES,
  CIRCLE_CARD_LINK_VISIBILITIES,
  type CircleCardLinkVisibility,
  type CircleCardLinkType
} from "@/lib/circle-card/schema";
import { Copy, KeyRound, RefreshCw } from "lucide-react";

type CircleCardSmartLinkFieldsProps = {
  idPrefix: string;
  defaultType?: string | null;
  defaultLabel?: string | null;
  defaultUrl?: string | null;
  defaultDescription?: string | null;
  defaultImageUrl?: string | null;
  defaultFileUrl?: string | null;
  defaultFileName?: string | null;
  defaultFileMimeType?: string | null;
  defaultButtonText?: string | null;
  defaultExpiresAt?: Date | string | null;
  defaultActionMode?: string | null;
  defaultVisibility?: string | null;
  defaultAccessCodeHint?: string | null;
  hasAccessCode?: boolean;
};

const LINK_TYPE_LABELS: Record<CircleCardLinkType, string> = {
  GENERAL: "General",
  BOOK_CALL: "Book a call",
  PORTFOLIO: "Portfolio",
  LATEST_OFFER: "Latest offer",
  COMMUNITY: "Community",
  DOWNLOAD: "Download",
  REVIEW: "Review",
  SHOP: "Shop",
  MENU: "Menu",
  CASE_STUDY: "Case study"
};

const LINK_TYPE_HELPERS: Record<CircleCardLinkType, string> = {
  GENERAL: "Add a useful external link for anything that does not need a specialist action.",
  BOOK_CALL: "Add your booking link so people can schedule time with you.",
  PORTFOLIO: "Point visitors to your portfolio, gallery or proof of work.",
  LATEST_OFFER: "Share a current offer and optionally add an end date for your own tracking.",
  COMMUNITY: "Send people to your group, newsletter, Discord, WhatsApp community or member space.",
  DOWNLOAD:
    "Upload a file such as an audit, brochure, menu or checklist. Visitors can download it from your public Circle Card.",
  REVIEW: "Add your review link so happy customers can leave feedback quickly.",
  SHOP: "Send visitors straight to your shop, product page or booking checkout.",
  MENU: "Add a menu URL or upload a menu file visitors can open from your public Circle Card.",
  CASE_STUDY: "Add a case study URL or upload a document that shows the result clearly."
};

const URL_LABELS: Record<CircleCardLinkType, string> = {
  GENERAL: "URL",
  BOOK_CALL: "Booking URL",
  PORTFOLIO: "Portfolio URL",
  LATEST_OFFER: "Offer URL",
  COMMUNITY: "Community URL",
  DOWNLOAD: "File URL",
  REVIEW: "Review URL",
  SHOP: "Shop URL",
  MENU: "Menu URL",
  CASE_STUDY: "Case study URL"
};

const VISIBILITY_LABELS: Record<CircleCardLinkVisibility, string> = {
  PUBLIC: "Public",
  PRIVATE_CODE: "Private with access code"
};

const ACTION_MODE_LABELS: Record<CircleCardLinkActionMode, string> = {
  AUTO: "Auto",
  VIEW: "View in Browser",
  DOWNLOAD: "Force Download"
};

const ACTION_MODE_HELPERS: Record<CircleCardLinkActionMode, string> = {
  AUTO: "Circle Card chooses the best experience based on file type.",
  VIEW: "Open file in browser where supported.",
  DOWNLOAD: "Always download."
};

function resolveLinkType(value: string | null | undefined): CircleCardLinkType {
  return CIRCLE_CARD_LINK_TYPES.includes(value as CircleCardLinkType)
    ? (value as CircleCardLinkType)
    : "GENERAL";
}

function resolveVisibility(value: string | null | undefined): CircleCardLinkVisibility {
  return CIRCLE_CARD_LINK_VISIBILITIES.includes(value as CircleCardLinkVisibility)
    ? (value as CircleCardLinkVisibility)
    : "PUBLIC";
}

function resolveActionMode(value: string | null | undefined): CircleCardLinkActionMode {
  return CIRCLE_CARD_LINK_ACTION_MODES.includes(value as CircleCardLinkActionMode)
    ? (value as CircleCardLinkActionMode)
    : "AUTO";
}

function generateFourDigitCode() {
  try {
    const bytes = new Uint16Array(1);
    window.crypto.getRandomValues(bytes);
    return (bytes[0] % 10_000).toString().padStart(4, "0");
  } catch {
    return Math.floor(Math.random() * 10_000).toString().padStart(4, "0");
  }
}

function dateInputValue(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function CircleCardSmartLinkFields({
  idPrefix,
  defaultType,
  defaultLabel = "",
  defaultUrl = "",
  defaultDescription = "",
  defaultImageUrl = "",
  defaultFileUrl = "",
  defaultFileName = "",
  defaultFileMimeType = "",
  defaultButtonText = "",
  defaultExpiresAt,
  defaultActionMode,
  defaultVisibility,
  defaultAccessCodeHint = "",
  hasAccessCode = false
}: CircleCardSmartLinkFieldsProps) {
  const [type, setType] = useState<CircleCardLinkType>(() => resolveLinkType(defaultType));
  const [visibility, setVisibility] = useState<CircleCardLinkVisibility>(() =>
    resolveVisibility(defaultVisibility)
  );
  const [actionMode, setActionMode] = useState<CircleCardLinkActionMode>(() =>
    resolveActionMode(defaultActionMode)
  );
  const [fileMetadata, setFileMetadata] = useState({
    fileUrl: defaultFileUrl ?? "",
    fileName: defaultFileName ?? "",
    fileMimeType: defaultFileMimeType ?? ""
  });
  const [generatedCode, setGeneratedCode] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const supportsFile = useMemo(
    () => CIRCLE_CARD_FILE_LINK_TYPES.includes(type as (typeof CIRCLE_CARD_FILE_LINK_TYPES)[number]),
    [type]
  );
  const requiresOfferDate = type === "LATEST_OFFER";
  const showsButtonText = type === "DOWNLOAD";
  const isPrivate = supportsFile && visibility === "PRIVATE_CODE";
  const detectedFileKind = detectCircleCardFileKind(fileMetadata);
  const recommendedAction = recommendedCircleCardFileAction(fileMetadata);

  function handleTypeChange(value: string) {
    const nextType = resolveLinkType(value);
    setType(nextType);

    if (!CIRCLE_CARD_FILE_LINK_TYPES.includes(nextType as (typeof CIRCLE_CARD_FILE_LINK_TYPES)[number])) {
      setVisibility("PUBLIC");
      setActionMode("AUTO");
      setGeneratedCode("");
      setCopyNotice("");
    }
  }

  function handleVisibilityChange(value: string) {
    const nextVisibility = resolveVisibility(value);
    setVisibility(nextVisibility);

    if (nextVisibility === "PUBLIC") {
      setGeneratedCode("");
      setCopyNotice("");
    }
  }

  function generateCode() {
    setGeneratedCode(generateFourDigitCode());
    setCopyNotice("");
  }

  async function copyGeneratedCode() {
    if (!generatedCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopyNotice("Code copied.");
    } catch {
      setCopyNotice("Copy unavailable.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/18 bg-gold/8 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-type`}>Link type</Label>
            <Select
              id={`${idPrefix}-type`}
              name="type"
              value={type}
              onChange={(event) => handleTypeChange(event.target.value)}
            >
              {CIRCLE_CARD_LINK_TYPES.map((option) => (
                <option key={option} value={option}>
                  {LINK_TYPE_LABELS[option]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <p className="rounded-2xl border border-silver/14 bg-background/18 p-3 text-xs leading-relaxed text-muted">
              {LINK_TYPE_HELPERS[type]}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-label`}>Label</Label>
          <Input
            id={`${idPrefix}-label`}
            name="label"
            defaultValue={defaultLabel ?? ""}
            placeholder={LINK_TYPE_LABELS[type]}
            maxLength={90}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-url`}>{URL_LABELS[type]}</Label>
          <Input
            id={`${idPrefix}-url`}
            name="url"
            type="url"
            defaultValue={defaultUrl ?? ""}
            placeholder={supportsFile ? "https://example.com/file-or-page" : "https://example.com"}
            required={!supportsFile}
          />
        </div>

        {supportsFile ? (
          <>
            <div className="space-y-2 md:col-span-2">
              <Label>File upload</Label>
              <CircleCardLinkFileUploadField
                defaultFileUrl={defaultFileUrl}
                defaultFileName={defaultFileName}
                defaultFileMimeType={defaultFileMimeType}
                onFileMetadataChange={setFileMetadata}
              />
            </div>

            <div className="space-y-3 rounded-2xl border border-silver/14 bg-background/18 p-4 md:col-span-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}-actionMode`}>Action Mode</Label>
                  <Select
                    id={`${idPrefix}-actionMode`}
                    name="actionMode"
                    value={actionMode}
                    onChange={(event) => setActionMode(resolveActionMode(event.target.value))}
                  >
                    {CIRCLE_CARD_LINK_ACTION_MODES.map((option) => (
                      <option key={option} value={option}>
                        {ACTION_MODE_LABELS[option]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-end">
                  <p className="rounded-2xl border border-silver/14 bg-background/22 p-3 text-xs leading-relaxed text-muted">
                    {ACTION_MODE_HELPERS[actionMode]}
                  </p>
                </div>
                <div className="rounded-2xl border border-gold/18 bg-gold/8 p-3 text-xs leading-relaxed text-muted md:col-span-2">
                  <span className="font-medium text-foreground">Detected file type:</span>{" "}
                  {circleCardFileKindLabel(detectedFileKind)}
                  <span className="mx-2 text-silver">|</span>
                  <span className="font-medium text-foreground">Recommended Action:</span>{" "}
                  {circleCardFileActionLabel(recommendedAction)}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}-visibility`}>Visibility</Label>
                  <Select
                    id={`${idPrefix}-visibility`}
                    name="visibility"
                    value={visibility}
                    onChange={(event) => handleVisibilityChange(event.target.value)}
                  >
                    {CIRCLE_CARD_LINK_VISIBILITIES.map((option) => (
                      <option key={option} value={option}>
                        {VISIBILITY_LABELS[option]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-end">
                  <p className="rounded-2xl border border-gold/18 bg-gold/8 p-3 text-xs leading-relaxed text-muted">
                    Private links appear locked on your public card until the visitor enters the access code.
                  </p>
                </div>
              </div>

              {isPrivate ? (
                <div className="space-y-3 rounded-2xl border border-gold/18 bg-gold/10 p-4">
                  <input type="hidden" name="accessCodePlain" value={generatedCode} />
                  <p className="text-sm font-medium text-foreground">
                    Share this code directly with the person you want to access this file.
                  </p>
                  <p className="text-xs leading-relaxed text-muted">
                    For security, this code is only shown when generated. Regenerate it if you need a new one.
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={generateCode}>
                      {generatedCode || hasAccessCode ? <RefreshCw size={14} /> : <KeyRound size={14} />}
                      {generatedCode || hasAccessCode ? "Regenerate code" : "Generate 4-digit code"}
                    </Button>
                    {generatedCode ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-xl border border-gold/22 bg-background/32 px-3 py-2 font-mono text-lg tracking-normal text-gold">
                          {generatedCode}
                        </span>
                        <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={copyGeneratedCode}>
                          <Copy size={14} />
                          Copy code
                        </Button>
                      </div>
                    ) : hasAccessCode ? (
                      <p className="text-xs text-muted">Access code is set. Generate a new code to replace it.</p>
                    ) : (
                      <p className="text-xs text-muted">Generate a code before saving this private link.</p>
                    )}
                  </div>

                  {copyNotice ? <p className="text-xs text-gold">{copyNotice}</p> : null}

                  <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}-accessCodeHint`}>Access code hint</Label>
                    <Input
                      id={`${idPrefix}-accessCodeHint`}
                      name="accessCodeHint"
                      defaultValue={defaultAccessCodeHint ?? ""}
                      placeholder="Optional hint for the person receiving the code"
                      maxLength={120}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <input type="hidden" name="accessCodePlain" value="" />
                  <input type="hidden" name="accessCodeHint" value="" />
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <input type="hidden" name="fileUrl" value="" />
            <input type="hidden" name="fileName" value="" />
            <input type="hidden" name="fileMimeType" value="" />
            <input type="hidden" name="actionMode" value="AUTO" />
            <input type="hidden" name="visibility" value="PUBLIC" />
            <input type="hidden" name="accessCodePlain" value="" />
            <input type="hidden" name="accessCodeHint" value="" />
          </>
        )}

        <div className="space-y-2 md:col-span-2">
          <CircleCardImageUploadField
            id={`${idPrefix}-imageUrl`}
            name="imageUrl"
            label="Link image / thumbnail"
            uploadKind="link-image"
            defaultValue={defaultImageUrl ?? ""}
            previewAlt="Smart link image preview"
            helperText="Optional. Upload a JPG, PNG or WebP thumbnail for Creator profile visual cards."
            saveReminder="Save this smart link to keep the thumbnail."
            uploadSuccessMessage="Uploaded. Save this smart link to keep the thumbnail."
            previewClassName="rounded-xl"
            showAdjustments={false}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`${idPrefix}-description`}>Description</Label>
          <Textarea
            id={`${idPrefix}-description`}
            name="description"
            rows={3}
            defaultValue={defaultDescription ?? ""}
            placeholder="Short context for why someone should tap this link."
          />
        </div>

        {showsButtonText ? (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-buttonText`}>Button text</Label>
            <Input
              id={`${idPrefix}-buttonText`}
              name="buttonText"
              defaultValue={defaultButtonText ?? ""}
              placeholder="Download brochure"
              maxLength={80}
            />
          </div>
        ) : (
          <input type="hidden" name="buttonText" value="" />
        )}

        {requiresOfferDate ? (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-expiresAt`}>Offer end date</Label>
            <Input
              id={`${idPrefix}-expiresAt`}
              name="expiresAt"
              type="date"
              defaultValue={dateInputValue(defaultExpiresAt)}
            />
          </div>
        ) : (
          <input type="hidden" name="expiresAt" value="" />
        )}
      </div>
    </div>
  );
}
