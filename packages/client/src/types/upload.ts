/**
 * 客户端上传类型定义
 */

import type { ProgressInfo } from "@wl-upload/shared";

/**
 * 上传结果
 */
export interface UploadResult {
  /** 文件 URL */
  url: string;
}

/**
 * 分片数据
 */
export interface ChunkData {
  /** 分片索引 */
  index: number;
  /** 分片哈希值 */
  hash: string;
  /** 分片数据 */
  data: ArrayBuffer;
}

/**
 * 上传进度（继承自 ProgressInfo）
 */
export interface UploadProgress extends ProgressInfo {
  // 可以在此扩展额外的进度信息
}
