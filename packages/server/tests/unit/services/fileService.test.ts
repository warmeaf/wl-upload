import type { ChunkInfo } from "@wl-upload/shared";
import type { Collection } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as mongodb from "../../../src/db/mongodb";
import * as FileModel from "../../../src/models/File";
import * as FileService from "../../../src/services/fileService";

// Mock MongoDB connection
vi.mock("../../../src/db/mongodb", () => ({
  getFilesCollection: vi.fn(),
}));

// Mock File model
vi.mock("../../../src/models/File", () => ({
  createFileDocument: vi.fn(),
  updateFileDocument: vi.fn(),
  validateFileDocument: vi.fn(),
}));

// Mock ChunkService
vi.mock("../../../src/services/chunkService", () => ({
  chunkExists: vi.fn(),
}));

describe("FileService", () => {
  let mockCollection: {
    insertOne: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    updateOne: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCollection = {
      insertOne: vi.fn(),
      findOne: vi.fn(),
      updateOne: vi.fn(),
    };

    (mongodb.getFilesCollection as ReturnType<typeof vi.fn>).mockReturnValue(
      mockCollection as unknown as Collection,
    );
  });

  describe("createFileSession", () => {
    it("should create a new file session successfully", async () => {
      const input = {
        fileName: "test.zip",
        fileType: "zip",
        fileSize: 1024,
        chunksLength: 5,
      };

      const mockDoc = {
        token: "test-token-123",
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        chunksLength: input.chunksLength,
        fileHash: "",
        chunks: [],
        url: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (FileModel.createFileDocument as ReturnType<typeof vi.fn>).mockReturnValue(mockDoc);
      mockCollection.insertOne.mockResolvedValue({
        insertedId: "test-id",
        acknowledged: true,
      });

      const result = await FileService.createFileSession(input);

      expect(result.token).toBeTruthy();
      expect(typeof result.token).toBe("string");
      expect(result.token.length).toBeGreaterThan(0);
      expect(mockCollection.insertOne).toHaveBeenCalled();
    });

    it("should throw error for duplicate token", async () => {
      const input = {
        fileName: "test.zip",
        fileType: "zip",
        fileSize: 1024,
        chunksLength: 5,
      };

      const duplicateError = new Error("E11000 duplicate key error");
      (duplicateError as unknown as { code: number }).code = 11000;
      mockCollection.insertOne.mockRejectedValue(duplicateError);

      await expect(FileService.createFileSession(input)).rejects.toThrow();
    });

    it("should throw error for other database errors", async () => {
      const input = {
        fileName: "test.zip",
        fileType: "zip",
        fileSize: 1024,
        chunksLength: 5,
      };

      mockCollection.insertOne.mockRejectedValue(new Error("Database error"));

      await expect(FileService.createFileSession(input)).rejects.toThrow("Database error");
    });
  });

  describe("fileExistsByHash", () => {
    it("should return true if file exists by hash", async () => {
      const fileHash = "file-hash-123";

      mockCollection.findOne.mockResolvedValue({
        _id: "test-id",
        token: "token-123",
        fileName: "test.zip",
        fileType: "zip",
        fileSize: 1024,
        chunksLength: 5,
        fileHash,
        chunks: [],
        url: "test_file-hash-123.zip",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await FileService.fileExistsByHash(fileHash);

      expect(result).toBe(true);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ fileHash });
    });

    it("should return false if file does not exist", async () => {
      const fileHash = "file-hash-123";

      mockCollection.findOne.mockResolvedValue(null);

      const result = await FileService.fileExistsByHash(fileHash);

      expect(result).toBe(false);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ fileHash });
    });

    it("should handle database errors", async () => {
      const fileHash = "file-hash-123";

      mockCollection.findOne.mockRejectedValue(new Error("Database error"));

      await expect(FileService.fileExistsByHash(fileHash)).rejects.toThrow("Database error");
    });
  });

  describe("getFileByToken", () => {
    it("should retrieve file by token", async () => {
      const token = "test-token-123";
      const mockDoc = {
        _id: "test-id",
        token,
        fileName: "test.zip",
        fileType: "zip",
        fileSize: 1024,
        chunksLength: 5,
        fileHash: "",
        chunks: [],
        url: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCollection.findOne.mockResolvedValue(mockDoc);
      (FileModel.validateFileDocument as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      const result = await FileService.getFileByToken(token);

      expect(result).toBeDefined();
      expect(result?.token).toBe(token);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ token });
    });

    it("should return null if file does not exist", async () => {
      const token = "test-token-123";

      mockCollection.findOne.mockResolvedValue(null);

      const result = await FileService.getFileByToken(token);

      expect(result).toBeNull();
    });
  });

  describe("generateFileUrl", () => {
    it("should generate correct URL format", () => {
      const fileName = "example.zip";
      const fileHash = "abcdef1234567890abcdef1234567890";

      const url = FileService.generateFileUrl(fileName, fileHash);

      expect(url).toBe("example_abcdef1234567890abcdef1234567890.zip");
    });

    it("should handle file without extension", () => {
      const fileName = "example";
      const fileHash = "abcdef1234567890abcdef1234567890";

      const url = FileService.generateFileUrl(fileName, fileHash);

      expect(url).toBe("example_abcdef1234567890abcdef1234567890");
    });

    it("should handle file with multiple dots", () => {
      const fileName = "example.tar.gz";
      const fileHash = "abcdef1234567890abcdef1234567890";

      const url = FileService.generateFileUrl(fileName, fileHash);

      // Should use the last extension
      expect(url).toBe("example.tar_abcdef1234567890abcdef1234567890.gz");
    });

    it("should handle file with path separators", () => {
      const fileName = "path/to/example.zip";
      const fileHash = "abcdef1234567890abcdef1234567890";

      const url = FileService.generateFileUrl(fileName, fileHash);

      // Should only use the filename part
      expect(url).toBe("example_abcdef1234567890abcdef1234567890.zip");
    });
  });

  describe("mergeFile", () => {
    const token = "test-token-123";
    const fileHash = "file-hash-123";
    const fileName = "test.zip";
    const chunksLength = 3;
    const chunks: ChunkInfo[] = [
      { index: 0, hash: "chunk-hash-0" },
      { index: 1, hash: "chunk-hash-1" },
      { index: 2, hash: "chunk-hash-2" },
    ];

    it("should merge file successfully", async () => {
      const mockDoc = {
        _id: "test-id",
        token,
        fileName,
        fileType: "zip",
        fileSize: 1024,
        chunksLength,
        fileHash: "",
        chunks: [],
        url: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedDoc = {
        ...mockDoc,
        fileHash,
        chunks,
        url: "test_file-hash-123.zip",
        updatedAt: new Date(),
      };

      mockCollection.findOne.mockResolvedValue(mockDoc);
      mockCollection.updateOne.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
      });

      (FileModel.updateFileDocument as ReturnType<typeof vi.fn>).mockReturnValue(updatedDoc);
      (FileModel.validateFileDocument as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      const result = await FileService.mergeFile(token, fileHash, fileName, chunksLength, chunks);

      expect(result.url).toBe("test_file-hash-123.zip");
      expect(mockCollection.findOne).toHaveBeenCalledWith({ token });
      expect(mockCollection.updateOne).toHaveBeenCalled();
      expect(FileModel.updateFileDocument).toHaveBeenCalled();
    });

    it("should throw error if file session does not exist", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      await expect(
        FileService.mergeFile(token, fileHash, fileName, chunksLength, chunks),
      ).rejects.toThrow("File session not found");
    });

    it("should throw error if chunk count does not match", async () => {
      const mockDoc = {
        _id: "test-id",
        token,
        fileName,
        fileType: "zip",
        fileSize: 1024,
        chunksLength: 5, // Different from chunks.length
        fileHash: "",
        chunks: [],
        url: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCollection.findOne.mockResolvedValue(mockDoc);

      await expect(
        FileService.mergeFile(token, fileHash, fileName, chunksLength, chunks),
      ).rejects.toThrow("Chunk count mismatch");
    });

    it("should throw error if chunks are not in order", async () => {
      const outOfOrderChunks: ChunkInfo[] = [
        { index: 1, hash: "chunk-hash-1" },
        { index: 0, hash: "chunk-hash-0" },
        { index: 2, hash: "chunk-hash-2" },
      ];

      const mockDoc = {
        _id: "test-id",
        token,
        fileName,
        fileType: "zip",
        fileSize: 1024,
        chunksLength,
        fileHash: "",
        chunks: [],
        url: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCollection.findOne.mockResolvedValue(mockDoc);

      await expect(
        FileService.mergeFile(token, fileHash, fileName, chunksLength, outOfOrderChunks),
      ).rejects.toThrow("Chunks must be in order");
    });

    it("should throw error if chunks have missing indices", async () => {
      const incompleteChunks: ChunkInfo[] = [
        { index: 0, hash: "chunk-hash-0" },
        { index: 2, hash: "chunk-hash-2" },
        { index: 3, hash: "chunk-hash-3" },
        // Missing index 1, but has index 3 which is out of order
      ];

      const mockDoc = {
        _id: "test-id",
        token,
        fileName,
        fileType: "zip",
        fileSize: 1024,
        chunksLength,
        fileHash: "",
        chunks: [],
        url: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCollection.findOne.mockResolvedValue(mockDoc);

      await expect(
        FileService.mergeFile(token, fileHash, fileName, chunksLength, incompleteChunks),
      ).rejects.toThrow("Chunks must be in order");
    });

    it("should generate correct URL during merge", async () => {
      const mockDoc = {
        _id: "test-id",
        token,
        fileName,
        fileType: "zip",
        fileSize: 1024,
        chunksLength,
        fileHash: "",
        chunks: [],
        url: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedUrl = FileService.generateFileUrl(fileName, fileHash);
      const updatedDoc = {
        ...mockDoc,
        fileHash,
        chunks,
        url: expectedUrl,
        updatedAt: new Date(),
      };

      mockCollection.findOne.mockResolvedValue(mockDoc);
      mockCollection.updateOne.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
      });

      (FileModel.updateFileDocument as ReturnType<typeof vi.fn>).mockReturnValue(updatedDoc);

      const result = await FileService.mergeFile(token, fileHash, fileName, chunksLength, chunks);

      expect(result.url).toBe(expectedUrl);
    });

    it("should handle database update errors", async () => {
      const mockDoc = {
        _id: "test-id",
        token,
        fileName,
        fileType: "zip",
        fileSize: 1024,
        chunksLength,
        fileHash: "",
        chunks: [],
        url: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCollection.findOne.mockResolvedValue(mockDoc);
      mockCollection.updateOne.mockRejectedValue(new Error("Update failed"));

      await expect(
        FileService.mergeFile(token, fileHash, fileName, chunksLength, chunks),
      ).rejects.toThrow("Update failed");
    });
  });
});
