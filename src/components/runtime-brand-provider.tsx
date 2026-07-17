"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { RuntimeBrandKey } from "@/config/runtime-brand";

const RuntimeBrandContext = createContext<RuntimeBrandKey>("bcn");

export function RuntimeBrandProvider({
  brand,
  children
}: {
  brand: RuntimeBrandKey;
  children: ReactNode;
}) {
  return (
    <RuntimeBrandContext.Provider value={brand}>
      {children}
    </RuntimeBrandContext.Provider>
  );
}

export function useRuntimeBrand() {
  return useContext(RuntimeBrandContext);
}
