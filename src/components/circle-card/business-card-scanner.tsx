"use client";

import Link from "next/link";
import { type ChangeEvent, useRef, useState } from "react";
import {
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ContactRound,
  ImageUp,
  Loader2,
  Save,
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

export function BusinessCardScanner({ canSendConnectionRequest }: BusinessCardScannerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<BusinessCardScanPayload["scan"] | null>(null);
  const [fields, setFields] = useState<ScannerFields>(EMPTY_FIELDS);

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setExpanded(true);
    setError(null);
    setIsScanning(true);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/circle-card/business-card-scan", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json().catch(() => ({}))) as BusinessCardScanPayload;

      if (!response.ok || !payload.scan) {
        setError(payload.error ?? "Unable to scan business card.");
        return;
      }

      setScan(payload.scan);
      setFields(toScannerFields(payload.scan.fields));
    } catch {
      setError("Unable to scan business card.");
    } finally {
      setIsScanning(false);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
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
            disabled={isScanning}
            onClick={() => cameraInputRef.current?.click()}
          >
            {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={isScanning}
            onClick={() => uploadInputRef.current?.click()}
          >
            <ImageUp size={16} />
            Upload Image
          </Button>
        </div>

        {error ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {isScanning ? (
          <div className="rounded-2xl border border-gold/18 bg-background/20 p-4 text-sm text-muted">
            <Loader2 size={16} className="mr-2 inline animate-spin text-gold" />
            Reading business card...
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
