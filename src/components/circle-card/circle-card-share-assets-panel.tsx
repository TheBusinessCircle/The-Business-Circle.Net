import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  ClipboardList,
  Copy,
  PanelTop,
  Presentation,
  QrCode,
  Share2,
  SmartphoneNfc
} from "lucide-react";
import { CircleCardCopyLinkButton } from "@/components/circle-card/circle-card-copy-link-button";
import { CircleCardQrPanel } from "@/components/circle-card/circle-card-qr-panel";
import { CircleCardShareButton } from "@/components/circle-card/circle-card-share-button";
import { Button } from "@/components/ui/button";

type CircleCardShareAssetsPanelProps = {
  cardId: string;
  fullName: string;
  slug: string;
  publicUrl: string;
  qrUrl: string;
  nfcUrl: string;
  eventUrl: string;
};

const PRINT_ASSETS = [
  { title: "Printable QR card", icon: BadgeCheck },
  { title: "Event sign", icon: Presentation },
  { title: "Table display", icon: PanelTop },
  { title: "Poster", icon: ClipboardList }
] as const;

function SourceLinkBlock({
  cardId,
  icon,
  title,
  description,
  url,
  copyLabel,
  source
}: {
  cardId: string;
  icon: ReactNode;
  title: string;
  description: string;
  url: string;
  copyLabel: string;
  source: "direct" | "qr" | "nfc" | "event";
}) {
  return (
    <div className="rounded-2xl border border-silver/14 bg-background/22 p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/18 bg-gold/10 text-gold">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
        </div>
      </div>
      <p className="mt-4 break-all rounded-xl border border-silver/12 bg-background/26 px-3 py-2 text-sm text-foreground">
        {url}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <CircleCardCopyLinkButton
          publicUrl={url}
          label={copyLabel}
          className="w-full"
          analytics={{
            cardId,
            eventType: "SHARE",
            source
          }}
        />
        <Link href={url} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="outline" className="w-full gap-2">
            Open
            <ArrowUpRight size={16} />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function CircleCardShareAssetsPanel({
  cardId,
  fullName,
  slug,
  publicUrl,
  qrUrl,
  nfcUrl,
  eventUrl
}: CircleCardShareAssetsPanelProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-gold/18 bg-gold/8 p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/24 bg-gold/12 text-gold">
              <Share2 size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">Public Card Link</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Your standard public Circle Card URL for messages, email signatures and direct sharing.
              </p>
            </div>
          </div>
          <p className="mt-4 break-all rounded-xl border border-gold/18 bg-background/26 px-3 py-2 text-sm text-foreground">
            {publicUrl}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <CircleCardCopyLinkButton
              publicUrl={publicUrl}
              label="Copy link"
              className="w-full"
              analytics={{
                cardId,
                eventType: "SHARE",
                source: "direct"
              }}
            />
            <CircleCardShareButton
              title={`${fullName} | Circle Card`}
              publicUrl={publicUrl}
              cardId={cardId}
              analyticsSource="direct"
              eventType="SHARE"
              label="Native share"
              hideStatus
            />
          </div>
        </div>

        <SourceLinkBlock
          cardId={cardId}
          icon={<SmartphoneNfc size={18} />}
          title="NFC Link"
          description="This is the link to write to an NFC tag."
          url={nfcUrl}
          copyLabel="Copy NFC link"
          source="nfc"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div id="share-assets-qr" className="scroll-mt-24">
          <CircleCardQrPanel
            publicUrl={qrUrl}
            slug={slug}
            label="QR Code"
            analytics={{
              cardId,
              source: "qr"
            }}
            showCopyImage
          />
        </div>

        <div className="space-y-4">
          <SourceLinkBlock
            cardId={cardId}
            icon={<QrCode size={18} />}
            title="QR Link"
            description="Use this source link when creating QR codes for stickers, posters and printed material."
            url={qrUrl}
            copyLabel="Copy QR link"
            source="qr"
          />

          <SourceLinkBlock
            cardId={cardId}
            icon={<Copy size={18} />}
            title="Event Link"
            description="Use this optional link for event-specific follow-up material."
            url={eventUrl}
            copyLabel="Copy event link"
            source="event"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-silver/14 bg-background/22 p-4">
          <h3 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
            <SmartphoneNfc size={17} className="text-gold" />
            NFC setup
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Use this link when programming NFC stickers, cards, keyrings or wristbands.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
            <li>Buy a blank NFC tag/card.</li>
            <li>Use any NFC writing app.</li>
            <li>Paste your NFC link.</li>
            <li>Tap to test.</li>
          </ol>
        </div>

        <div className="rounded-2xl border border-silver/14 bg-background/22 p-4">
          <h3 className="text-base font-semibold text-foreground">Print Assets</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Ready-made printable layouts will arrive in a later phase.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PRINT_ASSETS.map((asset) => {
              const Icon = asset.icon;

              return (
                <div
                  key={asset.title}
                  className="rounded-2xl border border-dashed border-silver/18 bg-background/18 p-4"
                >
                  <Icon size={17} className="text-silver" />
                  <p className="mt-3 text-sm font-medium text-foreground">{asset.title}</p>
                  <p className="mt-1 text-xs text-muted">Coming soon</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
