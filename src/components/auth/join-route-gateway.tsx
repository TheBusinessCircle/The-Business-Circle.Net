"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type JoinRouteGatewayProps = {
  search: string;
};

function buildTargetPath(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}

export function JoinRouteGateway({ search }: JoinRouteGatewayProps) {
  const router = useRouter();

  useEffect(() => {
    const mobileViewport = window.matchMedia("(max-width: 1099px)").matches;
    const targetPath = mobileViewport
      ? buildTargetPath("/join-mobile", search)
      : buildTargetPath("/join-desktop", search);

    router.replace(targetPath);
  }, [router, search]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12 sm:px-6">
      <div className="public-panel w-full max-w-xl space-y-4 px-6 py-8 text-center sm:px-8">
        <p className="premium-kicker mx-auto">Join Gateway</p>
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">
            Entering The Business Circle
          </h1>
          <p className="text-sm leading-relaxed text-muted sm:text-base">
            Routing you into the right join experience for this device.
          </p>
        </div>
      </div>
    </div>
  );
}
