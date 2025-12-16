/**
 * 常量定义
 */

/**
 * 业务错误码
 */
export const ErrorCodes = {
  /** 成功 */
  SUCCESS: 200,
  /** 无效的 Token */
  INVALID_TOKEN: 1001,
  /** 文件未找到 */
  FILE_NOT_FOUND: 1002,
  /** 分片未找到 */
  CHUNK_NOT_FOUND: 1003,
  /** 合并失败 */
  MERGE_FAILED: 1004,
  /** 上传失败 */
  UPLOAD_FAILED: 1005,
} as const;

/**
 * 默认配置值
 */
export const DefaultConfig = {
  /** 默认分片大小（5MB） */
  CHUNK_SIZE: 5 * 1024 * 1024,
  /** 默认并发数 */
  CONCURRENCY: 5,
  /** 默认启用多线程 */
  ENABLE_MULTI_THREADING: true,
} as const;

/**
 * API 端点路径
 */
export const ApiEndpoints = {
  /** 创建文件会话 */
  CREATE_FILE: "/file/create",
  /** 检查分片/文件哈希 */
  PATCH_HASH: "/file/patchHash",
  /** 上传分片 */
  UPLOAD_CHUNK: "/file/uploadChunk",
  /** 合并文件 */
  MERGE_FILE: "/file/merge",
} as const;
