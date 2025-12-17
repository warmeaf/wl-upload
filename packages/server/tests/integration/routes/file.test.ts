import {
  type ApiErrorResponse,
  type CreateFileResponse,
  ErrorCodes,
  type MergeFileResponse,
  type PatchHashResponse,
  type UploadChunkResponse,
} from "@wl-upload/shared";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fileRouter from "../../../src/routes/file";
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

describe("File Routes Integration", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route("/file", fileRouter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /file/create", () => {
    it("should create file session successfully", async () => {
      (FileService.createFileSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: "test-token-123",
      });

      const req = new Request("http://localhost/file/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: "test.zip",
          fileType: "zip",
          fileSize: 1024,
          chunksLength: 5,
        }),
      });

      const res = await app.request(req);
      const data = (await res.json()) as CreateFileResponse;

      expect(res.status).toBe(200);
      expect(data.code).toBe(ErrorCodes.SUCCESS);
      expect(data.token).toBe("test-token-123");
    });

    it("should return 400 for invalid request", async () => {
      const req = new Request("http://localhost/file/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const res = await app.request(req);
      const data = (await res.json()) as ApiErrorResponse;

      expect(res.status).toBe(400);
      expect(data.code).toBe(400);
    });
  });

  describe("POST /file/patchHash", () => {
    it("should check chunk hash exists", async () => {
      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: "test-token",
      } as unknown as Awaited<ReturnType<typeof FileService.getFileByToken>>);

      (ChunkService.chunkExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const req = new Request("http://localhost/file/patchHash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: "test-token",
          hash: "chunk-hash-123",
          isChunk: true,
        }),
      });

      const res = await app.request(req);
      const data = (await res.json()) as PatchHashResponse;

      expect(res.status).toBe(200);
      expect(data.code).toBe(ErrorCodes.SUCCESS);
      expect(data.exists).toBe(true);
    });

    it("should check file hash exists", async () => {
      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: "test-token",
      } as unknown as Awaited<ReturnType<typeof FileService.getFileByToken>>);

      (FileService.fileExistsByHash as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const req = new Request("http://localhost/file/patchHash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: "test-token",
          hash: "file-hash-123",
          isChunk: false,
        }),
      });

      const res = await app.request(req);
      const data = (await res.json()) as PatchHashResponse;

      expect(res.status).toBe(200);
      expect(data.code).toBe(ErrorCodes.SUCCESS);
      expect(data.exists).toBe(true);
    });

    it("should return 401 for invalid token", async () => {
      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const req = new Request("http://localhost/file/patchHash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: "invalid-token",
          hash: "hash-123",
          isChunk: true,
        }),
      });

      const res = await app.request(req);
      const data = (await res.json()) as ApiErrorResponse;

      expect(res.status).toBe(401);
      expect(data.code).toBe(ErrorCodes.INVALID_TOKEN);
    });
  });

  describe("POST /file/uploadChunk", () => {
    it("should upload chunk successfully", async () => {
      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: "test-token",
      } as unknown as Awaited<ReturnType<typeof FileService.getFileByToken>>);

      (ChunkService.storeChunk as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const formData = new FormData();
      formData.append("token", "test-token");
      formData.append("chunk", new Blob(["chunk data"]));
      formData.append("hash", "chunk-hash-123");

      const req = new Request("http://localhost/file/uploadChunk", {
        method: "POST",
        body: formData,
      });

      const res = await app.request(req);
      const data = (await res.json()) as UploadChunkResponse;

      expect(res.status).toBe(200);
      expect(data.code).toBe(ErrorCodes.SUCCESS);
      expect(data.success).toBe(true);
    });

    it("should return 401 for invalid token", async () => {
      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("token", "invalid-token");
      formData.append("chunk", new Blob(["data"]));
      formData.append("hash", "hash-123");

      const req = new Request("http://localhost/file/uploadChunk", {
        method: "POST",
        body: formData,
      });

      const res = await app.request(req);
      const data = (await res.json()) as ApiErrorResponse;

      expect(res.status).toBe(401);
      expect(data.code).toBe(ErrorCodes.INVALID_TOKEN);
    });
  });

  describe("POST /file/merge", () => {
    it("should merge file successfully", async () => {
      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: "test-token",
      } as unknown as Awaited<ReturnType<typeof FileService.getFileByToken>>);

      (FileService.mergeFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        url: "test_file-hash-123.zip",
      });

      const req = new Request("http://localhost/file/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: "test-token",
          fileHash: "file-hash-123",
          fileName: "test.zip",
          chunksLength: 3,
          chunks: [
            { index: 0, hash: "chunk-hash-1" },
            { index: 1, hash: "chunk-hash-2" },
            { index: 2, hash: "chunk-hash-3" },
          ],
        }),
      });

      const res = await app.request(req);
      const data = (await res.json()) as MergeFileResponse;

      expect(res.status).toBe(200);
      expect(data.code).toBe(ErrorCodes.SUCCESS);
      expect(data.url).toBe("test_file-hash-123.zip");
    });

    it("should return 401 for invalid token", async () => {
      (FileService.getFileByToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const req = new Request("http://localhost/file/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: "invalid-token",
          fileHash: "file-hash-123",
          fileName: "test.zip",
          chunksLength: 3,
          chunks: ["chunk1", "chunk2", "chunk3"],
        }),
      });

      const res = await app.request(req);
      const data = (await res.json()) as ApiErrorResponse;

      expect(res.status).toBe(401);
      expect(data.code).toBe(ErrorCodes.INVALID_TOKEN);
    });

    it("should return 400 for invalid request", async () => {
      const req = new Request("http://localhost/file/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const res = await app.request(req);
      const data = (await res.json()) as ApiErrorResponse;

      expect(res.status).toBe(400);
      expect(data.code).toBe(400);
    });
  });
});
