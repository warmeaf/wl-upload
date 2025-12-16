/**
 * API 请求和响应类型定义
 */

/**
 * 分片信息
 */
export interface ChunkInfo {
  /** 分片索引 */
  index: number;
  /** 分片哈希值 */
  hash: string;
}

/**
 * 创建文件会话请求
 */
export interface CreateFileRequest {
  /** 文件名 */
  fileName: string;
  /** 文件类型 */
  fileType: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 分片总数 */
  chunksLength: number;
}

/**
 * 创建文件会话响应
 */
export interface CreateFileResponse {
  /** 响应码 */
  code: number;
  /** 会话令牌 */
  token: string;
}

/**
 * 检查分片/文件哈希请求
 */
export interface PatchHashRequest {
  /** 会话令牌 */
  token: string;
  /** 哈希值 */
  hash: string;
  /** 是否为分片 */
  isChunk: boolean;
}

/**
 * 检查分片/文件哈希响应
 */
export interface PatchHashResponse {
  /** 响应码 */
  code: number;
  /** 是否存在 */
  exists: boolean;
}

/**
 * 上传分片请求（FormData）
 */
export type UploadChunkRequest = FormData;

/**
 * 上传分片响应
 */
export interface UploadChunkResponse {
  /** 响应码 */
  code: number;
  /** 是否成功 */
  success: boolean;
}

/**
 * 合并文件请求
 */
export interface MergeFileRequest {
  /** 会话令牌 */
  token: string;
  /** 文件哈希值 */
  fileHash: string;
  /** 文件名 */
  fileName: string;
  /** 分片总数 */
  chunksLength: number;
  /** 分片信息数组 */
  chunks: ChunkInfo[];
}

/**
 * 合并文件响应
 */
export interface MergeFileResponse {
  /** 响应码 */
  code: number;
  /** 文件 URL */
  url: string;
}

/**
 * API 错误响应
 */
export interface ApiErrorResponse {
  /** 错误码 */
  code: number;
  /** 错误消息 */
  message: string;
}
