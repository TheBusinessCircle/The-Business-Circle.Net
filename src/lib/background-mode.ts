export const BACKGROUND_MODE_STORAGE_KEY = "tbc-background-mode";

export type BackgroundMode = "dark" | "light";

export const DEFAULT_BACKGROUND_MODE: BackgroundMode = "dark";

export function isBackgroundMode(value: string | null | undefined): value is BackgroundMode {
  return value === "dark" || value === "light";
}

export function getBackgroundModeInitScript(): string {
  return `
    (function () {
      try {
        var storedMode = window.localStorage.getItem("${BACKGROUND_MODE_STORAGE_KEY}");
        var resolvedMode = storedMode === "light" ? "light" : "${DEFAULT_BACKGROUND_MODE}";
        document.documentElement.dataset.backgroundMode = resolvedMode;
      } catch (error) {
        document.documentElement.dataset.backgroundMode = "${DEFAULT_BACKGROUND_MODE}";
      }
    })();
  `;
}
