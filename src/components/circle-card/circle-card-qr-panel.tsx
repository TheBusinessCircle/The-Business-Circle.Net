"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackCircleCardEvent } from "@/lib/circle-card/analytics-client";
import { cn } from "@/lib/utils";

type CircleCardQrPanelProps = {
  publicUrl: string;
  slug: string;
  label?: string;
  variant?: "default" | "premium";
  className?: string;
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
  analytics
}: CircleCardQrPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const premium = variant === "premium";

  useEffect(() => {
    let mounted = true;

    QRCode.toDataURL(publicUrl, {
      errorCorrectionLevel: "M",
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

  return (
    <div
      ref={panelRef}
      className={cn(
        premium
          ? "relative overflow-hidden rounded-[1.75rem] border border-gold/24 bg-[radial-gradient(circle_at_50%_0%,rgba(47,109,255,0.18),transparent_36%),linear-gradient(155deg,rgba(9,22,50,0.92),rgba(4,10,24,0.98))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.36),0_0_54px_rgba(47,109,255,0.1)] sm:p-5"
          : "rounded-2xl border border-silver/16 bg-background/22 p-4",
        className
      )}
    >
      {premium ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,95,0.72),rgba(75,126,255,0.45),transparent)]"
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
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold",
            premium ? "shadow-[0_0_26px_rgba(47,109,255,0.18)]" : null
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
            "grid min-h-[180px] place-items-center rounded-2xl border border-white/10 bg-white p-3",
            premium ? "min-h-[220px] border-gold/20 p-4 shadow-[0_18px_42px_rgba(0,0,0,0.22)]" : null
          )}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Circle Card QR code"
              className={cn("h-40 w-40", premium ? "h-48 w-48" : null)}
            />
          ) : (
            <span className="text-sm text-background">{status || "Generating QR"}</span>
          )}
        </div>

        <div className={cn("flex flex-col justify-end gap-2", premium ? "sm:flex-row" : null)}>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-center gap-2",
              premium
                ? "h-11 rounded-2xl border-[#2f6dff]/30 bg-[#0b1c3f]/72 hover:border-gold/35 hover:bg-[#102958]"
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
                ? "h-11 rounded-2xl border-[#2f6dff]/30 bg-[#0b1c3f]/72 hover:border-gold/35 hover:bg-[#102958]"
                : null
            )}
            onClick={downloadQrCode}
            disabled={!qrDataUrl}
          >
            <Download size={16} />
            Download QR
          </Button>
        </div>
        {status ? <p className="text-xs text-muted">{status}</p> : null}
      </div>
    </div>
  );
}
