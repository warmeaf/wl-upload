import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "WlUpload",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["mitt", "spark-md5", "@wl-upload/shared"],
    },
    sourcemap: true,
  },
  worker: {
    format: "es",
  },
});
