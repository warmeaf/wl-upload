import { describe, expectTypeOf, it } from "vitest";
import type { FileInfo, ProgressInfo, UploadStatus } from "../../src/types/common";

describe("Common Types", () => {
  describe("UploadStatus", () => {
    it("should be a union type of specific string literals", () => {
      expectTypeOf<UploadStatus>().toEqualTypeOf<"idle" | "uploading" | "completed" | "failed">();
    });

    it("should accept valid status values", () => {
      const idle: UploadStatus = "idle";
      const uploading: UploadStatus = "uploading";
      const completed: UploadStatus = "completed";
      const failed: UploadStatus = "failed";

      expectTypeOf(idle).toMatchTypeOf<UploadStatus>();
      expectTypeOf(uploading).toMatchTypeOf<UploadStatus>();
      expectTypeOf(completed).toMatchTypeOf<UploadStatus>();
      expectTypeOf(failed).toMatchTypeOf<UploadStatus>();
    });
  });

  describe("FileInfo", () => {
    it("should have required fields: name, type, size", () => {
      expectTypeOf<FileInfo>().toHaveProperty("name");
      expectTypeOf<FileInfo>().toHaveProperty("type");
      expectTypeOf<FileInfo>().toHaveProperty("size");

      expectTypeOf<FileInfo["name"]>().toBeString();
      expectTypeOf<FileInfo["type"]>().toBeString();
      expectTypeOf<FileInfo["size"]>().toBeNumber();
    });

    it("should accept valid FileInfo object", () => {
      const validFileInfo: FileInfo = {
        name: "example.zip",
        type: "application/zip",
        size: 104857600,
      };

      expectTypeOf(validFileInfo).toMatchTypeOf<FileInfo>();
    });
  });

  describe("ProgressInfo", () => {
    it("should have required fields: chunksHashed, chunksUploaded, totalChunks", () => {
      expectTypeOf<ProgressInfo>().toHaveProperty("chunksHashed");
      expectTypeOf<ProgressInfo>().toHaveProperty("chunksUploaded");
      expectTypeOf<ProgressInfo>().toHaveProperty("totalChunks");

      expectTypeOf<ProgressInfo["chunksHashed"]>().toBeNumber();
      expectTypeOf<ProgressInfo["chunksUploaded"]>().toBeNumber();
      expectTypeOf<ProgressInfo["totalChunks"]>().toBeNumber();
    });

    it("should accept valid ProgressInfo object", () => {
      const validProgress: ProgressInfo = {
        chunksHashed: 10,
        chunksUploaded: 5,
        totalChunks: 20,
      };

      expectTypeOf(validProgress).toMatchTypeOf<ProgressInfo>();
    });
  });
});
