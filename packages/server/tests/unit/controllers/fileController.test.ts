import { ErrorCodes } from "@wl-upload/shared";
import type { Context } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as ChunkService from "../../../src/services/chunkService";
import * as FileService from "../../../src/services/fileService";

// Mock services
vi.mock("../../../src/services/fileService", () => ({
  createFileSession: vi.fn(),
  fileExistsByHash: vi.fn(),
  getFileByToken: vi.fn(),
  mergeFile: vi.fn(),
}));

vi.mock("../../../src/services/chunkService", () => ({
  chunkExists: vi.fn(),
  storeChunk: vi.fn(),
}));

describe("FileController", () => {
  let mockContext: Partial<Context>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      json: vi.fn().mockReturnValue(new Response()),
      text: vi.fn().mockReturnValue(new Response()),
    };
  });

  describe("createFile", () => {
    it("should create file session successfully", async () => {
      const { createFile } = await import("../../../src/controllers/fileController");

      const mockRequest = {
        fileName: "test.zip",
        fileType: "zip",
        fileSize: 1024,
        chunksLength: 5,
      };

      (FileService.createFileSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: "test-token-123",
      });

      const ctx = {
        ...mockContext,
        req: {
          json: vi.fn().mockResolvedValue(mockRequest),
        } as unknown as Context["req"],
      } as Context;

      await createFile(ctx);

      expect(FileService.createFileSession).toHaveBeenCalledWith(mockRequest);
      expect(ctx.json).toHaveBeenCalledWith({
        code: ErrorCodes.SUCCESS,
        token: "test-token-123",
      });
    });

    it("should return error for invalid request body", async () => {
      const { createFile } = await import("../../../src/controllers/fileController");

      const ctx = {
        ...mockContext,
        req: {
          json: vi.fn().mockResolvedValue({}),
        } as unknown as Context["req"],
      } as Context;

      await createFile(ctx);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 400,
        }),
        400,
      );
    });

    it("should handle service errors", async () => {
      const { createFile } = await import("../../../src/controllers/fileController");

      const mockRequest = {
        fileName: "test.zip",
        fileType: "zip",
        fileSize: 1024,
        chunksLength: 5,
      };

      (FileService.createFileSession as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error"),
      );

      const ctx = {
        ...mockContext,
        req: {
          json: vi.fn().mockResolvedValue(mockRequest),
        } as unknown as Context["req"],
      } as Context;

      await createFile(ctx);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 500,
        }),
        500,
      );
    });
  });

  describe("patchHash", () => {
    it("should check chunk hash exists", async () => {
      const { patchHash } = await import("../../../src/controllers/fileController");

      const mockRequest = {
        token: "test-token",
        hash: "chunk-hash-123",
        isChunk: true,
      };

      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: "test-token",
      } as unknown as Awaited<ReturnType<typeof FileService.getFileByToken>>);

      (ChunkService.chunkExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const ctx = {
        ...mockContext,
        req: {
          json: vi.fn().mockResolvedValue(mockRequest),
        } as unknown as Context["req"],
      } as Context;

      await patchHash(ctx);

      expect(FileService.getFileByToken).toHaveBeenCalledWith("test-token");
      expect(ChunkService.chunkExists).toHaveBeenCalledWith("chunk-hash-123");
      expect(ctx.json).toHaveBeenCalledWith({
        code: ErrorCodes.SUCCESS,
        exists: true,
      });
    });

    it("should check file hash exists", async () => {
      const { patchHash } = await import("../../../src/controllers/fileController");

      const mockRequest = {
        token: "test-token",
        hash: "file-hash-123",
        isChunk: false,
      };

      (FileService.fileExistsByHash as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const ctx = {
        ...mockContext,
        req: {
          json: vi.fn().mockResolvedValue(mockRequest),
        } as unknown as Context["req"],
      } as Context;

      await patchHash(ctx);

      expect(FileService.fileExistsByHash).toHaveBeenCalledWith("file-hash-123");
      expect(ctx.json).toHaveBeenCalledWith({
        code: ErrorCodes.SUCCESS,
        exists: true,
      });
    });

    it("should return error for invalid token", async () => {
      const { patchHash } = await import("../../../src/controllers/fileController");

      const mockRequest = {
        token: "invalid-token",
        hash: "hash-123",
        isChunk: true,
      };

      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const ctx = {
        ...mockContext,
        req: {
          json: vi.fn().mockResolvedValue(mockRequest),
        } as unknown as Context["req"],
      } as Context;

      await patchHash(ctx);

      expect(ctx.json).toHaveBeenCalledWith(
        {
          code: ErrorCodes.INVALID_TOKEN,
          message: "Invalid token",
        },
        401,
      );
    });
  });

  describe("uploadChunk", () => {
    it("should upload chunk successfully", async () => {
      const { uploadChunk } = await import("../../../src/controllers/fileController");

      const mockFile = new File(["chunk data"], "chunk.bin");
      const mockFormData = new FormData();
      mockFormData.append("token", "test-token");
      mockFormData.append("chunk", mockFile);
      mockFormData.append("hash", "chunk-hash-123");

      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: "test-token",
      } as unknown as Awaited<ReturnType<typeof FileService.getFileByToken>>);

      (ChunkService.storeChunk as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const ctx = {
        ...mockContext,
        req: {
          formData: vi.fn().mockResolvedValue(mockFormData),
        } as unknown as Context["req"],
      } as Context;

      await uploadChunk(ctx);

      expect(FileService.getFileByToken).toHaveBeenCalledWith("test-token");
      expect(ChunkService.storeChunk).toHaveBeenCalled();
      expect(ctx.json).toHaveBeenCalledWith({
        code: ErrorCodes.SUCCESS,
        success: true,
      });
    });

    it("should return error for invalid token", async () => {
      const { uploadChunk } = await import("../../../src/controllers/fileController");

      const mockFormData = new FormData();
      mockFormData.append("token", "invalid-token");
      mockFormData.append("chunk", new File(["data"], "chunk.bin"));
      mockFormData.append("hash", "hash-123");

      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const ctx = {
        ...mockContext,
        req: {
          formData: vi.fn().mockResolvedValue(mockFormData),
        } as unknown as Context["req"],
      } as Context;

      await uploadChunk(ctx);

      expect(ctx.json).toHaveBeenCalledWith(
        {
          code: ErrorCodes.INVALID_TOKEN,
          message: "Invalid token",
        },
        401,
      );
    });

    it("should return error for missing form fields", async () => {
      const { uploadChunk } = await import("../../../src/controllers/fileController");

      const mockFormData = new FormData();
      mockFormData.append("token", "test-token");
      // Missing chunk and hash

      const ctx = {
        ...mockContext,
        req: {
          formData: vi.fn().mockResolvedValue(mockFormData),
        } as unknown as Context["req"],
      } as Context;

      await uploadChunk(ctx);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 400,
        }),
        400,
      );
    });
  });

  describe("mergeFile", () => {
    it("should merge file successfully", async () => {
      const { mergeFile } = await import("../../../src/controllers/fileController");

      const mockRequest = {
        token: "test-token",
        fileHash: "file-hash-123",
        fileName: "test.zip",
        chunksLength: 3,
        chunks: [
          { index: 0, hash: "chunk-hash-1" },
          { index: 1, hash: "chunk-hash-2" },
          { index: 2, hash: "chunk-hash-3" },
        ],
      };

      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: "test-token",
      } as unknown as Awaited<ReturnType<typeof FileService.getFileByToken>>);

      (FileService.mergeFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        url: "test_file-hash-123.zip",
      });

      const ctx = {
        ...mockContext,
        req: {
          json: vi.fn().mockResolvedValue(mockRequest),
        } as unknown as Context["req"],
      } as Context;

      await mergeFile(ctx);

      expect(FileService.getFileByToken).toHaveBeenCalledWith("test-token");
      expect(FileService.mergeFile).toHaveBeenCalledWith(
        "test-token",
        "file-hash-123",
        "test.zip",
        3,
        mockRequest.chunks,
      );
      expect(ctx.json).toHaveBeenCalledWith({
        code: ErrorCodes.SUCCESS,
        url: "test_file-hash-123.zip",
      });
    });

    it("should return error for invalid token", async () => {
      const { mergeFile } = await import("../../../src/controllers/fileController");

      const mockRequest = {
        token: "invalid-token",
        fileHash: "file-hash-123",
        fileName: "test.zip",
        chunksLength: 3,
        chunks: [],
      };

      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const ctx = {
        ...mockContext,
        req: {
          json: vi.fn().mockResolvedValue(mockRequest),
        } as unknown as Context["req"],
      } as Context;

      await mergeFile(ctx);

      expect(ctx.json).toHaveBeenCalledWith(
        {
          code: ErrorCodes.INVALID_TOKEN,
          message: "Invalid token",
        },
        401,
      );
    });

    it("should handle merge errors", async () => {
      const { mergeFile } = await import("../../../src/controllers/fileController");

      const mockRequest = {
        token: "test-token",
        fileHash: "file-hash-123",
        fileName: "test.zip",
        chunksLength: 3,
        chunks: [],
      };

      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: "test-token",
      } as unknown as Awaited<ReturnType<typeof FileService.getFileByToken>>);

      (FileService.mergeFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Merge failed"),
      );

      const ctx = {
        ...mockContext,
        req: {
          json: vi.fn().mockResolvedValue(mockRequest),
        } as unknown as Context["req"],
      } as Context;

      await mergeFile(ctx);

      expect(ctx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.MERGE_FAILED,
        }),
        500,
      );
    });
  });
});
