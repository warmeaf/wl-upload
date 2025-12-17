/**
 * wl-upload client entry file
 * 导出公共 API
 */

// Re-export types from shared package that users might need
export type { FileInfo, ProgressInfo, UploadStatus } from "@wl-upload/shared";
// Export the main FileUploader class
export { FileUploader } from "./core/FileUploader";
// Export types for users of the library
export type { FileUploaderOptions, UploadConfig } from "./types/config";
export type { EventMap } from "./types/events";
export type { UploadProgress } from "./types/upload";
