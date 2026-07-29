import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  test: {
    environment: "jsdom",
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["tests/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/components/**/*.tsx", "src/pages/**/*.tsx"],
    },
  },
} as any);
