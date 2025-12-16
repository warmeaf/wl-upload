import { resolve } from "node:path";
import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "WlUploadShared",
      fileName: "index",
      formats: ["es"],
    },
    sourcemap: true,
  },
  plugins: [
    dts({
      tsconfigPath: "./tsconfig.json",
    }),
  ],
});
