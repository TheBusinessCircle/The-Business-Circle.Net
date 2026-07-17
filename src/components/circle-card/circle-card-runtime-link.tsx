"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useRuntimeBrand } from "@/components/runtime-brand-provider";
import { preferCircleCardRuntimePath } from "@/lib/circle-card/routes";

type CircleCardRuntimeLinkProps = ComponentProps<typeof Link>;

export function CircleCardRuntimeLink({ href, ...props }: CircleCardRuntimeLinkProps) {
  const runtimeBrand = useRuntimeBrand();
  const runtimeHref =
    typeof href === "string" ? preferCircleCardRuntimePath(href, runtimeBrand) : href;

  return <Link href={runtimeHref} {...props} />;
}
