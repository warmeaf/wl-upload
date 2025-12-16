import type { Collection } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as mongodb from "../../../src/db/mongodb";
import * as FileModel from "../../../src/models/File";

// Mock MongoDB connection
vi.mock("../../../src/db/mongodb", () => ({
  getFilesCollection: vi.fn(),
}));

describe("File Model", () => {
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

    (mongodb.getFilesCollection as ReturnType<typeof vi.fn>).mockReturnValue(
      mockCollection as unknown as Collection,
    );
  });

  describe("Schema Definition", () => {
    it("should have correct FileDocument type structure", () => {
      const doc: FileModel.FileDocument = {
        _id: "test-id",
        token: "test-token",
        fileName: "test.txt",
        fileType: "text/plain",
        fileSize: 1024,
        chunksLength: 5,
        fileHash: "",
        chunks: [],
        url: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(doc.token).toBe("test-token");
      expect(doc.fileName).toBe("test.txt");
      expect(doc.fileType).toBe("text/plain");
      expect(doc.fileSize).toBe(1024);
      expect(doc.chunksLength).toBe(5);
      expect(doc.fileHash).toBe("");
      expect(doc.chunks).toEqual([]);
      expect(doc.url).toBe("");
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });

    it("should have correct FileCreateInput type structure", () => {
      const input: FileModel.FileCreateInput = {
        token: "test-token",
        fileName: "test.txt",
        fileType: "text/plain",
        fileSize: 1024,
        chunksLength: 5,
      };

      expect(input.token).toBe("test-token");
      expect(input.fileName).toBe("test.txt");
      expect(input.fileType).toBe("text/plain");
      expect(input.fileSize).toBe(1024);
      expect(input.chunksLength).toBe(5);
    });

    it("should have correct FileUpdateInput type structure", () => {
      const input: FileModel.FileUpdateInput = {
        fileHash: "abc123",
        chunks: [{ index: 0, hash: "chunk-hash" }],
        url: "https://example.com/file.txt",
      };

      expect(input.fileHash).toBe("abc123");
      expect(input.chunks).toEqual([{ index: 0, hash: "chunk-hash" }]);
      expect(input.url).toBe("https://example.com/file.txt");
    });
  });

  describe("createFileIndexes", () => {
    it("should create token unique index", async () => {
      await FileModel.createFileIndexes(
        mockCollection as unknown as Collection<FileModel.FileDocument>,
      );

      expect(mockCollection.createIndex).toHaveBeenCalledWith({ token: 1 }, { unique: true });
    });

    it("should create fileHash index", async () => {
      await FileModel.createFileIndexes(
        mockCollection as unknown as Collection<FileModel.FileDocument>,
      );

      expect(mockCollection.createIndex).toHaveBeenCalledWith({ fileHash: 1 });
    });

    it("should create all indexes", async () => {
      await FileModel.createFileIndexes(
        mockCollection as unknown as Collection<FileModel.FileDocument>,
      );

      expect(mockCollection.createIndex).toHaveBeenCalledTimes(2);
    });
  });

  describe("validateFileDocument", () => {
    it("should validate correct document", () => {
      const doc: FileModel.FileDocument = {
        _id: "test-id",
        token: "test-token",
        fileName: "test.txt",
        fileType: "text/plain",
        fileSize: 1024,
        chunksLength: 5,
        fileHash: "",
        chunks: [],
        url: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => FileModel.validateFileDocument(doc)).not.toThrow();
    });

    it("should validate document with chunks", () => {
      const doc: FileModel.FileDocument = {
        _id: "test-id",
        token: "test-token",
        fileName: "test.txt",
        fileType: "text/plain",
        fileSize: 1024,
        chunksLength: 2,
        fileHash: "file-hash",
        chunks: [
          { index: 0, hash: "chunk-hash-0" },
          { index: 1, hash: "chunk-hash-1" },
        ],
        url: "https://example.com/file.txt",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => FileModel.validateFileDocument(doc)).not.toThrow();
    });

    it("should throw error for missing required fields", () => {
      const doc = {
        token: "test-token",
        // Missing other required fields
      } as unknown as FileModel.FileDocument;

      expect(() => FileModel.validateFileDocument(doc)).toThrow();
    });

    it("should throw error for invalid chunks structure", () => {
      const doc: FileModel.FileDocument = {
        _id: "test-id",
        token: "test-token",
        fileName: "test.txt",
        fileType: "text/plain",
        fileSize: 1024,
        chunksLength: 1,
        fileHash: "",
        chunks: [{ index: 0 } as { index: number; hash: string }], // Missing hash
        url: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => FileModel.validateFileDocument(doc)).toThrow();
    });

    it("should throw error for invalid fileSize", () => {
      const doc: FileModel.FileDocument = {
        _id: "test-id",
        token: "test-token",
        fileName: "test.txt",
        fileType: "text/plain",
        fileSize: -1, // Invalid
        chunksLength: 1,
        fileHash: "",
        chunks: [],
        url: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => FileModel.validateFileDocument(doc)).toThrow();
    });

    it("should throw error for invalid chunksLength", () => {
      const doc: FileModel.FileDocument = {
        _id: "test-id",
        token: "test-token",
        fileName: "test.txt",
        fileType: "text/plain",
        fileSize: 1024,
        chunksLength: 0, // Invalid
        fileHash: "",
        chunks: [],
        url: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => FileModel.validateFileDocument(doc)).toThrow();
    });
  });

  describe("Document Operations", () => {
    it("should create document with default values", () => {
      const input: FileModel.FileCreateInput = {
        token: "test-token",
        fileName: "test.txt",
        fileType: "text/plain",
        fileSize: 1024,
        chunksLength: 5,
      };

      const now = new Date();
      const doc = FileModel.createFileDocument(input, now);

      expect(doc.token).toBe("test-token");
      expect(doc.fileName).toBe("test.txt");
      expect(doc.fileType).toBe("text/plain");
      expect(doc.fileSize).toBe(1024);
      expect(doc.chunksLength).toBe(5);
      expect(doc.fileHash).toBe("");
      expect(doc.chunks).toEqual([]);
      expect(doc.url).toBe("");
      expect(doc.createdAt).toBe(now);
      expect(doc.updatedAt).toBe(now);
    });

    describe("updateFileDocument", () => {
      let baseDoc: FileModel.FileDocument;

      beforeEach(() => {
        baseDoc = {
          _id: "test-id",
          token: "test-token",
          fileName: "test.txt",
          fileType: "text/plain",
          fileSize: 1024,
          chunksLength: 5,
          fileHash: "",
          chunks: [],
          url: "",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        };
      });

      it("should update fileHash", () => {
        const updateInput: FileModel.FileUpdateInput = {
          fileHash: "new-file-hash",
        };

        const now = new Date("2024-01-02");
        const updated = FileModel.updateFileDocument(baseDoc, updateInput, now);

        expect(updated.fileHash).toBe("new-file-hash");
        expect(updated.chunks).toEqual([]);
        expect(updated.url).toBe("");
        expect(updated.updatedAt).toBe(now);
        expect(updated.createdAt).toBe(baseDoc.createdAt);
      });

      it("should update chunks", () => {
        const newChunks: FileModel.ChunkInfo[] = [
          { index: 0, hash: "chunk-hash-0" },
          { index: 1, hash: "chunk-hash-1" },
        ];
        const updateInput: FileModel.FileUpdateInput = {
          chunks: newChunks,
        };

        const now = new Date("2024-01-02");
        const updated = FileModel.updateFileDocument(baseDoc, updateInput, now);

        expect(updated.chunks).toEqual(newChunks);
        expect(updated.fileHash).toBe("");
        expect(updated.url).toBe("");
        expect(updated.updatedAt).toBe(now);
      });

      it("should update url", () => {
        const updateInput: FileModel.FileUpdateInput = {
          url: "https://example.com/file.txt",
        };

        const now = new Date("2024-01-02");
        const updated = FileModel.updateFileDocument(baseDoc, updateInput, now);

        expect(updated.url).toBe("https://example.com/file.txt");
        expect(updated.fileHash).toBe("");
        expect(updated.chunks).toEqual([]);
        expect(updated.updatedAt).toBe(now);
      });

      it("should update multiple fields at once", () => {
        const newChunks: FileModel.ChunkInfo[] = [{ index: 0, hash: "chunk-hash-0" }];
        const updateInput: FileModel.FileUpdateInput = {
          fileHash: "new-file-hash",
          chunks: newChunks,
          url: "https://example.com/file.txt",
        };

        const now = new Date("2024-01-02");
        const updated = FileModel.updateFileDocument(baseDoc, updateInput, now);

        expect(updated.fileHash).toBe("new-file-hash");
        expect(updated.chunks).toEqual(newChunks);
        expect(updated.url).toBe("https://example.com/file.txt");
        expect(updated.updatedAt).toBe(now);
      });

      it("should automatically update updatedAt", () => {
        const updateInput: FileModel.FileUpdateInput = {
          fileHash: "new-hash",
        };

        const now = new Date("2024-01-02");
        const updated = FileModel.updateFileDocument(baseDoc, updateInput, now);

        expect(updated.updatedAt).toBe(now);
        expect(updated.updatedAt).not.toBe(baseDoc.updatedAt);
      });

      it("should not modify original document", () => {
        const updateInput: FileModel.FileUpdateInput = {
          fileHash: "new-hash",
        };

        const originalUpdatedAt = baseDoc.updatedAt;
        FileModel.updateFileDocument(baseDoc, updateInput);

        expect(baseDoc.fileHash).toBe("");
        expect(baseDoc.updatedAt).toBe(originalUpdatedAt);
      });

      it("should throw error for invalid chunks array", () => {
        const updateInput: FileModel.FileUpdateInput = {
          chunks: "not-an-array" as unknown as FileModel.ChunkInfo[],
        };

        expect(() => FileModel.updateFileDocument(baseDoc, updateInput)).toThrow(
          "Invalid chunks field: must be an array",
        );
      });

      it("should throw error for invalid chunk structure", () => {
        const updateInput: FileModel.FileUpdateInput = {
          chunks: [{ index: 0 } as FileModel.ChunkInfo], // Missing hash
        };

        expect(() => FileModel.updateFileDocument(baseDoc, updateInput)).toThrow(
          "Invalid chunk structure",
        );
      });

      it("should throw error for invalid chunk hash", () => {
        const updateInput: FileModel.FileUpdateInput = {
          chunks: [{ index: 0, hash: "" }], // Empty hash
        };

        expect(() => FileModel.updateFileDocument(baseDoc, updateInput)).toThrow(
          "Invalid chunk structure",
        );
      });

      it("should throw error for invalid url type", () => {
        const updateInput: FileModel.FileUpdateInput = {
          url: 123 as unknown as string,
        };

        expect(() => FileModel.updateFileDocument(baseDoc, updateInput)).toThrow(
          "Invalid url field: must be a string",
        );
      });

      it("should preserve other fields when updating", () => {
        const updateInput: FileModel.FileUpdateInput = {
          fileHash: "new-hash",
        };

        const updated = FileModel.updateFileDocument(baseDoc, updateInput);

        expect(updated.token).toBe(baseDoc.token);
        expect(updated.fileName).toBe(baseDoc.fileName);
        expect(updated.fileType).toBe(baseDoc.fileType);
        expect(updated.fileSize).toBe(baseDoc.fileSize);
        expect(updated.chunksLength).toBe(baseDoc.chunksLength);
        expect(updated.createdAt).toBe(baseDoc.createdAt);
      });
    });
  });
});
