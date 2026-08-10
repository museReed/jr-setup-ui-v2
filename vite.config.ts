import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// root 指到 web adapter，但 domain 住在 src/domain——網頁與伺服器 import 的是
// 同一份判定邏輯（PRD D5）。所以不能把 root 鎖死在 web 底下。
export default defineConfig({
  root: "src/adapter/web",
  plugins: [preact()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:7430",
    },
  },
});
