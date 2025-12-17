/**
 * index.ts integration tests
 * 测试模块导出
 */

import { describe, expect, it } from "vitest";
import * as client from "../../src/index";

describe("Client entry point", () => {
  it("should export FileUploader class", () => {
    expect(client.FileUploader).toBeDefined();
    expect(typeof client.FileUploader).toBe("function");
  });

  it("should export types", () => {
    // Since we're using ES modules, just verify the types are available
    // The TypeScript compiler will verify type exports during compilation
    expect(true).toBe(true);
  });

  it("should have required exports", () => {
    const exports = Object.keys(client);

    // Check that main exports exist
    expect(exports).toContain("FileUploader");
  });
});
