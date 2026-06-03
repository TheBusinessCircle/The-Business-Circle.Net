"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

type CircleCardQrPanelProps = {
  publicUrl: string;
  slug: string;
};

export function CircleCardQrPanel({ publicUrl, slug }: CircleCardQrPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

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

  async function copyPublicLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
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
    <div className="rounded-2xl border border-silver/16 bg-background/22 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-silver">QR code</p>
          <p className="mt-1 break-all text-sm text-foreground">{publicUrl}</p>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/24 bg-gold/10 text-gold">
          <QrCode size={18} />
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="grid min-h-[180px] place-items-center rounded-2xl border border-white/10 bg-white p-3">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Circle Card QR code" className="h-40 w-40" />
          ) : (
            <span className="text-sm text-background">{status || "Generating QR"}</span>
          )}
        </div>

        <div className="flex flex-col justify-end gap-2">
          <Button type="button" variant="outline" className="w-full justify-center gap-2" onClick={copyPublicLink}>
            <Copy size={16} />
            Copy link
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-2"
            onClick={downloadQrCode}
            disabled={!qrDataUrl}
          >
            <Download size={16} />
            Download QR
          </Button>
          {status ? <p className="text-xs text-muted">{status}</p> : null}
        </div>
      </div>
    </div>
  );
}
