import { describe, expect, it } from "vitest";
import { ApiEndpoints, DefaultConfig, ErrorCodes } from "../src/constants/index";

describe("Constants", () => {
  describe("ErrorCodes", () => {
    it("should have correct error code values", () => {
      expect(ErrorCodes.SUCCESS).toBe(200);
      expect(ErrorCodes.INVALID_TOKEN).toBe(1001);
      expect(ErrorCodes.FILE_NOT_FOUND).toBe(1002);
      expect(ErrorCodes.CHUNK_NOT_FOUND).toBe(1003);
      expect(ErrorCodes.MERGE_FAILED).toBe(1004);
      expect(ErrorCodes.UPLOAD_FAILED).toBe(1005);
    });

    it("should be an object with numeric values", () => {
      expect(typeof ErrorCodes.SUCCESS).toBe("number");
      expect(typeof ErrorCodes.INVALID_TOKEN).toBe("number");
      expect(typeof ErrorCodes.FILE_NOT_FOUND).toBe("number");
      expect(typeof ErrorCodes.CHUNK_NOT_FOUND).toBe("number");
      expect(typeof ErrorCodes.MERGE_FAILED).toBe("number");
      expect(typeof ErrorCodes.UPLOAD_FAILED).toBe("number");
    });
  });

  describe("DefaultConfig", () => {
    it("should have correct default configuration values", () => {
      expect(DefaultConfig.CHUNK_SIZE).toBe(5 * 1024 * 1024); // 5MB
      expect(DefaultConfig.CONCURRENCY).toBe(5);
      expect(DefaultConfig.ENABLE_MULTI_THREADING).toBe(true);
    });

    it("should have correct types", () => {
      expect(typeof DefaultConfig.CHUNK_SIZE).toBe("number");
      expect(typeof DefaultConfig.CONCURRENCY).toBe("number");
      expect(typeof DefaultConfig.ENABLE_MULTI_THREADING).toBe("boolean");
    });
  });

  describe("ApiEndpoints", () => {
    it("should have correct API endpoint paths", () => {
      expect(ApiEndpoints.CREATE_FILE).toBe("/file/create");
      expect(ApiEndpoints.PATCH_HASH).toBe("/file/patchHash");
      expect(ApiEndpoints.UPLOAD_CHUNK).toBe("/file/uploadChunk");
      expect(ApiEndpoints.MERGE_FILE).toBe("/file/merge");
    });

    it("should be strings", () => {
      expect(typeof ApiEndpoints.CREATE_FILE).toBe("string");
      expect(typeof ApiEndpoints.PATCH_HASH).toBe("string");
      expect(typeof ApiEndpoints.UPLOAD_CHUNK).toBe("string");
      expect(typeof ApiEndpoints.MERGE_FILE).toBe("string");
    });
  });
});
