import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "WlUploadServer",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "hono",
        "mongodb",
        "@wl-upload/shared",
        "http",
        "https",
        "http2",
        "stream",
        "crypto",
        "fs",
        "path",
        "url",
        "os",
        "util",
        "node:crypto",
        "node:fs",
        "node:path",
        "node:url",
      ],
    },
    sourcemap: true,
  },
});
