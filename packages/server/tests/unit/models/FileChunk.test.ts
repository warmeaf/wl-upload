import type { Collection } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as mongodb from "../../../src/db/mongodb";
import * as FileChunkModel from "../../../src/models/FileChunk";

// Mock MongoDB connection
vi.mock("../../../src/db/mongodb", () => ({
  getFileChunksCollection: vi.fn(),
}));

describe("FileChunk Model", () => {
  let mockCollection: {
    createIndex: ReturnType<typeof vi.fn>;
    insertOne: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCollection = {
      createIndex: vi.fn().mockResolvedValue(undefined),
      insertOne: vi.fn().mockResolvedValue({ insertedId: "test-id" }),
      findOne: vi.fn(),
    };

    (mongodb.getFileChunksCollection as ReturnType<typeof vi.fn>).mockReturnValue(
      mockCollection as unknown as Collection,
    );
  });

  describe("Schema Definition", () => {
    it("should have correct FileChunkDocument type structure", () => {
      const buffer = Buffer.from("test chunk data");
      const doc: FileChunkModel.FileChunkDocument = {
        _id: "test-id",
        hash: "chunk-hash-123",
        chunk: buffer,
        createdAt: new Date(),
      };

      expect(doc.hash).toBe("chunk-hash-123");
      expect(doc.chunk).toBeInstanceOf(Buffer);
      expect(doc.chunk.toString()).toBe("test chunk data");
      expect(doc.createdAt).toBeInstanceOf(Date);
    });

    it("should have correct FileChunkCreateInput type structure", () => {
      const buffer = Buffer.from("chunk data");
      const input: FileChunkModel.FileChunkCreateInput = {
        hash: "chunk-hash-123",
        chunk: buffer,
      };

      expect(input.hash).toBe("chunk-hash-123");
      expect(input.chunk).toBeInstanceOf(Buffer);
    });
  });

  describe("createFileChunkIndexes", () => {
    it("should create hash unique index", async () => {
      await FileChunkModel.createFileChunkIndexes(
        mockCollection as unknown as Collection<FileChunkModel.FileChunkDocument>,
      );

      expect(mockCollection.createIndex).toHaveBeenCalledWith({ hash: 1 }, { unique: true });
    });

    it("should create only one index", async () => {
      await FileChunkModel.createFileChunkIndexes(
        mockCollection as unknown as Collection<FileChunkModel.FileChunkDocument>,
      );

      expect(mockCollection.createIndex).toHaveBeenCalledTimes(1);
    });
  });

  describe("validateFileChunkDocument", () => {
    it("should validate correct document", () => {
      const buffer = Buffer.from("test chunk data");
      const doc: FileChunkModel.FileChunkDocument = {
        _id: "test-id",
        hash: "chunk-hash-123",
        chunk: buffer,
        createdAt: new Date(),
      };

      expect(() => FileChunkModel.validateFileChunkDocument(doc)).not.toThrow();
    });

    it("should throw error for missing hash", () => {
      const buffer = Buffer.from("test chunk data");
      const doc = {
        hash: "",
        chunk: buffer,
        createdAt: new Date(),
      } as FileChunkModel.FileChunkDocument;

      expect(() => FileChunkModel.validateFileChunkDocument(doc)).toThrow();
    });

    it("should throw error for invalid hash type", () => {
      const buffer = Buffer.from("test chunk data");
      const doc = {
        hash: 123, // Invalid type
        chunk: buffer,
        createdAt: new Date(),
      } as unknown as FileChunkModel.FileChunkDocument;

      expect(() => FileChunkModel.validateFileChunkDocument(doc)).toThrow();
    });

    it("should throw error for missing chunk", () => {
      const doc = {
        hash: "chunk-hash-123",
        chunk: null,
        createdAt: new Date(),
      } as unknown as FileChunkModel.FileChunkDocument;

      expect(() => FileChunkModel.validateFileChunkDocument(doc)).toThrow();
    });

    it("should throw error for invalid chunk type", () => {
      const doc = {
        hash: "chunk-hash-123",
        chunk: "not a buffer", // Invalid type
        createdAt: new Date(),
      } as unknown as FileChunkModel.FileChunkDocument;

      expect(() => FileChunkModel.validateFileChunkDocument(doc)).toThrow();
    });

    it("should throw error for invalid createdAt", () => {
      const buffer = Buffer.from("test chunk data");
      const doc = {
        hash: "chunk-hash-123",
        chunk: buffer,
        createdAt: "not a date", // Invalid type
      } as unknown as FileChunkModel.FileChunkDocument;

      expect(() => FileChunkModel.validateFileChunkDocument(doc)).toThrow();
    });
  });

  describe("Buffer Storage", () => {
    it("should store Buffer data correctly", () => {
      const buffer = Buffer.from("test chunk data", "utf-8");
      const doc: FileChunkModel.FileChunkDocument = {
        _id: "test-id",
        hash: "chunk-hash-123",
        chunk: buffer,
        createdAt: new Date(),
      };

      expect(Buffer.isBuffer(doc.chunk)).toBe(true);
      expect(doc.chunk.toString("utf-8")).toBe("test chunk data");
    });

    it("should handle empty Buffer", () => {
      const buffer = Buffer.alloc(0);
      const doc: FileChunkModel.FileChunkDocument = {
        _id: "test-id",
        hash: "chunk-hash-123",
        chunk: buffer,
        createdAt: new Date(),
      };

      expect(Buffer.isBuffer(doc.chunk)).toBe(true);
      expect(doc.chunk.length).toBe(0);
    });

    it("should handle large Buffer", () => {
      const buffer = Buffer.alloc(1024 * 1024); // 1MB
      buffer.fill(0x42);
      const doc: FileChunkModel.FileChunkDocument = {
        _id: "test-id",
        hash: "chunk-hash-123",
        chunk: buffer,
        createdAt: new Date(),
      };

      expect(Buffer.isBuffer(doc.chunk)).toBe(true);
      expect(doc.chunk.length).toBe(1024 * 1024);
    });
  });

  describe("Document Operations", () => {
    it("should create document with correct structure", () => {
      const buffer = Buffer.from("chunk data");
      const now = new Date();
      const input: FileChunkModel.FileChunkCreateInput = {
        hash: "chunk-hash-123",
        chunk: buffer,
      };

      const doc = FileChunkModel.createFileChunkDocument(input, now);

      expect(doc.hash).toBe("chunk-hash-123");
      expect(doc.chunk).toBe(buffer);
      expect(doc.createdAt).toBe(now);
    });
  });
});
