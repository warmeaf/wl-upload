import { describe, expect, it } from "vitest";
import { calculateChunkCount, splitFileIntoChunks, validateFile } from "../../../src/utils/file";

describe("File Utils", () => {
  describe("validateFile", () => {
    it("should pass validation for valid file", () => {
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      expect(() => validateFile(file)).not.toThrow();
    });

    it("should throw error for empty file (size = 0)", () => {
      const file = new File([], "empty.txt", {
        type: "text/plain",
      });

      expect(() => validateFile(file)).toThrow();
    });

    it("should throw error for null file", () => {
      expect(() => validateFile(null as unknown as File)).toThrow();
    });

    it("should throw error for undefined file", () => {
      expect(() => validateFile(undefined as unknown as File)).toThrow();
    });
  });

  describe("calculateChunkCount", () => {
    it("should return 1 when file size is less than chunk size", () => {
      const fileSize = 1024; // 1KB
      const chunkSize = 5 * 1024 * 1024; // 5MB

      expect(calculateChunkCount(fileSize, chunkSize)).toBe(1);
    });

    it("should return 1 when file size equals chunk size", () => {
      const fileSize = 5 * 1024 * 1024; // 5MB
      const chunkSize = 5 * 1024 * 1024; // 5MB

      expect(calculateChunkCount(fileSize, chunkSize)).toBe(1);
    });

    it("should return correct count when file size is greater than chunk size", () => {
      const fileSize = 12 * 1024 * 1024; // 12MB
      const chunkSize = 5 * 1024 * 1024; // 5MB

      expect(calculateChunkCount(fileSize, chunkSize)).toBe(3); // Math.ceil(12/5) = 3
    });

    it("should handle edge case: file size slightly larger than chunk size", () => {
      const fileSize = 5 * 1024 * 1024 + 1; // 5MB + 1 byte
      const chunkSize = 5 * 1024 * 1024; // 5MB

      expect(calculateChunkCount(fileSize, chunkSize)).toBe(2);
    });
  });

  describe("splitFileIntoChunks", () => {
    it("should return single chunk for small file", async () => {
      const content = new Uint8Array(1024).fill(65); // 1KB of 'A'
      const file = new File([content], "small.txt", {
        type: "text/plain",
      });
      const chunkSize = 5 * 1024 * 1024; // 5MB

      const chunks = await splitFileIntoChunks(file, chunkSize);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].data.byteLength).toBe(1024);
    });

    it("should split large file into multiple chunks", async () => {
      const content = new Uint8Array(12 * 1024 * 1024).fill(66); // 12MB of 'B'
      const file = new File([content], "large.txt", {
        type: "text/plain",
      });
      const chunkSize = 5 * 1024 * 1024; // 5MB

      const chunks = await splitFileIntoChunks(file, chunkSize);

      expect(chunks).toHaveLength(3);
      expect(chunks[0].index).toBe(0);
      expect(chunks[1].index).toBe(1);
      expect(chunks[2].index).toBe(2);

      // First two chunks should be full size
      expect(chunks[0].data.byteLength).toBe(5 * 1024 * 1024);
      expect(chunks[1].data.byteLength).toBe(5 * 1024 * 1024);

      // Last chunk should be smaller
      expect(chunks[2].data.byteLength).toBe(2 * 1024 * 1024);
    });

    it("should have correct indices starting from 0", async () => {
      const content = new Uint8Array(8 * 1024 * 1024).fill(67); // 8MB
      const file = new File([content], "medium.txt", {
        type: "text/plain",
      });
      const chunkSize = 3 * 1024 * 1024; // 3MB

      const chunks = await splitFileIntoChunks(file, chunkSize);

      expect(chunks[0].index).toBe(0);
      expect(chunks[1].index).toBe(1);
      expect(chunks[2].index).toBe(2);
    });

    it("should preserve file data integrity", async () => {
      const originalContent = new Uint8Array(7 * 1024 * 1024);
      // Fill with pattern
      for (let i = 0; i < originalContent.length; i++) {
        originalContent[i] = i % 256;
      }
      const file = new File([originalContent], "pattern.txt", {
        type: "text/plain",
      });
      const chunkSize = 2 * 1024 * 1024; // 2MB

      const chunks = await splitFileIntoChunks(file, chunkSize);

      // Reconstruct file from chunks
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.data.byteLength, 0);
      expect(totalSize).toBe(file.size);

      // Verify data integrity by checking first and last bytes
      const firstChunk = new Uint8Array(chunks[0].data);
      const lastChunk = new Uint8Array(chunks[chunks.length - 1].data);

      expect(firstChunk[0]).toBe(originalContent[0]);
      expect(lastChunk[lastChunk.length - 1]).toBe(originalContent[originalContent.length - 1]);
    });

    it("should handle file size exactly divisible by chunk size", async () => {
      const content = new Uint8Array(10 * 1024 * 1024).fill(68); // 10MB
      const file = new File([content], "exact.txt", {
        type: "text/plain",
      });
      const chunkSize = 5 * 1024 * 1024; // 5MB

      const chunks = await splitFileIntoChunks(file, chunkSize);

      expect(chunks).toHaveLength(2);
      expect(chunks[0].data.byteLength).toBe(5 * 1024 * 1024);
      expect(chunks[1].data.byteLength).toBe(5 * 1024 * 1024);
    });
  });
});
