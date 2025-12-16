import type { Emitter } from "mitt";
import mitt from "mitt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setWorkerFactory } from "../../../src/core/WorkerManager";
import type {
  ChunkHashedEvent,
  EventMap,
  FileHashedEvent,
  QueueAbortedEvent,
} from "../../../src/types/events";
import { createFileHasher } from "../../../src/utils/hash";

// Worker message types (matching WorkerManager types)
interface WorkerMessage {
  type: "hashChunk" | "hashFile";
  chunkIndex?: number;
  chunkData?: ArrayBuffer;
  chunks?: ArrayBuffer[];
}

interface WorkerResponse {
  type: "chunkHashed" | "fileHashed" | "error";
  chunkIndex?: number;
  hash?: string;
  chunkData?: ArrayBuffer;
  fileHash?: string;
  error?: string;
}

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private messages: WorkerMessage[] = [];

  postMessage(data: WorkerMessage) {
    this.messages.push(data);
  }

  terminate() {
    // Mock terminate
  }

  // Helper to simulate worker response
  simulateMessage(data: WorkerResponse) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }

  // Helper to simulate worker error
  simulateError(error: Error) {
    if (this.onerror) {
      this.onerror({ error, message: error.message } as ErrorEvent);
    }
  }

  // Get messages sent to worker
  getMessages() {
    return this.messages;
  }

  clearMessages() {
    this.messages = [];
  }
}

// Mock workers array
const mockWorkers: MockWorker[] = [];

describe("WorkerManager", () => {
  let emitter: Emitter<EventMap>;
  let chunks: ArrayBuffer[];

  // Helper to convert emitter type for WorkerManager
  const getEmitterForWorkerManager = (): Emitter<EventMap> => {
    return emitter;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkers.length = 0;
    emitter = mitt<EventMap>();
    chunks = [];

    // Create test chunks
    for (let i = 0; i < 5; i++) {
      const chunk = new ArrayBuffer(10);
      const view = new Uint8Array(chunk);
      view.fill(i);
      chunks.push(chunk);
    }

    // Set up worker factory to use mocked workers
    setWorkerFactory(() => {
      const worker = new MockWorker();
      mockWorkers.push(worker);
      return worker as unknown as Worker;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Single-thread mode", () => {
    it("should process chunks sequentially and emit events in order", async () => {
      const { WorkerManager } = await import("../../../src/core/WorkerManager");
      const manager = new WorkerManager({
        enableMultiThreading: false,
        emitter: getEmitterForWorkerManager(),
      });

      const events: ChunkHashedEvent[] = [];
      emitter.on("chunkHashed", (event: ChunkHashedEvent) => {
        events.push(event);
      });

      let allChunksHashedEmitted = false;
      emitter.on("allChunksHashed", () => {
        allChunksHashedEmitted = true;
      });

      let fileHashedEmitted = false;
      let fileHashValue = "";
      emitter.on("fileHashed", (event: FileHashedEvent) => {
        fileHashedEmitted = true;
        fileHashValue = event.fileHash;
      });

      // Start processing
      manager.processChunks(chunks);

      // Simulate worker responses sequentially
      const worker = mockWorkers[0];
      expect(worker).toBeDefined();

      // Process chunks one by one
      for (let i = 0; i < chunks.length; i++) {
        const message = worker.getMessages()[i];
        expect(message.type).toBe("hashChunk");
        expect(message.chunkIndex).toBe(i);

        // Simulate hash calculation
        const { calculateChunkHash } = await import("../../../src/utils/hash");
        const hash = calculateChunkHash(chunks[i]);

        worker.simulateMessage({
          type: "chunkHashed",
          chunkIndex: i,
          hash,
          chunkData: chunks[i],
        });
      }

      // Wait for all chunks to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify all chunks were processed in order
      expect(events.length).toBe(chunks.length);
      for (let i = 0; i < events.length; i++) {
        expect(events[i].chunkIndex).toBe(i);
      }

      // Verify allChunksHashed event
      expect(allChunksHashedEmitted).toBe(true);

      // In single-thread mode, file hash should be calculated in worker
      // Simulate file hash calculation
      const fileHashMessage = worker.getMessages().find((m) => m.type === "hashFile");
      if (fileHashMessage) {
        const hasher = createFileHasher();
        for (const chunk of chunks) {
          hasher.append(chunk);
        }
        const fileHash = hasher.end();

        worker.simulateMessage({
          type: "fileHashed",
          fileHash,
        });

        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(fileHashedEmitted).toBe(true);
        expect(fileHashValue).toBe(fileHash);
      }

      manager.abort();
    });

    it("should handle worker errors and emit queueAborted event", async () => {
      const { WorkerManager } = await import("../../../src/core/WorkerManager");
      const manager = new WorkerManager({
        enableMultiThreading: false,
        emitter: getEmitterForWorkerManager(),
      });

      let queueAbortedEmitted = false;
      let errorMessage = "";
      emitter.on("queueAborted", (event: QueueAbortedEvent) => {
        queueAbortedEmitted = true;
        errorMessage = event.error.message;
      });

      manager.processChunks(chunks);

      const worker = mockWorkers[0];
      worker.simulateError(new Error("Worker error"));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(queueAbortedEmitted).toBe(true);
      expect(errorMessage).toBe("Worker error: Worker error");

      manager.abort();
    });
  });

  describe("Multi-thread mode", () => {
    it("should distribute chunks across multiple workers", async () => {
      const { WorkerManager } = await import("../../../src/core/WorkerManager");
      const manager = new WorkerManager({
        enableMultiThreading: true,
        emitter: getEmitterForWorkerManager(),
      });

      const events: ChunkHashedEvent[] = [];
      emitter.on("chunkHashed", (event: ChunkHashedEvent) => {
        events.push(event);
      });

      manager.processChunks(chunks);

      // Should create multiple workers
      expect(mockWorkers.length).toBeGreaterThan(1);

      // Simulate responses from workers (may arrive out of order)
      const { calculateChunkHash } = await import("../../../src/utils/hash");

      // Send responses out of order to test result buffer
      const responses = [
        { index: 2, hash: calculateChunkHash(chunks[2]) },
        { index: 0, hash: calculateChunkHash(chunks[0]) },
        { index: 1, hash: calculateChunkHash(chunks[1]) },
        { index: 4, hash: calculateChunkHash(chunks[4]) },
        { index: 3, hash: calculateChunkHash(chunks[3]) },
      ];

      // Send responses from different workers
      for (let i = 0; i < responses.length; i++) {
        const worker = mockWorkers[i % mockWorkers.length];
        worker.simulateMessage({
          type: "chunkHashed",
          chunkIndex: responses[i].index,
          hash: responses[i].hash,
          chunkData: chunks[responses[i].index],
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Events should be emitted in order despite out-of-order responses
      expect(events.length).toBe(chunks.length);
      for (let i = 0; i < events.length; i++) {
        expect(events[i].chunkIndex).toBe(i);
      }

      manager.abort();
    });

    it("should calculate file hash in main thread for multi-thread mode", async () => {
      const { WorkerManager } = await import("../../../src/core/WorkerManager");
      const manager = new WorkerManager({
        enableMultiThreading: true,
        emitter: getEmitterForWorkerManager(),
      });

      let fileHashedEmitted = false;
      let fileHashValue = "";
      emitter.on("fileHashed", (event: FileHashedEvent) => {
        fileHashedEmitted = true;
        fileHashValue = event.fileHash;
      });

      manager.processChunks(chunks);

      const { calculateChunkHash } = await import("../../../src/utils/hash");

      // Process all chunks
      for (let i = 0; i < chunks.length; i++) {
        const worker = mockWorkers[i % mockWorkers.length];
        const hash = calculateChunkHash(chunks[i]);
        worker.simulateMessage({
          type: "chunkHashed",
          chunkIndex: i,
          hash,
          chunkData: chunks[i],
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // File hash should be calculated in main thread
      // Wait a bit more for file hash calculation
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fileHashedEmitted).toBe(true);
      expect(fileHashValue).toBeTruthy();
      expect(fileHashValue.length).toBe(32);

      manager.abort();
    });
  });

  describe("Result Buffer", () => {
    it("should buffer results and emit events in chunk index order", async () => {
      const { WorkerManager } = await import("../../../src/core/WorkerManager");
      const manager = new WorkerManager({
        enableMultiThreading: true,
        emitter: getEmitterForWorkerManager(),
      });

      const eventOrder: number[] = [];
      emitter.on("chunkHashed", (event: ChunkHashedEvent) => {
        eventOrder.push(event.chunkIndex);
      });

      manager.processChunks(chunks);

      const { calculateChunkHash } = await import("../../../src/utils/hash");

      // Send responses in reverse order
      for (let i = chunks.length - 1; i >= 0; i--) {
        const worker = mockWorkers[i % mockWorkers.length];
        const hash = calculateChunkHash(chunks[i]);
        worker.simulateMessage({
          type: "chunkHashed",
          chunkIndex: i,
          hash,
          chunkData: chunks[i],
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Events should be emitted in order (0, 1, 2, 3, 4)
      expect(eventOrder).toEqual([0, 1, 2, 3, 4]);

      manager.abort();
    });
  });

  describe("Abort", () => {
    it("should terminate all workers on abort", async () => {
      const { WorkerManager } = await import("../../../src/core/WorkerManager");
      const manager = new WorkerManager({
        enableMultiThreading: true,
        emitter: getEmitterForWorkerManager(),
      });

      manager.processChunks(chunks);

      const terminateSpy = vi.spyOn(MockWorker.prototype, "terminate");

      manager.abort();

      expect(terminateSpy).toHaveBeenCalled();
    });

    it("should not emit events after abort", async () => {
      const { WorkerManager } = await import("../../../src/core/WorkerManager");
      const manager = new WorkerManager({
        enableMultiThreading: false,
        emitter: getEmitterForWorkerManager(),
      });

      let eventCount = 0;
      emitter.on("chunkHashed", () => {
        eventCount++;
      });

      manager.processChunks(chunks);

      // Abort immediately
      manager.abort();

      // Simulate worker response after abort
      const worker = mockWorkers[0];
      if (worker) {
        worker.simulateMessage({
          type: "chunkHashed",
          chunkIndex: 0,
          hash: "test-hash",
          chunkData: chunks[0],
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not emit events after abort
      expect(eventCount).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty chunks array", async () => {
      const { WorkerManager } = await import("../../../src/core/WorkerManager");
      const manager = new WorkerManager({
        enableMultiThreading: false,
        emitter: getEmitterForWorkerManager(),
      });

      let allChunksHashedEmitted = false;
      emitter.on("allChunksHashed", () => {
        allChunksHashedEmitted = true;
      });

      manager.processChunks([]);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(allChunksHashedEmitted).toBe(true);

      manager.abort();
    });

    it("should handle single chunk", async () => {
      const { WorkerManager } = await import("../../../src/core/WorkerManager");
      const manager = new WorkerManager({
        enableMultiThreading: false,
        emitter: getEmitterForWorkerManager(),
      });

      const singleChunk = [chunks[0]];
      const events: ChunkHashedEvent[] = [];
      emitter.on("chunkHashed", (event: ChunkHashedEvent) => {
        events.push(event);
      });

      manager.processChunks(singleChunk);

      const worker = mockWorkers[0];
      const { calculateChunkHash } = await import("../../../src/utils/hash");
      const hash = calculateChunkHash(singleChunk[0]);

      worker.simulateMessage({
        type: "chunkHashed",
        chunkIndex: 0,
        hash,
        chunkData: singleChunk[0],
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(events.length).toBe(1);
      expect(events[0].chunkIndex).toBe(0);

      manager.abort();
    });
  });
});
