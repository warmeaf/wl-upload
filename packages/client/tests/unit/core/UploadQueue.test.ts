import type { PatchHashResponse, UploadChunkResponse } from "@wl-upload/shared";
import type { Emitter } from "mitt";
import mitt from "mitt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Import the actual UploadQueue implementation for dependency injection testing
import { UploadQueue } from "../../../src/core/UploadQueue";
import type { UploadConfig } from "../../../src/types/config";
import type { EventMap } from "../../../src/types/events";

describe("UploadQueue (Integration Tests)", () => {
  let emitter: Emitter<EventMap>;
  let config: UploadConfig;
  let chunks: ArrayBuffer[];
  let mockFetch: ReturnType<typeof vi.fn>;
  let queues: Array<{ abort: () => void }> = [];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch globally
    mockFetch = vi.fn();
    // @ts-expect-error - Intentionally replacing fetch with mock for testing
    global.fetch = mockFetch;

    emitter = mitt<EventMap>();
    config = {
      baseUrl: "https://api.example.com",
      concurrency: 3,
    };
    chunks = [];
    queues = [];

    // Create test chunks
    for (let i = 0; i < 5; i++) {
      const chunk = new ArrayBuffer(10);
      const view = new Uint8Array(chunk);
      view.fill(i);
      chunks.push(chunk);
    }
  });

  afterEach(() => {
    // Clean up queues
    for (const q of queues) {
      q.abort();
    }
    queues = [];
    vi.restoreAllMocks();
  });

  describe("Task enqueueing", () => {
    it("should enqueue tasks when ChunkHashed events are received", async () => {
      // Mock successful hash check (chunk doesn't exist)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () =>
          ({
            code: 200,
            exists: false,
          }) as PatchHashResponse,
      });

      const queue = new UploadQueue({
        config,
        emitter,
        token: "test-token",
      });
      queues.push(queue);

      // Emit chunk hashed events
      for (let i = 0; i < 3; i++) {
        emitter.emit("chunkHashed", {
          chunkIndex: i,
          hash: `hash-${i}`,
          chunkData: chunks[i],
        });
      }

      // Wait for tasks to be processed
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should have made hash check requests for each chunk
      // Note: It might call multiple times due to completion checks
      const hashCheckCalls = mockFetch.mock.calls.filter(
        (call) => call[0] === "https://api.example.com/file/patchHash",
      );
      expect(hashCheckCalls.length).toBeGreaterThanOrEqual(3);

      // Verify the requests were made correctly
      for (let i = 0; i < 3; i++) {
        expect(mockFetch).toHaveBeenNthCalledWith(i + 1, "https://api.example.com/file/patchHash", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: "test-token",
            hash: `hash-${i}`,
            isChunk: true,
          }),
        });
      }
    });

    it("should respect concurrency limit", async () => {
      // Mock slow hash check
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () =>
                  ({
                    code: 200,
                    exists: false,
                  }) as PatchHashResponse,
              });
            }, 100);
          }),
      );

      const queue = new UploadQueue({
        config: { ...config, concurrency: 2 },
        emitter,
        token: "test-token",
      });
      queues.push(queue);

      // Emit 5 chunk hashed events
      for (let i = 0; i < 5; i++) {
        emitter.emit("chunkHashed", {
          chunkIndex: i,
          hash: `hash-${i}`,
          chunkData: chunks[i],
        });
      }

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have started at most 2 concurrent hash checks
      const checkCalls = mockFetch.mock.calls.length;
      expect(checkCalls).toBeLessThanOrEqual(2);
    });
  });

  describe("Chunk instant upload", () => {
    it("should skip upload if chunk already exists", async () => {
      // Mock chunk exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          ({
            code: 200,
            exists: true,
          }) as PatchHashResponse,
      });

      const queue = new UploadQueue({
        config,
        emitter,
        token: "test-token",
      });
      queues.push(queue);

      emitter.emit("chunkHashed", {
        chunkIndex: 0,
        hash: "existing-hash",
        chunkData: chunks[0],
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should check hash but NOT upload
      // Note: There might be multiple calls due to completion checks
      const hashCheckCalls = mockFetch.mock.calls.filter(
        (call) => call[0] === "https://api.example.com/file/patchHash",
      );
      expect(hashCheckCalls.length).toBeGreaterThanOrEqual(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/file/patchHash",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            token: "test-token",
            hash: "existing-hash",
            isChunk: true,
          }),
        }),
      );
    });

    it("should upload chunk if it does not exist", async () => {
      // Mock chunk doesn't exist
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            ({
              code: 200,
              exists: false,
            }) as PatchHashResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            ({
              code: 200,
              success: true,
            }) as UploadChunkResponse,
        });

      const queue = new UploadQueue({
        config,
        emitter,
        token: "test-token",
      });
      queues.push(queue);

      emitter.emit("chunkHashed", {
        chunkIndex: 0,
        hash: "new-hash",
        chunkData: chunks[0],
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should check hash and upload chunk
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // First call: hash check
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "https://api.example.com/file/patchHash",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            token: "test-token",
            hash: "new-hash",
            isChunk: true,
          }),
        }),
      );

      // Second call: upload
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://api.example.com/file/uploadChunk",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        }),
      );
    });
  });

  describe("Failure handling", () => {
    it("should abort queue on hash check failure", async () => {
      // Mock hash check failure
      mockFetch.mockRejectedValue(new Error("Network error"));

      let queueAbortedEmitted = false;
      let abortError: Error | undefined;
      emitter.on("queueAborted", (event) => {
        queueAbortedEmitted = true;
        abortError = event.error;
      });

      const queue = new UploadQueue({
        config,
        emitter,
        token: "test-token",
      });
      queues.push(queue);

      emitter.emit("chunkHashed", {
        chunkIndex: 0,
        hash: "hash-0",
        chunkData: chunks[0],
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(queueAbortedEmitted).toBe(true);
      expect(abortError?.message).toBe("Network error");
    });

    it("should abort queue on upload failure", async () => {
      // Mock hash check succeeds but upload fails
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            ({
              code: 200,
              exists: false,
            }) as PatchHashResponse,
        })
        .mockRejectedValueOnce(new Error("Upload failed"));

      let queueAbortedEmitted = false;
      emitter.on("queueAborted", () => {
        queueAbortedEmitted = true;
      });

      const queue = new UploadQueue({
        config,
        emitter,
        token: "test-token",
      });
      queues.push(queue);

      emitter.emit("chunkHashed", {
        chunkIndex: 0,
        hash: "hash-0",
        chunkData: chunks[0],
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(queueAbortedEmitted).toBe(true);
    });
  });

  describe("Queue completion", () => {
    it("should emit QueueDrained when all tasks complete", async () => {
      // Mock successful hash checks (chunks exist)
      mockFetch.mockImplementation(() => ({
        ok: true,
        json: async () =>
          ({
            code: 200,
            exists: true,
          }) as PatchHashResponse,
      }));

      let queueDrainedEmitted = false;
      emitter.on("queueDrained", () => {
        queueDrainedEmitted = true;
      });

      const queue = new UploadQueue({
        config,
        emitter,
        token: "test-token",
      });
      queues.push(queue);

      // Emit all chunks
      for (let i = 0; i < 3; i++) {
        emitter.emit("chunkHashed", {
          chunkIndex: i,
          hash: `hash-${i}`,
          chunkData: chunks[i],
        });
      }

      // Emit all chunks hashed
      emitter.emit("allChunksHashed", {});

      // Wait for all tasks to complete
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(queueDrainedEmitted).toBe(true);
    });
  });
});
