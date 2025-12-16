import type { ProgressInfo } from "@wl-upload/shared";
import { describe, expectTypeOf, it } from "vitest";
import type { ChunkData, UploadProgress, UploadResult } from "../../src/types/upload";

describe("Upload Types", () => {
  describe("UploadResult", () => {
    it("should have required field: url", () => {
      expectTypeOf<UploadResult>().toHaveProperty("url");
      expectTypeOf<UploadResult["url"]>().toBeString();
    });

    it("should accept valid UploadResult object", () => {
      const validResult: UploadResult = {
        url: "example_erdfghyutfvbgty64rtyghbnjkiuyhfrd3.zip",
      };

      expectTypeOf(validResult).toMatchTypeOf<UploadResult>();
    });
  });

  describe("ChunkData", () => {
    it("should have required fields: index, hash, data", () => {
      expectTypeOf<ChunkData>().toHaveProperty("index");
      expectTypeOf<ChunkData>().toHaveProperty("hash");
      expectTypeOf<ChunkData>().toHaveProperty("data");

      expectTypeOf<ChunkData["index"]>().toBeNumber();
      expectTypeOf<ChunkData["hash"]>().toBeString();
      expectTypeOf<ChunkData["data"]>().toMatchTypeOf<ArrayBuffer>();
    });

    it("should accept valid ChunkData object", () => {
      const validChunk: ChunkData = {
        index: 0,
        hash: "chunk-hash-1",
        data: new ArrayBuffer(1024),
      };

      expectTypeOf(validChunk).toMatchTypeOf<ChunkData>();
    });
  });

  describe("UploadProgress", () => {
    it("should extend ProgressInfo", () => {
      expectTypeOf<UploadProgress>().toMatchTypeOf<ProgressInfo>();
    });

    it("should have all ProgressInfo fields", () => {
      expectTypeOf<UploadProgress>().toHaveProperty("chunksHashed");
      expectTypeOf<UploadProgress>().toHaveProperty("chunksUploaded");
      expectTypeOf<UploadProgress>().toHaveProperty("totalChunks");
    });

    it("should accept valid UploadProgress object", () => {
      const validProgress: UploadProgress = {
        chunksHashed: 10,
        chunksUploaded: 5,
        totalChunks: 20,
      };

      expectTypeOf(validProgress).toMatchTypeOf<UploadProgress>();
    });
  });
});
