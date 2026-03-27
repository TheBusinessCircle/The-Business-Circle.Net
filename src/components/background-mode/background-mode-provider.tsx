"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  BACKGROUND_MODE_STORAGE_KEY,
  DEFAULT_BACKGROUND_MODE,
  isBackgroundMode,
  type BackgroundMode
} from "@/lib/background-mode";

type BackgroundModeContextValue = {
  mode: BackgroundMode;
  setMode: (mode: BackgroundMode) => void;
  toggleMode: () => void;
};

const BackgroundModeContext = createContext<BackgroundModeContextValue | undefined>(undefined);

function resolveBackgroundMode(): BackgroundMode {
  if (typeof document !== "undefined") {
    const attributeMode = document.documentElement.dataset.backgroundMode;

    if (isBackgroundMode(attributeMode)) {
      return attributeMode;
    }
  }

  if (typeof window !== "undefined") {
    try {
      const storedMode = window.localStorage.getItem(BACKGROUND_MODE_STORAGE_KEY);

      if (isBackgroundMode(storedMode)) {
        return storedMode;
      }
    } catch {
      return DEFAULT_BACKGROUND_MODE;
    }
  }

  return DEFAULT_BACKGROUND_MODE;
}

export function BackgroundModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<BackgroundMode>(DEFAULT_BACKGROUND_MODE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setMode(resolveBackgroundMode());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    document.documentElement.dataset.backgroundMode = mode;

    try {
      window.localStorage.setItem(BACKGROUND_MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore storage access issues and keep the in-memory preference active.
    }
  }, [isReady, mode]);

  return (
    <BackgroundModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode: () => setMode((currentMode) => (currentMode === "dark" ? "light" : "dark"))
      }}
    >
      {children}
    </BackgroundModeContext.Provider>
  );
}

export function useBackgroundMode() {
  const context = useContext(BackgroundModeContext);

  if (!context) {
    throw new Error("useBackgroundMode must be used within a BackgroundModeProvider.");
  }

  return context;
}
