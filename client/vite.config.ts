/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// T9: サーバー廃止によりproxy設定は不要(BYOKでブラウザからAnthropic APIへ直接アクセスする)。
// T11: GitHub Pagesのサブパス配信用に base を環境変数で切り替え可能にする。
export default defineConfig({
  base: process.env["HIRAMEKI_BASE"] ?? "/",
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    environment: "node",
    globals: false,
  },
});
