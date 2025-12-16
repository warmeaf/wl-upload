import type { ProgressInfo, UploadStatus } from "@wl-upload/shared";
import { describe, expectTypeOf, it } from "vitest";
import type { FileUploaderOptions, UploadConfig } from "../../src/types/config";

describe("Config Types", () => {
  describe("UploadConfig", () => {
    it("should have required field: baseUrl", () => {
      expectTypeOf<UploadConfig>().toHaveProperty("baseUrl");
      expectTypeOf<UploadConfig["baseUrl"]>().toBeString();
    });

    it("should have optional fields: chunkSize, concurrency, enableMultiThreading", () => {
      expectTypeOf<UploadConfig>().toHaveProperty("chunkSize");
      expectTypeOf<UploadConfig>().toHaveProperty("concurrency");
      expectTypeOf<UploadConfig>().toHaveProperty("enableMultiThreading");

      expectTypeOf<UploadConfig["chunkSize"]>().toEqualTypeOf<number | undefined>();
      expectTypeOf<UploadConfig["concurrency"]>().toEqualTypeOf<number | undefined>();
      expectTypeOf<UploadConfig["enableMultiThreading"]>().toEqualTypeOf<boolean | undefined>();
    });

    it("should accept valid UploadConfig with all fields", () => {
      const validConfig: UploadConfig = {
        baseUrl: "https://api.example.com",
        chunkSize: 5 * 1024 * 1024,
        concurrency: 5,
        enableMultiThreading: true,
      };

      expectTypeOf(validConfig).toMatchTypeOf<UploadConfig>();
    });

    it("should accept valid UploadConfig with only required field", () => {
      const minimalConfig: UploadConfig = {
        baseUrl: "https://api.example.com",
      };

      expectTypeOf(minimalConfig).toMatchTypeOf<UploadConfig>();
    });
  });

  describe("FileUploaderOptions", () => {
    it("should have required field: config", () => {
      expectTypeOf<FileUploaderOptions>().toHaveProperty("config");
      expectTypeOf<FileUploaderOptions["config"]>().toMatchTypeOf<UploadConfig>();
    });

    it("should have optional fields: onProgress, onStatusChange", () => {
      expectTypeOf<FileUploaderOptions>().toHaveProperty("onProgress");
      expectTypeOf<FileUploaderOptions>().toHaveProperty("onStatusChange");

      expectTypeOf<FileUploaderOptions["onProgress"]>().toEqualTypeOf<
        ((progress: ProgressInfo) => void) | undefined
      >();
      expectTypeOf<FileUploaderOptions["onStatusChange"]>().toEqualTypeOf<
        ((status: UploadStatus) => void) | undefined
      >();
    });

    it("should accept valid FileUploaderOptions with all fields", () => {
      const validOptions: FileUploaderOptions = {
        config: {
          baseUrl: "https://api.example.com",
          chunkSize: 5 * 1024 * 1024,
          concurrency: 5,
          enableMultiThreading: true,
        },
        onProgress: (progress) => {
          console.log(progress);
        },
        onStatusChange: (status) => {
          console.log(status);
        },
      };

      expectTypeOf(validOptions).toMatchTypeOf<FileUploaderOptions>();
    });

    it("should accept valid FileUploaderOptions with only required field", () => {
      const minimalOptions: FileUploaderOptions = {
        config: {
          baseUrl: "https://api.example.com",
        },
      };

      expectTypeOf(minimalOptions).toMatchTypeOf<FileUploaderOptions>();
    });
  });
});
