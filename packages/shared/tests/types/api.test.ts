import { describe, expectTypeOf, it } from "vitest";
import type {
  ApiErrorResponse,
  ChunkInfo,
  CreateFileRequest,
  CreateFileResponse,
  MergeFileRequest,
  MergeFileResponse,
  PatchHashRequest,
  PatchHashResponse,
  UploadChunkRequest,
  UploadChunkResponse,
} from "../../src/types/api";

describe("API Types", () => {
  describe("CreateFileRequest", () => {
    it("should have required fields: fileName, fileType, fileSize, chunksLength", () => {
      expectTypeOf<CreateFileRequest>().toHaveProperty("fileName");
      expectTypeOf<CreateFileRequest>().toHaveProperty("fileType");
      expectTypeOf<CreateFileRequest>().toHaveProperty("fileSize");
      expectTypeOf<CreateFileRequest>().toHaveProperty("chunksLength");

      expectTypeOf<CreateFileRequest["fileName"]>().toBeString();
      expectTypeOf<CreateFileRequest["fileType"]>().toBeString();
      expectTypeOf<CreateFileRequest["fileSize"]>().toBeNumber();
      expectTypeOf<CreateFileRequest["chunksLength"]>().toBeNumber();
    });

    it("should accept valid CreateFileRequest object", () => {
      const validRequest: CreateFileRequest = {
        fileName: "example.zip",
        fileType: "zip",
        fileSize: 104857600,
        chunksLength: 20,
      };

      expectTypeOf(validRequest).toMatchTypeOf<CreateFileRequest>();
    });
  });

  describe("CreateFileResponse", () => {
    it("should have required fields: code, token", () => {
      expectTypeOf<CreateFileResponse>().toHaveProperty("code");
      expectTypeOf<CreateFileResponse>().toHaveProperty("token");

      expectTypeOf<CreateFileResponse["code"]>().toBeNumber();
      expectTypeOf<CreateFileResponse["token"]>().toBeString();
    });

    it("should accept valid CreateFileResponse object", () => {
      const validResponse: CreateFileResponse = {
        code: 200,
        token: "unique-session-token-12345",
      };

      expectTypeOf(validResponse).toMatchTypeOf<CreateFileResponse>();
    });
  });

  describe("PatchHashRequest", () => {
    it("should have required fields: token, hash, isChunk", () => {
      expectTypeOf<PatchHashRequest>().toHaveProperty("token");
      expectTypeOf<PatchHashRequest>().toHaveProperty("hash");
      expectTypeOf<PatchHashRequest>().toHaveProperty("isChunk");

      expectTypeOf<PatchHashRequest["token"]>().toBeString();
      expectTypeOf<PatchHashRequest["hash"]>().toBeString();
      expectTypeOf<PatchHashRequest["isChunk"]>().toBeBoolean();
    });

    it("should accept valid PatchHashRequest object", () => {
      const validRequest: PatchHashRequest = {
        token: "unique-session-token-12345",
        hash: "chunk-or-file-hash-abcdef",
        isChunk: true,
      };

      expectTypeOf(validRequest).toMatchTypeOf<PatchHashRequest>();
    });
  });

  describe("PatchHashResponse", () => {
    it("should have required fields: code, exists", () => {
      expectTypeOf<PatchHashResponse>().toHaveProperty("code");
      expectTypeOf<PatchHashResponse>().toHaveProperty("exists");

      expectTypeOf<PatchHashResponse["code"]>().toBeNumber();
      expectTypeOf<PatchHashResponse["exists"]>().toBeBoolean();
    });

    it("should accept valid PatchHashResponse object", () => {
      const validResponse: PatchHashResponse = {
        code: 200,
        exists: true,
      };

      expectTypeOf(validResponse).toMatchTypeOf<PatchHashResponse>();
    });
  });

  describe("UploadChunkRequest", () => {
    it("should be FormData type", () => {
      expectTypeOf<UploadChunkRequest>().toMatchTypeOf<FormData>();
    });
  });

  describe("UploadChunkResponse", () => {
    it("should have required fields: code, success", () => {
      expectTypeOf<UploadChunkResponse>().toHaveProperty("code");
      expectTypeOf<UploadChunkResponse>().toHaveProperty("success");

      expectTypeOf<UploadChunkResponse["code"]>().toBeNumber();
      expectTypeOf<UploadChunkResponse["success"]>().toBeBoolean();
    });

    it("should accept valid UploadChunkResponse object", () => {
      const validResponse: UploadChunkResponse = {
        code: 200,
        success: true,
      };

      expectTypeOf(validResponse).toMatchTypeOf<UploadChunkResponse>();
    });
  });

  describe("MergeFileRequest", () => {
    it("should have required fields: token, fileHash, fileName, chunksLength, chunks", () => {
      expectTypeOf<MergeFileRequest>().toHaveProperty("token");
      expectTypeOf<MergeFileRequest>().toHaveProperty("fileHash");
      expectTypeOf<MergeFileRequest>().toHaveProperty("fileName");
      expectTypeOf<MergeFileRequest>().toHaveProperty("chunksLength");
      expectTypeOf<MergeFileRequest>().toHaveProperty("chunks");

      expectTypeOf<MergeFileRequest["token"]>().toBeString();
      expectTypeOf<MergeFileRequest["fileHash"]>().toBeString();
      expectTypeOf<MergeFileRequest["fileName"]>().toBeString();
      expectTypeOf<MergeFileRequest["chunksLength"]>().toBeNumber();
      expectTypeOf<MergeFileRequest["chunks"]>().toBeArray();
    });

    it("should accept valid MergeFileRequest object", () => {
      const validRequest: MergeFileRequest = {
        token: "unique-session-token-12345",
        fileHash: "final-file-hash-ghijkl",
        fileName: "example.zip",
        chunksLength: 20,
        chunks: [
          { index: 0, hash: "chunk-hash-1" },
          { index: 1, hash: "chunk-hash-2" },
        ],
      };

      expectTypeOf(validRequest).toMatchTypeOf<MergeFileRequest>();
    });
  });

  describe("MergeFileResponse", () => {
    it("should have required fields: code, url", () => {
      expectTypeOf<MergeFileResponse>().toHaveProperty("code");
      expectTypeOf<MergeFileResponse>().toHaveProperty("url");

      expectTypeOf<MergeFileResponse["code"]>().toBeNumber();
      expectTypeOf<MergeFileResponse["url"]>().toBeString();
    });

    it("should accept valid MergeFileResponse object", () => {
      const validResponse: MergeFileResponse = {
        code: 200,
        url: "example_erdfghyutfvbgty64rtyghbnjkiuyhfrd3.zip",
      };

      expectTypeOf(validResponse).toMatchTypeOf<MergeFileResponse>();
    });
  });

  describe("ApiErrorResponse", () => {
    it("should have required fields: code, message", () => {
      expectTypeOf<ApiErrorResponse>().toHaveProperty("code");
      expectTypeOf<ApiErrorResponse>().toHaveProperty("message");

      expectTypeOf<ApiErrorResponse["code"]>().toBeNumber();
      expectTypeOf<ApiErrorResponse["message"]>().toBeString();
    });

    it("should accept valid ApiErrorResponse object", () => {
      const validResponse: ApiErrorResponse = {
        code: 1001,
        message: "Invalid token",
      };

      expectTypeOf(validResponse).toMatchTypeOf<ApiErrorResponse>();
    });
  });

  describe("ChunkInfo", () => {
    it("should have required fields: index, hash", () => {
      expectTypeOf<ChunkInfo>().toHaveProperty("index");
      expectTypeOf<ChunkInfo>().toHaveProperty("hash");

      expectTypeOf<ChunkInfo["index"]>().toBeNumber();
      expectTypeOf<ChunkInfo["hash"]>().toBeString();
    });

    it("should accept valid ChunkInfo object", () => {
      const validChunk: ChunkInfo = {
        index: 0,
        hash: "chunk-hash-1",
      };

      expectTypeOf(validChunk).toMatchTypeOf<ChunkInfo>();
    });
  });
});
