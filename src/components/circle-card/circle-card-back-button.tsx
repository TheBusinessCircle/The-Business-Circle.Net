"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRuntimeBrand } from "@/components/runtime-brand-provider";
import {
  getCircleCardRoutes,
  isCircleCardDashboardPath,
  preferCircleCardRuntimePath
} from "@/lib/circle-card/routes";
import { cn } from "@/lib/utils";

const NAVIGATION_ORIGIN_KEY = "circle-card:navigation-origin";
const RESTORE_TARGET_KEY = "circle-card:restore-target";

type CircleCardBackButtonProps = {
  className?: string;
};

export function CircleCardBackButton({ className }: CircleCardBackButtonProps) {
  const router = useRouter();
  const runtimeBrand = useRuntimeBrand();
  const dashboardPath = getCircleCardRoutes(runtimeBrand).dashboard;
  const [pending, setPending] = useState(false);

  function goBack() {
    if (pending) return;

    const storedOrigin = window.sessionStorage.getItem(NAVIGATION_ORIGIN_KEY);
    const storedPathname = storedOrigin?.split(/[?#]/, 1)[0] ?? "";
    const target = storedOrigin && isCircleCardDashboardPath(storedPathname)
      ? preferCircleCardRuntimePath(storedOrigin, runtimeBrand)
      : dashboardPath;

    setPending(true);
    window.sessionStorage.setItem(RESTORE_TARGET_KEY, target);
    router.push(target, { scroll: false });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={goBack}
      disabled={pending}
      aria-label="Back"
      aria-busy={pending}
      className={cn("circle-card-back-button gap-2", className)}
    >
      {pending ? <LoaderCircle size={15} className="animate-spin" /> : <ArrowLeft size={15} />}
      Back
    </Button>
  );
}
