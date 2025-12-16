import { describe, expect, it } from "vitest";
import { ChunkProcessor } from "../../../src/core/ChunkProcessor";

describe("ChunkProcessor", () => {
  describe("processFile", () => {
    it("should split file into chunks correctly", async () => {
      const processor = new ChunkProcessor({ chunkSize: 10 });

      // Create a test file with 25 bytes (3 chunks: 10, 10, 5)
      const fileContent = new Uint8Array(25);
      fileContent.fill(42);
      const file = new File([fileContent], "test.txt", { type: "text/plain" });

      const chunks = await processor.processFile(file);

      expect(chunks).toHaveLength(3);
      expect(chunks[0].index).toBe(0);
      expect(chunks[1].index).toBe(1);
      expect(chunks[2].index).toBe(2);
      expect(chunks[0].data.byteLength).toBe(10);
      expect(chunks[1].data.byteLength).toBe(10);
      expect(chunks[2].data.byteLength).toBe(5);
    });

    it("should handle file smaller than chunk size", async () => {
      const processor = new ChunkProcessor({ chunkSize: 10 });

      const fileContent = new Uint8Array(5);
      fileContent.fill(42);
      const file = new File([fileContent], "test.txt", { type: "text/plain" });

      const chunks = await processor.processFile(file);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].data.byteLength).toBe(5);
    });

    it("should handle file exactly matching chunk size", async () => {
      const processor = new ChunkProcessor({ chunkSize: 10 });

      const fileContent = new Uint8Array(10);
      fileContent.fill(42);
      const file = new File([fileContent], "test.txt", { type: "text/plain" });

      const chunks = await processor.processFile(file);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].data.byteLength).toBe(10);
    });

    it("should handle file that is multiple of chunk size", async () => {
      const processor = new ChunkProcessor({ chunkSize: 10 });

      const fileContent = new Uint8Array(30);
      fileContent.fill(42);
      const file = new File([fileContent], "test.txt", { type: "text/plain" });

      const chunks = await processor.processFile(file);

      expect(chunks).toHaveLength(3);
      expect(chunks[0].data.byteLength).toBe(10);
      expect(chunks[1].data.byteLength).toBe(10);
      expect(chunks[2].data.byteLength).toBe(10);
    });

    it("should preserve chunk data integrity", async () => {
      const processor = new ChunkProcessor({ chunkSize: 10 });

      // Create file with distinct data in each chunk
      const fileContent = new Uint8Array(25);
      for (let i = 0; i < 25; i++) {
        fileContent[i] = i;
      }
      const file = new File([fileContent], "test.txt", { type: "text/plain" });

      const chunks = await processor.processFile(file);

      // Verify first chunk
      const chunk0View = new Uint8Array(chunks[0].data);
      expect(chunk0View[0]).toBe(0);
      expect(chunk0View[9]).toBe(9);

      // Verify second chunk
      const chunk1View = new Uint8Array(chunks[1].data);
      expect(chunk1View[0]).toBe(10);
      expect(chunk1View[9]).toBe(19);

      // Verify third chunk (last 5 bytes)
      const chunk2View = new Uint8Array(chunks[2].data);
      expect(chunk2View[0]).toBe(20);
      expect(chunk2View[4]).toBe(24);
    });

    it("should throw error for empty file", async () => {
      const processor = new ChunkProcessor({ chunkSize: 10 });

      const file = new File([], "empty.txt", { type: "text/plain" });

      await expect(processor.processFile(file)).rejects.toThrow();
    });

    it("should throw error for invalid file", async () => {
      const processor = new ChunkProcessor({ chunkSize: 10 });

      await expect(processor.processFile(null as unknown as File)).rejects.toThrow();
      await expect(processor.processFile(undefined as unknown as File)).rejects.toThrow();
    });

    it("should calculate total chunk count correctly", async () => {
      const processor = new ChunkProcessor({ chunkSize: 10 });

      const fileContent = new Uint8Array(25);
      fileContent.fill(42);
      const file = new File([fileContent], "test.txt", { type: "text/plain" });

      const chunks = await processor.processFile(file);

      expect(chunks.length).toBe(3);
    });

    it("should handle large files", async () => {
      const processor = new ChunkProcessor({ chunkSize: 1024 });

      // Create a 5KB file
      const fileContent = new Uint8Array(5 * 1024);
      fileContent.fill(42);
      const file = new File([fileContent], "large.txt", { type: "text/plain" });

      const chunks = await processor.processFile(file);

      // Should create 5 chunks of 1024 bytes each
      expect(chunks.length).toBe(5);
      chunks.forEach((chunk) => {
        expect(chunk.data.byteLength).toBe(1024);
      });
    });
  });

  describe("getTotalChunks", () => {
    it("should return correct chunk count for given file size", () => {
      const processor = new ChunkProcessor({ chunkSize: 10 });

      expect(processor.getTotalChunks(25)).toBe(3);
      expect(processor.getTotalChunks(10)).toBe(1);
      expect(processor.getTotalChunks(5)).toBe(1);
      expect(processor.getTotalChunks(30)).toBe(3);
      expect(processor.getTotalChunks(0)).toBe(0);
    });

    it("should handle edge cases", () => {
      const processor = new ChunkProcessor({ chunkSize: 1024 });

      expect(processor.getTotalChunks(1024)).toBe(1);
      expect(processor.getTotalChunks(1025)).toBe(2);
      expect(processor.getTotalChunks(2048)).toBe(2);
    });
  });
});
