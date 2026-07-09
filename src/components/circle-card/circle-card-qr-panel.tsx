"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CircleCardLogoMark } from "@/components/circle-card/circle-card-logo-mark";
import { trackCircleCardEvent } from "@/lib/circle-card/analytics-client";
import { circleCardPublicThemeClasses } from "@/lib/circle-card/public-theme-classes";
import { cn } from "@/lib/utils";

type CircleCardQrPanelProps = {
  publicUrl: string;
  slug: string;
  label?: string;
  variant?: "default" | "premium";
  className?: string;
  showCopyImage?: boolean;
  analytics?: {
    cardId: string;
    source?: string;
  };
};

export function CircleCardQrPanel({
  publicUrl,
  slug,
  label = "QR code",
  variant = "default",
  className,
  showCopyImage = false,
  analytics
}: CircleCardQrPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [canCopyQrImage, setCanCopyQrImage] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const premium = variant === "premium";

  useEffect(() => {
    setCanCopyQrImage(
      typeof ClipboardItem !== "undefined" &&
        Boolean(navigator.clipboard && "write" in navigator.clipboard)
    );
  }, []);

  useEffect(() => {
    let mounted = true;

    QRCode.toDataURL(publicUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      scale: 8,
      color: {
        dark: "#071126",
        light: "#f7fbff"
      }
    })
      .then((nextQrDataUrl) => {
        if (mounted) {
          setQrDataUrl(nextQrDataUrl);
        }
      })
      .catch(() => {
        if (mounted) {
          setStatus("QR unavailable");
        }
      });

    return () => {
      mounted = false;
    };
  }, [publicUrl]);

  useEffect(() => {
    if (!analytics?.cardId) {
      return;
    }

    const element = panelRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      trackCircleCardEvent({
        cardId: analytics.cardId,
        eventType: "QR_VIEW",
        metadata: {
          source: analytics.source ?? "qr_panel"
        }
      });
      return;
    }

    let tracked = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (tracked || !entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        tracked = true;
        trackCircleCardEvent({
          cardId: analytics.cardId,
          eventType: "QR_VIEW",
          metadata: {
            source: analytics.source ?? "qr_panel"
          }
        });
        observer.disconnect();
      },
      { threshold: 0.45 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [analytics?.cardId, analytics?.source]);

  async function copyPublicLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      if (analytics?.cardId) {
        trackCircleCardEvent({
          cardId: analytics.cardId,
          eventType: "SHARE",
          metadata: {
            method: "qr_copy_link",
            source: analytics.source ?? "qr_panel"
          }
        });
      }
      setStatus("Link copied");
    } catch {
      setStatus("Copy failed");
    }
  }

  function downloadQrCode() {
    if (!qrDataUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${slug}-circle-card-qr.png`;
    link.click();
    setStatus("QR downloaded");
  }

  async function copyQrImage() {
    if (!qrDataUrl || !canCopyQrImage || !navigator.clipboard.write) {
      setStatus("QR image copy unavailable");
      return;
    }

    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type || "image/png"]: blob
        })
      ]);
      if (analytics?.cardId) {
        trackCircleCardEvent({
          cardId: analytics.cardId,
          eventType: "SHARE",
          metadata: {
            method: "qr_copy_image",
            source: analytics.source ?? "qr_panel"
          }
        });
      }
      setStatus("QR image copied");
    } catch {
      setStatus("QR image copy failed");
    }
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        "circle-card-qr-panel",
        premium
          ? circleCardPublicThemeClasses.qrPanel
          : "cc-theme-card rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-card-bg)] p-4",
        className
      )}
    >
      {premium ? (
        <div
          aria-hidden="true"
          className={cn(circleCardPublicThemeClasses.divider, "absolute inset-x-8 top-0")}
        />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn("text-xs font-semibold text-silver", premium ? "text-gold" : null)}>
            {label}
          </p>
          <p className="mt-1 break-all text-sm text-foreground">{publicUrl}</p>
        </div>
        <span
          className={cn(
            circleCardPublicThemeClasses.iconSurface,
            "h-10 w-10 rounded-xl",
            premium ? "shadow-[var(--cc-theme-secondary-shadow)]" : null
          )}
        >
          <QrCode size={18} />
        </span>
      </div>

      <div
        className={cn(
          "mt-4 grid gap-4",
          premium ? "sm:grid-cols-1" : "sm:grid-cols-[180px_minmax(0,1fr)]"
        )}
      >
        <div
          className={cn(
            "relative grid min-h-[180px] place-items-center rounded-2xl border border-white/10 bg-white p-3",
            premium ? "min-h-[220px] border-[color:var(--cc-theme-accent-badge-border)] p-4 shadow-[var(--cc-theme-secondary-shadow)]" : null
          )}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Circle Card QR code"
              className={cn("circle-card-qr-image h-40 w-40", premium ? "h-48 w-48" : null)}
            />
          ) : (
            <span className="text-sm text-background">{status || "Generating QR"}</span>
          )}
          <span aria-hidden="true" className="circle-card-qr-centre-logo absolute left-1/2 top-1/2 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg bg-white p-1 shadow-md">
            <CircleCardLogoMark className="h-full w-full" alt="" />
          </span>
        </div>

        <div className={cn("flex flex-col justify-end gap-2", premium ? "sm:flex-row" : null)}>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-center gap-2",
              premium
                ? "cc-theme-button h-11 rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] hover:border-[color:var(--cc-theme-button-border)] hover:bg-[var(--cc-theme-secondary-hover-bg)]"
                : null
            )}
            onClick={copyPublicLink}
          >
            <Copy size={16} />
            Copy link
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-center gap-2",
              premium
                ? "cc-theme-button h-11 rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] hover:border-[color:var(--cc-theme-button-border)] hover:bg-[var(--cc-theme-secondary-hover-bg)]"
                : null
            )}
            onClick={downloadQrCode}
            disabled={!qrDataUrl}
          >
            <Download size={16} />
            Download QR
          </Button>
          {showCopyImage ? (
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-center gap-2",
                premium
                  ? "cc-theme-button h-11 rounded-2xl border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] hover:border-[color:var(--cc-theme-button-border)] hover:bg-[var(--cc-theme-secondary-hover-bg)]"
                  : null
              )}
              onClick={copyQrImage}
              disabled={!qrDataUrl || !canCopyQrImage}
            >
              <Copy size={16} />
              Copy QR Image
            </Button>
          ) : null}
        </div>
        {status ? <p className="text-xs text-muted">{status}</p> : null}
      </div>
    </div>
  );
}
