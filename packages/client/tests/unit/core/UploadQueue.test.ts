import type { PatchHashResponse, UploadChunkResponse } from "@wl-upload/shared";
import type { Emitter } from "mitt";
import mitt from "mitt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadConfig } from "../../../src/types/config";
import type { EventMap, QueueAbortedEvent } from "../../../src/types/events";

// Mock API functions
const mockCheckHashExists = vi.fn();
const mockUploadChunk = vi.fn();

// Mock the API functions from UploadQueue
vi.mock("../../../src/core/UploadQueue", async () => {
  const actual = await vi.importActual<typeof import("../../../src/core/UploadQueue")>(
    "../../../src/core/UploadQueue",
  );
  return {
    ...actual,
    checkHashExists: (...args: Parameters<typeof actual.checkHashExists>) =>
      mockCheckHashExists(...args),
    uploadChunk: (...args: Parameters<typeof actual.uploadChunk>) => mockUploadChunk(...args),
  };
});

describe("UploadQueue", () => {
  let emitter: Emitter<EventMap>;
  let config: UploadConfig;
  let chunks: ArrayBuffer[];
  let queues: Array<{ abort: () => void }> = [];

  // Helper to convert emitter type for UploadQueue
  const getEmitterForUploadQueue = (): Emitter<EventMap> => {
    return emitter;
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

    // Setup default mock responses
    mockCheckHashExists.mockResolvedValue({
      code: 200,
      exists: false,
    } as PatchHashResponse);

    mockUploadChunk.mockResolvedValue({
      code: 200,
      success: true,
    } as UploadChunkResponse);
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
      const { UploadQueue } = await import("../../../src/core/UploadQueue");
      const queue = new UploadQueue({
        config,
        emitter: getEmitterForUploadQueue(),
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
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have checked hash for each chunk
      expect(mockCheckHashExists).toHaveBeenCalledTimes(3);
    });

    it("should respect concurrency limit", async () => {
      const { UploadQueue } = await import("../../../src/core/UploadQueue");
      const queue = new UploadQueue({
        config: { ...config, concurrency: 2 },
        emitter: getEmitterForUploadQueue(),
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

      // Should have started at most 2 concurrent uploads
      const checkCalls = mockCheckHashExists.mock.calls.length;
      expect(checkCalls).toBeLessThanOrEqual(2);
    });
  });

  describe("Chunk instant upload", () => {
    it("should skip upload if chunk already exists", async () => {
      const { UploadQueue } = await import("../../../src/core/UploadQueue");
      const queue = new UploadQueue({
        config,
        emitter: getEmitterForUploadQueue(),
        token: "test-token",
      });
      queues.push(queue);

      // Mock chunk exists
      mockCheckHashExists.mockResolvedValueOnce({
        code: 200,
        exists: true,
      } as PatchHashResponse);

      emitter.emit("chunkHashed", {
        chunkIndex: 0,
        hash: "existing-hash",
        chunkData: chunks[0],
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should check hash
      expect(mockCheckHashExists).toHaveBeenCalledWith("test-token", "existing-hash", true);
      // Should NOT upload chunk
      expect(mockUploadChunk).not.toHaveBeenCalled();
    });

    it("should upload chunk if it does not exist", async () => {
      const { UploadQueue } = await import("../../../src/core/UploadQueue");
      const queue = new UploadQueue({
        config,
        emitter: getEmitterForUploadQueue(),
        token: "test-token",
      });
      queues.push(queue);

      // Mock chunk does not exist
      mockCheckHashExists.mockResolvedValueOnce({
        code: 200,
        exists: false,
      } as PatchHashResponse);

      emitter.emit("chunkHashed", {
        chunkIndex: 0,
        hash: "new-hash",
        chunkData: chunks[0],
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should check hash
      expect(mockCheckHashExists).toHaveBeenCalled();
      // Should upload chunk
      expect(mockUploadChunk).toHaveBeenCalled();
    });
  });

  describe("File instant upload", () => {
    it("should mark all tasks as complete when file exists", async () => {
      const { UploadQueue } = await import("../../../src/core/UploadQueue");
      const queue = new UploadQueue({
        config,
        emitter: getEmitterForUploadQueue(),
        token: "test-token",
      });
      queues.push(queue);

      // Enqueue some tasks
      for (let i = 0; i < 3; i++) {
        emitter.emit("chunkHashed", {
          chunkIndex: i,
          hash: `hash-${i}`,
          chunkData: chunks[i],
        });
      }

      // Wait a bit for tasks to start
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Mock file exists
      mockCheckHashExists.mockResolvedValueOnce({
        code: 200,
        exists: true,
      } as PatchHashResponse);

      // Emit file hashed event
      emitter.emit("fileHashed", {
        fileHash: "file-hash-123",
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should check file hash
      expect(mockCheckHashExists).toHaveBeenCalledWith("test-token", "file-hash-123", false);

      // Should emit QueueDrained
      let queueDrainedEmitted = false;
      emitter.on("queueDrained", () => {
        queueDrainedEmitted = true;
      });

      // Wait a bit more
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(queueDrainedEmitted).toBe(true);
    });
  });

  describe("Failure handling", () => {
    it("should abort queue on hash check failure", async () => {
      const { UploadQueue } = await import("../../../src/core/UploadQueue");
      const queue = new UploadQueue({
        config,
        emitter: getEmitterForUploadQueue(),
        token: "test-token",
      });
      queues.push(queue);

      // Mock hash check failure
      mockCheckHashExists.mockRejectedValueOnce(new Error("Network error"));

      let queueAbortedEmitted = false;
      let abortError: Error | undefined;
      emitter.on("queueAborted", (event: QueueAbortedEvent) => {
        queueAbortedEmitted = true;
        abortError = event.error;
      });

      emitter.emit("chunkHashed", {
        chunkIndex: 0,
        hash: "hash-0",
        chunkData: chunks[0],
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(queueAbortedEmitted).toBe(true);
      expect(abortError?.message).toBe("Network error");
    });

    it("should abort queue on upload failure", async () => {
      const { UploadQueue } = await import("../../../src/core/UploadQueue");
      const queue = new UploadQueue({
        config,
        emitter: getEmitterForUploadQueue(),
        token: "test-token",
      });
      queues.push(queue);

      // Mock upload failure
      mockUploadChunk.mockRejectedValueOnce(new Error("Upload failed"));

      let queueAbortedEmitted = false;
      emitter.on("queueAborted", () => {
        queueAbortedEmitted = true;
      });

      emitter.emit("chunkHashed", {
        chunkIndex: 0,
        hash: "hash-0",
        chunkData: chunks[0],
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(queueAbortedEmitted).toBe(true);
    });
  });

  describe("Queue completion", () => {
    it("should emit QueueDrained when all tasks complete", async () => {
      const { UploadQueue } = await import("../../../src/core/UploadQueue");
      const queue = new UploadQueue({
        config,
        emitter: getEmitterForUploadQueue(),
        token: "test-token",
      });
      queues.push(queue);

      let queueDrainedEmitted = false;
      emitter.on("queueDrained", () => {
        queueDrainedEmitted = true;
      });

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
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(queueDrainedEmitted).toBe(true);
    });

    it("should not emit QueueDrained if AllChunksHashed not received", async () => {
      const { UploadQueue } = await import("../../../src/core/UploadQueue");
      const queue = new UploadQueue({
        config,
        emitter: getEmitterForUploadQueue(),
        token: "test-token",
      });
      queues.push(queue);

      let queueDrainedEmitted = false;
      emitter.on("queueDrained", () => {
        queueDrainedEmitted = true;
      });

      // Emit chunks but not allChunksHashed
      for (let i = 0; i < 3; i++) {
        emitter.emit("chunkHashed", {
          chunkIndex: i,
          hash: `hash-${i}`,
          chunkData: chunks[i],
        });
      }

      // Wait
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(queueDrainedEmitted).toBe(false);
    });
  });

  describe("Task state transitions", () => {
    it("should transition tasks from pending to inFlight to completed", async () => {
      const { UploadQueue } = await import("../../../src/core/UploadQueue");
      const queue = new UploadQueue({
        config: { ...config, concurrency: 1 },
        emitter: getEmitterForUploadQueue(),
        token: "test-token",
      });
      queues.push(queue);

      // Emit 2 chunks
      emitter.emit("chunkHashed", {
        chunkIndex: 0,
        hash: "hash-0",
        chunkData: chunks[0],
      });

      emitter.emit("chunkHashed", {
        chunkIndex: 1,
        hash: "hash-1",
        chunkData: chunks[1],
      });

      // Wait for first task to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // First task should be processed
      expect(mockCheckHashExists).toHaveBeenCalledTimes(1);

      // Wait for second task
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second task should be processed
      expect(mockCheckHashExists).toHaveBeenCalledTimes(2);
    });
  });
});
