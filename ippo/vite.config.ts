/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pagesでは Hirameki の下 (/hirameki/ippo/) に配信するため base を環境変数で切り替える。
export default defineConfig({
  base: process.env["IPPO_BASE"] ?? "/",
  plugins: [react()],
  server: {
    port: 5174,
  },
  test: {
    environment: "node",
    globals: false,
  },
});
