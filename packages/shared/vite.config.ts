import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "WlUploadShared",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      // shared 包通常不需要 external，因为它会被其他包使用
    },
    sourcemap: true,
  },
});
