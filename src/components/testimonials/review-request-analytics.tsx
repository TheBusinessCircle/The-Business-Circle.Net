"use client";

import { useEffect } from "react";

export function ReviewRequestAnalytics({ source }: { source: string }) {
  useEffect(() => {
    window.bcnAnalytics?.track?.("review_request_page_viewed", { source });
  }, [source]);

  return null;
}
