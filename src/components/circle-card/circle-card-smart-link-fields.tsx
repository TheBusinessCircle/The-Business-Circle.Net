"use client";

import { useMemo, useState } from "react";
import { CircleCardLinkFileUploadField } from "@/components/circle-card/circle-card-link-file-upload-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CIRCLE_CARD_FILE_LINK_TYPES,
  CIRCLE_CARD_LINK_TYPES,
  type CircleCardLinkType
} from "@/lib/circle-card/schema";

type CircleCardSmartLinkFieldsProps = {
  idPrefix: string;
  defaultType?: string | null;
  defaultLabel?: string | null;
  defaultUrl?: string | null;
  defaultDescription?: string | null;
  defaultFileUrl?: string | null;
  defaultFileName?: string | null;
  defaultFileMimeType?: string | null;
  defaultButtonText?: string | null;
  defaultExpiresAt?: Date | string | null;
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

function resolveLinkType(value: string | null | undefined): CircleCardLinkType {
  return CIRCLE_CARD_LINK_TYPES.includes(value as CircleCardLinkType)
    ? (value as CircleCardLinkType)
    : "GENERAL";
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
  defaultFileUrl = "",
  defaultFileName = "",
  defaultFileMimeType = "",
  defaultButtonText = "",
  defaultExpiresAt
}: CircleCardSmartLinkFieldsProps) {
  const [type, setType] = useState<CircleCardLinkType>(() => resolveLinkType(defaultType));
  const supportsFile = useMemo(
    () => CIRCLE_CARD_FILE_LINK_TYPES.includes(type as (typeof CIRCLE_CARD_FILE_LINK_TYPES)[number]),
    [type]
  );
  const requiresOfferDate = type === "LATEST_OFFER";
  const showsButtonText = type === "DOWNLOAD";

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
              onChange={(event) => setType(resolveLinkType(event.target.value))}
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
          <div className="space-y-2 md:col-span-2">
            <Label>File upload</Label>
            <CircleCardLinkFileUploadField
              defaultFileUrl={defaultFileUrl}
              defaultFileName={defaultFileName}
              defaultFileMimeType={defaultFileMimeType}
            />
          </div>
        ) : (
          <>
            <input type="hidden" name="fileUrl" value="" />
            <input type="hidden" name="fileName" value="" />
            <input type="hidden" name="fileMimeType" value="" />
          </>
        )}

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
