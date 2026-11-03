"use client";
import { useState } from "react";

export function HucknallPhoto({ src, alt, className = "", eager = false, fallback = "NG15" }: {
  src?: string | null; alt: string; className?: string; eager?: boolean; fallback?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return src && src !== failedSrc ? <img src={src} alt={alt} loading={eager ? "eager" : "lazy"}
    decoding="async" className={className} onError={() => setFailedSrc(src)} />
    : <span aria-label={alt} className={`${className} grid place-items-center bg-[#244b43] text-3xl font-semibold text-[#f1e7cf]`}>{fallback}</span>;
}
