/**
 * 客户端配置类型定义
 */

import type { ProgressInfo, UploadStatus } from "@wl-upload/shared";

/**
 * 上传配置
 */
export interface UploadConfig {
  /** 分片大小（字节），可选，默认 5MB */
  chunkSize?: number;
  /** 并发数，可选，默认 5 */
  concurrency?: number;
  /** API 基础 URL（必需） */
  baseUrl: string;
  /** 是否启用多线程，可选，默认 true */
  enableMultiThreading?: boolean;
}

/**
 * FileUploader 构造函数选项
 */
export interface FileUploaderOptions {
  /** 上传配置 */
  config: UploadConfig;
  /** 进度回调函数 */
  onProgress?: (progress: ProgressInfo) => void;
  /** 状态变更回调函数 */
  onStatusChange?: (status: UploadStatus) => void;
}
