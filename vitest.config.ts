import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  }
});
