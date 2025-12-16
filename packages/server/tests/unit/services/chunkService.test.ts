import type { Collection } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as mongodb from "../../../src/db/mongodb";
import * as FileChunkModel from "../../../src/models/FileChunk";
import * as ChunkService from "../../../src/services/chunkService";

// Mock MongoDB connection
vi.mock("../../../src/db/mongodb", () => ({
  getFileChunksCollection: vi.fn(),
}));

// Mock FileChunk model
vi.mock("../../../src/models/FileChunk", () => ({
  createFileChunkDocument: vi.fn(),
  validateFileChunkDocument: vi.fn(),
}));

describe("ChunkService", () => {
  let mockCollection: {
    insertOne: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCollection = {
      insertOne: vi.fn(),
      findOne: vi.fn(),
    };

    (mongodb.getFileChunksCollection as ReturnType<typeof vi.fn>).mockReturnValue(
      mockCollection as unknown as Collection,
    );
  });

  describe("storeChunk", () => {
    it("should store a new chunk successfully", async () => {
      const hash = "chunk-hash-123";
      const chunkData = Buffer.from("test chunk data");

      mockCollection.findOne.mockResolvedValue(null); // Chunk doesn't exist
      mockCollection.insertOne.mockResolvedValue({
        insertedId: "test-id",
        acknowledged: true,
      });

      (FileChunkModel.createFileChunkDocument as ReturnType<typeof vi.fn>).mockReturnValue({
        hash,
        chunk: chunkData,
        createdAt: new Date(),
      });

      const result = await ChunkService.storeChunk(hash, chunkData);

      expect(result).toBe(true);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ hash });
      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(FileChunkModel.createFileChunkDocument).toHaveBeenCalledWith({
        hash,
        chunk: chunkData,
      });
    });

    it("should skip storing duplicate chunk (same hash)", async () => {
      const hash = "chunk-hash-123";
      const chunkData = Buffer.from("test chunk data");

      // Chunk already exists
      mockCollection.findOne.mockResolvedValue({
        _id: "existing-id",
        hash,
        chunk: chunkData,
        createdAt: new Date(),
      });

      const result = await ChunkService.storeChunk(hash, chunkData);

      expect(result).toBe(true);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ hash });
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    it("should handle unique index violation as duplicate", async () => {
      const hash = "chunk-hash-123";
      const chunkData = Buffer.from("test chunk data");

      mockCollection.findOne.mockResolvedValue(null);

      // Simulate unique index violation (E11000 error)
      const duplicateError = new Error("E11000 duplicate key error");
      (duplicateError as unknown as { code: number }).code = 11000;
      mockCollection.insertOne.mockRejectedValue(duplicateError);

      const result = await ChunkService.storeChunk(hash, chunkData);

      expect(result).toBe(true); // Should treat as success (chunk already exists)
      expect(mockCollection.findOne).toHaveBeenCalledWith({ hash });
      expect(mockCollection.insertOne).toHaveBeenCalled();
    });

    it("should throw error for other database errors", async () => {
      const hash = "chunk-hash-123";
      const chunkData = Buffer.from("test chunk data");

      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockRejectedValue(new Error("Database connection error"));

      await expect(ChunkService.storeChunk(hash, chunkData)).rejects.toThrow(
        "Database connection error",
      );
    });

    it("should validate chunk data before storing", async () => {
      const hash = "chunk-hash-123";
      const chunkData = Buffer.from("test chunk data");

      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({
        insertedId: "test-id",
        acknowledged: true,
      });

      (FileChunkModel.createFileChunkDocument as ReturnType<typeof vi.fn>).mockReturnValue({
        hash,
        chunk: chunkData,
        createdAt: new Date(),
      });

      await ChunkService.storeChunk(hash, chunkData);

      expect(FileChunkModel.createFileChunkDocument).toHaveBeenCalledWith({
        hash,
        chunk: chunkData,
      });
    });
  });

  describe("chunkExists", () => {
    it("should return true if chunk exists", async () => {
      const hash = "chunk-hash-123";

      mockCollection.findOne.mockResolvedValue({
        _id: "test-id",
        hash,
        chunk: Buffer.from("data"),
        createdAt: new Date(),
      });

      const result = await ChunkService.chunkExists(hash);

      expect(result).toBe(true);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ hash });
    });

    it("should return false if chunk does not exist", async () => {
      const hash = "chunk-hash-123";

      mockCollection.findOne.mockResolvedValue(null);

      const result = await ChunkService.chunkExists(hash);

      expect(result).toBe(false);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ hash });
    });

    it("should handle database errors", async () => {
      const hash = "chunk-hash-123";

      mockCollection.findOne.mockRejectedValue(new Error("Database error"));

      await expect(ChunkService.chunkExists(hash)).rejects.toThrow("Database error");
    });
  });

  describe("getChunk", () => {
    it("should retrieve chunk data by hash", async () => {
      const hash = "chunk-hash-123";
      const chunkData = Buffer.from("test chunk data");

      mockCollection.findOne.mockResolvedValue({
        _id: "test-id",
        hash,
        chunk: chunkData,
        createdAt: new Date(),
      });

      const result = await ChunkService.getChunk(hash);

      expect(result).toBeDefined();
      expect(result?.hash).toBe(hash);
      expect(Buffer.isBuffer(result?.chunk)).toBe(true);
      expect(result?.chunk.toString()).toBe("test chunk data");
      expect(mockCollection.findOne).toHaveBeenCalledWith({ hash });
    });

    it("should return null if chunk does not exist", async () => {
      const hash = "chunk-hash-123";

      mockCollection.findOne.mockResolvedValue(null);

      const result = await ChunkService.getChunk(hash);

      expect(result).toBeNull();
      expect(mockCollection.findOne).toHaveBeenCalledWith({ hash });
    });

    it("should handle database errors", async () => {
      const hash = "chunk-hash-123";

      mockCollection.findOne.mockRejectedValue(new Error("Database error"));

      await expect(ChunkService.getChunk(hash)).rejects.toThrow("Database error");
    });

    it("should validate retrieved chunk document", async () => {
      const hash = "chunk-hash-123";
      const chunkData = Buffer.from("test chunk data");

      const mockDoc = {
        _id: "test-id",
        hash,
        chunk: chunkData,
        createdAt: new Date(),
      };

      mockCollection.findOne.mockResolvedValue(mockDoc);
      (FileChunkModel.validateFileChunkDocument as ReturnType<typeof vi.fn>).mockReturnValue(
        undefined,
      );

      const result = await ChunkService.getChunk(hash);

      expect(result).toBeDefined();
      expect(FileChunkModel.validateFileChunkDocument).toHaveBeenCalledWith(mockDoc);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty hash", async () => {
      const hash = "";
      const chunkData = Buffer.from("test");

      mockCollection.findOne.mockResolvedValue(null);

      await expect(ChunkService.storeChunk(hash, chunkData)).rejects.toThrow();
    });

    it("should handle empty chunk data", async () => {
      const hash = "chunk-hash-123";
      const chunkData = Buffer.alloc(0);

      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({
        insertedId: "test-id",
        acknowledged: true,
      });

      (FileChunkModel.createFileChunkDocument as ReturnType<typeof vi.fn>).mockReturnValue({
        hash,
        chunk: chunkData,
        createdAt: new Date(),
      });

      const result = await ChunkService.storeChunk(hash, chunkData);

      expect(result).toBe(true);
    });

    it("should handle very large chunk data", async () => {
      const hash = "chunk-hash-123";
      const chunkData = Buffer.alloc(10 * 1024 * 1024); // 10MB

      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({
        insertedId: "test-id",
        acknowledged: true,
      });

      (FileChunkModel.createFileChunkDocument as ReturnType<typeof vi.fn>).mockReturnValue({
        hash,
        chunk: chunkData,
        createdAt: new Date(),
      });

      const result = await ChunkService.storeChunk(hash, chunkData);

      expect(result).toBe(true);
      expect(mockCollection.insertOne).toHaveBeenCalled();
    });
  });
});
