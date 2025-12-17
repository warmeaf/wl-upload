import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  server: {
    port: 3000,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        rewrite: (path) => path.replace(/^\/api/, ""),
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "wl-upload": resolve(__dirname, "../src/index.ts"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
