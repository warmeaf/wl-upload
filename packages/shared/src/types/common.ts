/**
 * 通用类型定义
 */

/**
 * 上传状态
 */
export type UploadStatus = "idle" | "uploading" | "completed" | "failed";

/**
 * 文件基本信息
 */
export interface FileInfo {
  /** 文件名 */
  name: string;
  /** 文件类型（MIME type） */
  type: string;
  /** 文件大小（字节） */
  size: number;
}

/**
 * 进度信息
 */
export interface ProgressInfo {
  /** 已计算 Hash 的分片数 */
  chunksHashed: number;
  /** 已上传的分片数 */
  chunksUploaded: number;
  /** 总分片数 */
  totalChunks: number;
}
