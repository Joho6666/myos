import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

export default defineConfig({
  // Vitest and the standalone mobile Vite build can resolve separate Vite
  // package instances under pnpm. The plugin is runtime-compatible; the cast
  // avoids a false duplicate-type error in tsc.
  plugins: [react() as never],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "apps/mobile/src/**/*.test.ts"]
  }
});
