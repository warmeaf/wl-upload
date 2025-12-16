import { describe, expect, it } from "vitest";
import { calculateChunkHash, createFileHasher } from "../../../src/utils/hash";

describe("Hash Utils", () => {
  describe("calculateChunkHash", () => {
    it("should calculate hash for a single chunk", () => {
      const chunk = new ArrayBuffer(10);
      const view = new Uint8Array(chunk);
      view.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const hash = calculateChunkHash(chunk);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(32); // MD5 hash is 32 hex characters
    });

    it("should return the same hash for the same input", () => {
      const chunk = new ArrayBuffer(10);
      const view = new Uint8Array(chunk);
      view.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const hash1 = calculateChunkHash(chunk);
      const hash2 = calculateChunkHash(chunk);

      expect(hash1).toBe(hash2);
    });

    it("should return different hashes for different inputs", () => {
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

    it("should return lowercase hexadecimal string", () => {
      const chunk = new ArrayBuffer(10);
      const hash = calculateChunkHash(chunk);

      expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });

    it("should handle empty ArrayBuffer", () => {
      const chunk = new ArrayBuffer(0);
      const hash = calculateChunkHash(chunk);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(32);
    });
  });

  describe("createFileHasher", () => {
    it("should return a FileHasher object with append and end methods", () => {
      const hasher = createFileHasher();

      expect(hasher).toBeDefined();
      expect(typeof hasher.append).toBe("function");
      expect(typeof hasher.end).toBe("function");
    });

    it("should allow appending chunks and finalizing hash", () => {
      const hasher = createFileHasher();

      const chunk1 = new ArrayBuffer(5);
      const view1 = new Uint8Array(chunk1);
      view1.set([1, 2, 3, 4, 5]);

      const chunk2 = new ArrayBuffer(5);
      const view2 = new Uint8Array(chunk2);
      view2.set([6, 7, 8, 9, 10]);

      hasher.append(chunk1);
      hasher.append(chunk2);

      const hash = hasher.end();

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(32);
      expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });

    it("should return the same hash for the same sequence of chunks", () => {
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

    it("should return different hashes for different sequences", () => {
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

    it("should handle empty data", () => {
      const hasher = createFileHasher();
      const hash = hasher.end();

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(32);
    });

    it("should handle single chunk", () => {
      const hasher = createFileHasher();

      const chunk = new ArrayBuffer(10);
      const view = new Uint8Array(chunk);
      view.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      hasher.append(chunk);
      const hash = hasher.end();

      expect(hash).toBeTruthy();
      expect(hash.length).toBe(32);
    });

    it("should handle multiple chunks", () => {
      const hasher = createFileHasher();

      for (let i = 0; i < 10; i++) {
        const chunk = new ArrayBuffer(100);
        const view = new Uint8Array(chunk);
        view.fill(i);
        hasher.append(chunk);
      }

      const hash = hasher.end();

      expect(hash).toBeTruthy();
      expect(hash.length).toBe(32);
    });
  });
});
