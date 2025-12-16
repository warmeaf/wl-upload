import { describe, expectTypeOf, it } from "vitest";
import type {
  AllChunksHashedEvent,
  ChunkHashedEvent,
  FileHashedEvent,
  QueueAbortedEvent,
  QueueDrainedEvent,
  UploadEvents,
} from "../../src/types/events";

describe("Event Types", () => {
  describe("ChunkHashedEvent", () => {
    it("should have required fields: chunkIndex, hash, chunkData", () => {
      expectTypeOf<ChunkHashedEvent>().toHaveProperty("chunkIndex");
      expectTypeOf<ChunkHashedEvent>().toHaveProperty("hash");
      expectTypeOf<ChunkHashedEvent>().toHaveProperty("chunkData");

      expectTypeOf<ChunkHashedEvent["chunkIndex"]>().toBeNumber();
      expectTypeOf<ChunkHashedEvent["hash"]>().toBeString();
      expectTypeOf<ChunkHashedEvent["chunkData"]>().toMatchTypeOf<ArrayBuffer>();
    });

    it("should accept valid ChunkHashedEvent object", () => {
      const validEvent: ChunkHashedEvent = {
        chunkIndex: 0,
        hash: "chunk-hash-1",
        chunkData: new ArrayBuffer(1024),
      };

      expectTypeOf(validEvent).toMatchTypeOf<ChunkHashedEvent>();
    });
  });

  describe("AllChunksHashedEvent", () => {
    it("should be an empty object type", () => {
      const validEvent: AllChunksHashedEvent = {};

      expectTypeOf(validEvent).toMatchTypeOf<AllChunksHashedEvent>();
    });
  });

  describe("FileHashedEvent", () => {
    it("should have required field: fileHash", () => {
      expectTypeOf<FileHashedEvent>().toHaveProperty("fileHash");
      expectTypeOf<FileHashedEvent["fileHash"]>().toBeString();
    });

    it("should accept valid FileHashedEvent object", () => {
      const validEvent: FileHashedEvent = {
        fileHash: "file-hash-abcdef",
      };

      expectTypeOf(validEvent).toMatchTypeOf<FileHashedEvent>();
    });
  });

  describe("QueueDrainedEvent", () => {
    it("should be an empty object type", () => {
      const validEvent: QueueDrainedEvent = {};

      expectTypeOf(validEvent).toMatchTypeOf<QueueDrainedEvent>();
    });
  });

  describe("QueueAbortedEvent", () => {
    it("should have required field: error", () => {
      expectTypeOf<QueueAbortedEvent>().toHaveProperty("error");
      expectTypeOf<QueueAbortedEvent["error"]>().toMatchTypeOf<Error>();
    });

    it("should accept valid QueueAbortedEvent object", () => {
      const validEvent: QueueAbortedEvent = {
        error: new Error("Upload failed"),
      };

      expectTypeOf(validEvent).toMatchTypeOf<QueueAbortedEvent>();
    });
  });

  describe("UploadEvents", () => {
    it("should be a union type of all event types", () => {
      const chunkEvent: UploadEvents = {
        chunkIndex: 0,
        hash: "hash",
        chunkData: new ArrayBuffer(0),
      };
      const allChunksEvent: UploadEvents = {};
      const fileEvent: UploadEvents = { fileHash: "hash" };
      const queueDrainedEvent: UploadEvents = {};
      const queueAbortedEvent: UploadEvents = { error: new Error() };

      expectTypeOf(chunkEvent).toMatchTypeOf<UploadEvents>();
      expectTypeOf(allChunksEvent).toMatchTypeOf<UploadEvents>();
      expectTypeOf(fileEvent).toMatchTypeOf<UploadEvents>();
      expectTypeOf(queueDrainedEvent).toMatchTypeOf<UploadEvents>();
      expectTypeOf(queueAbortedEvent).toMatchTypeOf<UploadEvents>();
    });
  });
});
