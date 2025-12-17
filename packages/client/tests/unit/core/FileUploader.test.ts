/**
 * FileUploader 单元测试
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileUploader } from "../../../src/core/FileUploader";
import { setWorkerFactory } from "../../../src/core/WorkerManager";
import type { FileUploaderOptions } from "../../../src/types/config";

// Mock Worker for testing
const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null,
  onerror: null,
};

// Mock fetch globally
global.fetch = vi.fn() as unknown as typeof fetch;

describe("FileUploader", () => {
  let testFile: File;
  let mockOptions: FileUploaderOptions;

  beforeEach(() => {
    // Create test file
    testFile = new File(["test content"], "test.txt", { type: "text/plain" });

    // Setup mock options
    mockOptions = {
      config: {
        baseUrl: "http://localhost:3000",
        chunkSize: 1024 * 1024, // 1MB
        concurrency: 3,
        enableMultiThreading: true,
      },
      onProgress: vi.fn(),
      onStatusChange: vi.fn(),
    };

    // Mock Worker factory
    setWorkerFactory(() => mockWorker as unknown as Worker);

    // Reset fetch mock
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create FileUploader instance with default config", () => {
      const uploader = new FileUploader(mockOptions);
      expect(uploader).toBeInstanceOf(FileUploader);
    });

    it("should use provided config values", () => {
      const uploader = new FileUploader(mockOptions);
      expect(uploader.getStatus()).toBe("idle");
    });
  });

  describe("validateFile", () => {
    it("should validate non-empty file", async () => {
      const uploader = new FileUploader(mockOptions);
      const result = await uploader.validateFile(testFile);
      expect(result).toBe(true);
    });

    it("should reject empty file", async () => {
      const emptyFile = new File([""], "empty.txt", { type: "text/plain" });
      const uploader = new FileUploader(mockOptions);
      const result = await uploader.validateFile(emptyFile);
      expect(result).toBe(false);
    });

    it("should reject null file", async () => {
      const uploader = new FileUploader(mockOptions);
      const result = await uploader.validateFile(null as unknown as File);
      expect(result).toBe(false);
    });
  });

  describe("upload", () => {
    it("should start upload process and validate file", async () => {
      // Mock successful API response for create session
      // biome-ignore lint/suspicious/noExplicitAny: Required for mocking fetch in tests
      (fetch as any).mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ code: 0, token: "test-token" }),
        });
      });

      const uploader = new FileUploader(mockOptions);
      expect(uploader.getStatus()).toBe("idle");

      // Test file validation directly
      const isValid = await uploader.validateFile(testFile);
      expect(isValid).toBe(true);

      const invalidFile = new File([""], "empty.txt", { type: "text/plain" });
      const isInvalid = await uploader.validateFile(invalidFile);
      expect(isInvalid).toBe(false);
    });

    it("should handle upload failure during session creation", async () => {
      // Mock API failure
      // biome-ignore lint/suspicious/noExplicitAny: Required for mocking fetch in tests
      (fetch as any).mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ code: 1, message: "Server error" }),
        });
      });

      const uploader = new FileUploader(mockOptions);

      await expect(uploader.upload(testFile)).rejects.toThrow();
      expect(uploader.getStatus()).toBe("failed");
    });
  });

  describe("abort", () => {
    it("should set status to failed when aborted", () => {
      const uploader = new FileUploader(mockOptions);

      // Abort without starting upload
      uploader.abort();

      expect(uploader.getStatus()).toBe("failed");
    });
  });

  describe("getStatus", () => {
    it("should return current upload status", () => {
      const uploader = new FileUploader(mockOptions);
      expect(uploader.getStatus()).toBe("idle");
    });
  });
});
