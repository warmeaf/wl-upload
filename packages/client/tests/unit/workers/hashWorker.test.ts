import { describe, expect, it } from "vitest";
import { calculateChunkHash, createFileHasher } from "../../../src/utils/hash";

// Mock the Worker global for testing
// In a real Worker environment, we'd use self.postMessage and self.onmessage
// For testing, we'll simulate the Worker message handling

describe("Hash Worker", () => {
  // Note: Actual Worker implementation will be tested through WorkerManager
  // This test file focuses on testing the hash calculation logic that will run in the Worker

  describe("Chunk Hash Calculation", () => {
    it("should calculate hash for a single chunk", () => {
      const chunk = new ArrayBuffer(10);
      const view = new Uint8Array(chunk);
      view.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const hash = calculateChunkHash(chunk);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(32); // MD5 hash is 32 hex characters
      expect(hash).toMatch(/^[0-9a-f]{32}$/); // lowercase hex
    });

    it("should return the same hash for the same chunk data", () => {
      const chunk1 = new ArrayBuffer(10);
      const view1 = new Uint8Array(chunk1);
      view1.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const chunk2 = new ArrayBuffer(10);
      const view2 = new Uint8Array(chunk2);
      view2.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const hash1 = calculateChunkHash(chunk1);
      const hash2 = calculateChunkHash(chunk2);

      expect(hash1).toBe(hash2);
    });

    it("should return different hashes for different chunk data", () => {
      const chunk1 = new ArrayBuffer(10);
      const view1 = new Uint8Array(chunk1);
      view1.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const chunk2 = new ArrayBuffer(10);
      const view2 = new Uint8Array(chunk2);
      view2.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11]);

      const hash1 = calculateChunkHash(chunk1);
      const hash2 = calculateChunkHash(chunk2);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty ArrayBuffer", () => {
      const chunk = new ArrayBuffer(0);
      const hash = calculateChunkHash(chunk);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(32);
    });

    it("should handle large ArrayBuffer", () => {
      const size = 1024 * 1024; // 1MB
      const chunk = new ArrayBuffer(size);
      const view = new Uint8Array(chunk);
      view.fill(42);

      const hash = calculateChunkHash(chunk);

      expect(hash).toBeTruthy();
      expect(hash.length).toBe(32);
    });
  });

  describe("File Hash Calculation (Single-thread mode)", () => {
    it("should calculate file hash incrementally", () => {
      const hasher = createFileHasher();

      const chunk1 = new ArrayBuffer(5);
      const view1 = new Uint8Array(chunk1);
      view1.set([1, 2, 3, 4, 5]);

      const chunk2 = new ArrayBuffer(5);
      const view2 = new Uint8Array(chunk2);
      view2.set([6, 7, 8, 9, 10]);

      hasher.append(chunk1);
      hasher.append(chunk2);

      const fileHash = hasher.end();

      expect(fileHash).toBeTruthy();
      expect(typeof fileHash).toBe("string");
      expect(fileHash.length).toBe(32);
      expect(fileHash).toMatch(/^[0-9a-f]{32}$/);
    });

    it("should return the same file hash for the same sequence of chunks", () => {
      const hasher1 = createFileHasher();
      const hasher2 = createFileHasher();

      const chunk1 = new ArrayBuffer(5);
      const view1 = new Uint8Array(chunk1);
      view1.set([1, 2, 3, 4, 5]);

      const chunk2 = new ArrayBuffer(5);
      const view2 = new Uint8Array(chunk2);
      view2.set([6, 7, 8, 9, 10]);

      hasher1.append(chunk1);
      hasher1.append(chunk2);

      hasher2.append(chunk1);
      hasher2.append(chunk2);

      const hash1 = hasher1.end();
      const hash2 = hasher2.end();

      expect(hash1).toBe(hash2);
    });

    it("should return different file hashes for different chunk sequences", () => {
      const hasher1 = createFileHasher();
      const hasher2 = createFileHasher();

      const chunk1 = new ArrayBuffer(5);
      const view1 = new Uint8Array(chunk1);
      view1.set([1, 2, 3, 4, 5]);

      const chunk2 = new ArrayBuffer(5);
      const view2 = new Uint8Array(chunk2);
      view2.set([6, 7, 8, 9, 10]);

      hasher1.append(chunk1);
      hasher1.append(chunk2);

      hasher2.append(chunk2);
      hasher2.append(chunk1);

      const hash1 = hasher1.end();
      const hash2 = hasher2.end();

      expect(hash1).not.toBe(hash2);
    });

    it("should handle multiple chunks", () => {
      const hasher = createFileHasher();

      for (let i = 0; i < 10; i++) {
        const chunk = new ArrayBuffer(100);
        const view = new Uint8Array(chunk);
        view.fill(i);
        hasher.append(chunk);
      }

      const fileHash = hasher.end();

      expect(fileHash).toBeTruthy();
      expect(fileHash.length).toBe(32);
    });
  });
});
