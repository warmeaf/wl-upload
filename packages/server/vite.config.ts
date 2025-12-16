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
      external: ["hono", "mongodb", "@wl-upload/shared"],
    },
    sourcemap: true,
  },
});
