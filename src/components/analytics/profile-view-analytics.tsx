"use client";

import { useEffect, useRef } from "react";
import { trackProfileViewed } from "@/lib/analytics";

type ProfileViewAnalyticsProps = {
  profileUserId: string;
  viewerIsOwner?: boolean;
};

export function ProfileViewAnalytics({
  profileUserId,
  viewerIsOwner = false
}: ProfileViewAnalyticsProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) {
      return;
    }

    trackedRef.current = true;
    trackProfileViewed({
      profileUserId,
      viewerIsOwner,
      source: "public_profile"
    });
  }, [profileUserId, viewerIsOwner]);

  return null;
}
