"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ContactRound,
  ImageUp,
  Loader2,
  RotateCcw,
  Save,
  ScanLine,
  Send,
  WalletCards
} from "lucide-react";
import {
  saveBusinessCardScanWalletContactAction,
  saveMatchedBusinessCardAndSendConnectionRequestAction,
  saveMatchedBusinessCardCircleCardAction
} from "@/actions/circle-card.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SocialHandles = {
  linkedin?: string;
  instagram?: string;
  x?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
};

type ScannerFields = {
  fullName: string;
  businessName: string;
  role: string;
  phone: string;
  mobilePhone: string;
  email: string;
  websiteUrl: string;
  address: string;
  socialHandles: SocialHandles;
};

type ScannerMatch = {
  id: string;
  slug: string;
  userId: string;
  fullName: string;
  businessName: string | null;
  role: string | null;
  tagline: string | null;
  websiteUrl: string | null;
  email: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  businessLogoUrl: string | null;
};

type DuplicateContact = {
  id: string;
  fullName: string | null;
  businessName: string | null;
  email: string | null;
  websiteUrl: string | null;
  source: string;
};

type BusinessCardScanPayload = {
  ok?: boolean;
  error?: string;
  scan?: {
    originalCardImageUrl: string;
    extractionMethod: "openai_vision" | "tesseract_ocr" | "manual_review";
    providerUnavailableReasons: string[];
    duplicateContact: DuplicateContact | null;
    matches: ScannerMatch[];
    fields: {
      name: string;
      businessName: string;
      jobTitle: string;
      phone: string;
      mobile: string;
      email: string;
      website: string;
      address: string;
      socialHandles: SocialHandles;
      rawText: string;
    };
  };
};

type BusinessCardScannerProps = {
  canSendConnectionRequest: boolean;
};

type ScannerStage = "idle" | "preparing" | "optimising" | "ready" | "uploading" | "scanning";

type PreparedImage = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  originalSize: number;
};

type LoadedImageSource = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

const EMPTY_FIELDS: ScannerFields = {
  fullName: "",
  businessName: "",
  role: "",
  phone: "",
  mobilePhone: "",
  email: "",
  websiteUrl: "",
  address: "",
  socialHandles: {}
};

const SOCIAL_FIELDS = [
  ["linkedin", "LinkedIn"],
  ["instagram", "Instagram"],
  ["x", "X"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"]
] as const;

const BUSINESS_CARD_MAX_DIMENSION = 1600;
const BUSINESS_CARD_IMAGE_QUALITY = 0.82;
const BUSINESS_CARD_OUTPUT_TYPE = "image/jpeg";
const BUSINESS_CARD_OUTPUT_EXTENSION = "jpg";
const BUSINESS_CARD_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORTED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const DEVICE_TOO_LARGE_MESSAGE =
  "This image is too large for your device to process. Please retake the photo a little further away or choose a smaller image.";

function toScannerFields(payload: NonNullable<BusinessCardScanPayload["scan"]>["fields"]): ScannerFields {
  return {
    fullName: payload.name ?? "",
    businessName: payload.businessName ?? "",
    role: payload.jobTitle ?? "",
    phone: payload.phone ?? "",
    mobilePhone: payload.mobile ?? "",
    email: payload.email ?? "",
    websiteUrl: payload.website ?? "",
    address: payload.address ?? "",
    socialHandles: payload.socialHandles ?? {}
  };
}

function sourceLabel(value: DuplicateContact["source"]) {
  if (value === "BUSINESS_CARD_SCAN") {
    return "Scanned Business Card";
  }

  if (value === "CIRCLE_CARD") {
    return "Circle Card";
  }

  if (value === "LINK_IMPORT") {
    return "Link Import";
  }

  return "Manual";
}

function extractionLabel(value: NonNullable<BusinessCardScanPayload["scan"]>["extractionMethod"]) {
  if (value === "openai_vision") {
    return "AI extraction";
  }

  if (value === "tesseract_ocr") {
    return "OCR extraction";
  }

  return "Manual review";
}

function scannerStageLabel(stage: ScannerStage) {
  if (stage === "preparing") {
    return "Preparing image";
  }

  if (stage === "optimising") {
    return "Optimising image";
  }

  if (stage === "uploading") {
    return "Uploading image";
  }

  if (stage === "scanning") {
    return "Scanning card";
  }

  return "";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isSupportedImageFile(file: File) {
  return SUPPORTED_IMAGE_TYPES.has(file.type) || SUPPORTED_IMAGE_EXTENSIONS.test(file.name);
}

function fitWithinMaxDimension(width: number, height: number) {
  const scale = Math.min(1, BUSINESS_CARD_MAX_DIMENSION / width, BUSINESS_CARD_MAX_DIMENSION / height);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

function baseFileName(file: File) {
  return (
    file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "business-card"
  );
}

async function loadImageSource(file: File): Promise<LoadedImageSource> {
  if ("createImageBitmap" in window) {
    try {
      const options: ImageBitmapOptions = { imageOrientation: "from-image" };
      const bitmap = await createImageBitmap(file, options);

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close()
      };
    } catch {
      // Fall back to an HTMLImageElement below. Some mobile browsers reject imageBitmap options.
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image-load-failed"));
      img.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => {
        image.removeAttribute("src");
        URL.revokeObjectURL(objectUrl);
      }
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("image-optimisation-failed"));
          return;
        }

        resolve(blob);
      },
      BUSINESS_CARD_OUTPUT_TYPE,
      quality
    );
  });
}

async function renderOptimisedImage(file: File) {
  const loaded = await loadImageSource(file);
  let canvas: HTMLCanvasElement | null = null;

  try {
    if (!loaded.width || !loaded.height) {
      throw new Error("image-optimisation-failed");
    }

    const size = fitWithinMaxDimension(loaded.width, loaded.height);
    canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("image-optimisation-failed");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(loaded.source, 0, 0, size.width, size.height);

    let blob = await canvasToBlob(canvas, BUSINESS_CARD_IMAGE_QUALITY);

    if (blob.size > BUSINESS_CARD_UPLOAD_LIMIT_BYTES) {
      blob = await canvasToBlob(canvas, 0.78);
    }

    if (blob.size > BUSINESS_CARD_UPLOAD_LIMIT_BYTES) {
      blob = await canvasToBlob(canvas, 0.75);
    }

    if (blob.size > BUSINESS_CARD_UPLOAD_LIMIT_BYTES) {
      throw new Error("image-too-large-after-optimisation");
    }

    return {
      blob,
      width: size.width,
      height: size.height
    };
  } finally {
    loaded.release();

    if (canvas) {
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 1;
      canvas.height = 1;
    }
  }
}

async function optimiseBusinessCardImage(file: File): Promise<PreparedImage> {
  if (!isSupportedImageFile(file)) {
    throw new Error("unsupported-image-type");
  }

  const optimised = await renderOptimisedImage(file);
  const optimisedFile = new File(
    [optimised.blob],
    `${baseFileName(file)}-scan.${BUSINESS_CARD_OUTPUT_EXTENSION}`,
    {
      type: BUSINESS_CARD_OUTPUT_TYPE,
      lastModified: Date.now()
    }
  );

  return {
    file: optimisedFile,
    previewUrl: URL.createObjectURL(optimised.blob),
    width: optimised.width,
    height: optimised.height,
    originalSize: file.size
  };
}

function uploadBusinessCardScan(
  file: File,
  onStageChange: (stage: ScannerStage) => void
): Promise<BusinessCardScanPayload> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("image", file);
    request.open("POST", "/api/circle-card/business-card-scan");
    request.upload.onloadstart = () => onStageChange("uploading");
    request.upload.onloadend = () => onStageChange("scanning");
    request.onerror = () => reject(new Error("network-error"));
    request.onload = () => {
      let payload: BusinessCardScanPayload = {};

      try {
        payload = JSON.parse(request.responseText || "{}") as BusinessCardScanPayload;
      } catch {
        payload = {};
      }

      if (request.status >= 200 && request.status < 300) {
        resolve(payload);
        return;
      }

      reject(new Error(payload.error || "Unable to scan business card."));
    };
    request.send(formData);
  });
}

function friendlyImageError(error: unknown) {
  if (error instanceof Error && error.message === "unsupported-image-type") {
    return "Upload a JPG, JPEG, PNG or WEBP business card image.";
  }

  if (
    error instanceof Error &&
    (error.message === "image-too-large-after-optimisation" ||
      error.message === "image-load-failed" ||
      error.message === "image-optimisation-failed")
  ) {
    return DEVICE_TOO_LARGE_MESSAGE;
  }

  return DEVICE_TOO_LARGE_MESSAGE;
}

export function BusinessCardScanner({ canSendConnectionRequest }: BusinessCardScannerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [stage, setStage] = useState<ScannerStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preparedImage, setPreparedImage] = useState<PreparedImage | null>(null);
  const [scan, setScan] = useState<BusinessCardScanPayload["scan"] | null>(null);
  const [fields, setFields] = useState<ScannerFields>(EMPTY_FIELDS);

  useEffect(() => {
    const previewUrl = preparedImage?.previewUrl;

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [preparedImage?.previewUrl]);

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setExpanded(true);
    setError(null);
    setScan(null);
    setFields(EMPTY_FIELDS);
    setPreparedImage(null);
    setStage("preparing");

    try {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      setStage("optimising");
      const optimised = await optimiseBusinessCardImage(file);
      setPreparedImage(optimised);
      setStage("ready");
    } catch (optimisationError) {
      setError(friendlyImageError(optimisationError));
      setStage("idle");
    } finally {
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  }

  async function handleScanPreparedImage() {
    if (!preparedImage) {
      return;
    }

    setError(null);
    setScan(null);
    setStage("uploading");

    try {
      const payload = await uploadBusinessCardScan(preparedImage.file, setStage);

      if (!payload.scan) {
        setError(payload.error ?? "Unable to scan business card.");
        setStage("ready");
        return;
      }

      setScan(payload.scan);
      setFields(toScannerFields(payload.scan.fields));
      setStage("idle");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Unable to scan business card.");
      setStage("ready");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void handleFile(event.target.files?.[0]);
  }

  function updateField(field: keyof Omit<ScannerFields, "socialHandles">, value: string) {
    setFields((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateSocialField(field: keyof SocialHandles, value: string) {
    setFields((current) => ({
      ...current,
      socialHandles: {
        ...current.socialHandles,
        [field]: value
      }
    }));
  }

  const busy = stage === "preparing" || stage === "optimising" || stage === "uploading" || stage === "scanning";
  const stageLabel = scannerStageLabel(stage);
  const firstMatch = scan?.matches[0] ?? null;
  const returnPath = firstMatch
    ? `/dashboard/circle-card?connectCard=${encodeURIComponent(firstMatch.slug)}#connect-hub`
    : "/dashboard/circle-card#connect-hub";

  return (
    <Card id="business-card-scanner" className="scroll-mt-24 border-gold/18 bg-gold/8">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <ContactRound size={17} className="text-gold" />
              Scan Business Card
            </CardTitle>
            <CardDescription>Turn a paper card into a private wallet contact.</CardDescription>
          </div>
          {scan ? (
            <Badge variant="outline" className="w-fit border-gold/28 text-gold">
              {extractionLabel(scan.extractionMethod)}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            className="gap-2"
            disabled={busy}
            onClick={() => cameraInputRef.current?.click()}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={busy}
            onClick={() => uploadInputRef.current?.click()}
          >
            <ImageUp size={16} />
            Upload Image
          </Button>
        </div>

        {stageLabel ? (
          <div className="rounded-2xl border border-gold/18 bg-background/20 p-4 text-sm text-muted">
            <Loader2 size={16} className="mr-2 inline animate-spin text-gold" />
            {stageLabel}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {expanded && preparedImage && !scan ? (
          <div className="space-y-4 rounded-2xl border border-silver/14 bg-background/20 p-4">
            <div className="overflow-hidden rounded-xl border border-silver/14 bg-background/24">
              <img
                src={preparedImage.previewUrl}
                alt="Optimised business card preview"
                className="max-h-64 w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-gold/25 text-gold">
                Optimised JPEG
              </Badge>
              <Badge variant="outline" className="border-silver/18 text-silver">
                {preparedImage.width}x{preparedImage.height}
              </Badge>
              <Badge variant="outline" className="border-silver/18 text-silver">
                {formatFileSize(preparedImage.originalSize)} to {formatFileSize(preparedImage.file.size)}
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
                className="gap-2 sm:col-span-1"
                disabled={busy}
                onClick={() => void handleScanPreparedImage()}
              >
                <ScanLine size={16} />
                Scan this card
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={busy}
                onClick={() => cameraInputRef.current?.click()}
              >
                <RotateCcw size={16} />
                Retake
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={busy}
                onClick={() => uploadInputRef.current?.click()}
              >
                <ImageUp size={16} />
                Choose another
              </Button>
            </div>
          </div>
        ) : null}

        {expanded && scan ? (
          <div className="space-y-4">
            {scan.originalCardImageUrl ? (
              <div className="overflow-hidden rounded-2xl border border-silver/14 bg-background/20">
                <img
                  src={scan.originalCardImageUrl}
                  alt="Scanned business card"
                  className="max-h-64 w-full object-contain"
                />
              </div>
            ) : null}

            {scan.duplicateContact ? (
              <div className="rounded-2xl border border-gold/20 bg-background/22 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-gold" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Already in Wallet</p>
                    <p className="mt-1 text-sm text-muted">
                      {scan.duplicateContact.fullName ||
                        scan.duplicateContact.businessName ||
                        scan.duplicateContact.email ||
                        "Saved contact"}
                    </p>
                    <Badge variant="outline" className="mt-3 border-gold/25 text-gold">
                      {sourceLabel(scan.duplicateContact.source)}
                    </Badge>
                  </div>
                </div>
                <Link
                  href={`/dashboard/circle-card?contactId=${encodeURIComponent(scan.duplicateContact.id)}#wallet`}
                  className="mt-4 inline-flex"
                >
                  <Button type="button" variant="outline" size="sm" className="gap-2">
                    Open Wallet Contact
                    <ArrowUpRight size={14} />
                  </Button>
                </Link>
              </div>
            ) : null}

            {firstMatch ? (
              <div className="rounded-2xl border border-gold/20 bg-background/22 p-4">
                <div className="flex min-w-0 gap-3">
                  <div className="relative h-14 w-14 shrink-0">
                    <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-gold/18 bg-background/24 text-sm font-semibold text-foreground">
                      {firstMatch.profileImageUrl ? (
                        <img
                          src={firstMatch.profileImageUrl}
                          alt={firstMatch.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        firstMatch.fullName.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    {firstMatch.businessLogoUrl ? (
                      <div className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center overflow-hidden rounded-xl border border-background bg-card shadow-inner-surface">
                        <img
                          src={firstMatch.businessLogoUrl}
                          alt={`${firstMatch.fullName} business logo`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <Badge variant="outline" className="border-gold/25 text-gold">
                      Existing Circle Card Found
                    </Badge>
                    <h3 className="mt-2 text-base font-semibold text-foreground">{firstMatch.fullName}</h3>
                    <p className="mt-1 text-sm text-silver">
                      {[firstMatch.role, firstMatch.businessName].filter(Boolean).join(" at ") ||
                        "Circle Card contact"}
                    </p>
                    {firstMatch.tagline ? (
                      <p className="mt-2 text-sm text-muted">{firstMatch.tagline}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <form action={saveMatchedBusinessCardCircleCardAction}>
                    <input type="hidden" name="cardId" value={firstMatch.id} />
                    <input type="hidden" name="returnPath" value={returnPath} />
                    <Button type="submit" className="w-full gap-2">
                      <WalletCards size={16} />
                      Save Existing Card
                    </Button>
                  </form>
                  {canSendConnectionRequest ? (
                    <form action={saveMatchedBusinessCardAndSendConnectionRequestAction} className="space-y-2">
                      <input type="hidden" name="cardId" value={firstMatch.id} />
                      <input type="hidden" name="returnPath" value={returnPath} />
                      <Textarea
                        name="message"
                        rows={2}
                        maxLength={240}
                        placeholder="Hi, good to connect through Circle Card."
                        aria-label="Connection request message"
                      />
                      <Button type="submit" variant="outline" className="w-full gap-2">
                        <Send size={16} />
                        Save and Request
                      </Button>
                    </form>
                  ) : (
                    <Link href="/dashboard/circle-card#circle-card-form">
                      <Button type="button" variant="outline" className="w-full gap-2">
                        Create your card
                        <ArrowUpRight size={16} />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : null}

            {!firstMatch && !scan.duplicateContact ? (
              <form action={saveBusinessCardScanWalletContactAction} className="space-y-4">
                <input type="hidden" name="returnPath" value="/dashboard/circle-card#connect-hub" />
                <input type="hidden" name="originalCardImageUrl" value={scan.originalCardImageUrl} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="business-card-name">Name</Label>
                    <Input
                      id="business-card-name"
                      name="fullName"
                      value={fields.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-card-business">Business Name</Label>
                    <Input
                      id="business-card-business"
                      name="businessName"
                      value={fields.businessName}
                      onChange={(event) => updateField("businessName", event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="business-card-role">Job Title</Label>
                    <Input
                      id="business-card-role"
                      name="role"
                      value={fields.role}
                      onChange={(event) => updateField("role", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-card-email">Email</Label>
                    <Input
                      id="business-card-email"
                      name="email"
                      type="email"
                      value={fields.email}
                      onChange={(event) => updateField("email", event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="business-card-phone">Phone</Label>
                    <Input
                      id="business-card-phone"
                      name="phone"
                      value={fields.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-card-mobile">Mobile</Label>
                    <Input
                      id="business-card-mobile"
                      name="mobilePhone"
                      value={fields.mobilePhone}
                      onChange={(event) => updateField("mobilePhone", event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-card-website">Website</Label>
                  <Input
                    id="business-card-website"
                    name="websiteUrl"
                    value={fields.websiteUrl}
                    onChange={(event) => updateField("websiteUrl", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-card-address">Address</Label>
                  <Textarea
                    id="business-card-address"
                    name="address"
                    rows={3}
                    value={fields.address}
                    onChange={(event) => updateField("address", event.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {SOCIAL_FIELDS.map(([field, label]) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`business-card-${field}`}>{label}</Label>
                      <Input
                        id={`business-card-${field}`}
                        name={field}
                        value={fields.socialHandles[field] ?? ""}
                        onChange={(event) => updateSocialField(field, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <Button type="submit" className="w-full gap-2">
                  <Save size={16} />
                  Save to Wallet
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
