/**
 * 客户端事件类型定义
 */

/**
 * 分片 Hash 完成事件
 */
export interface ChunkHashedEvent {
  /** 分片索引 */
  chunkIndex: number;
  /** 分片哈希值 */
  hash: string;
  /** 分片数据 */
  chunkData: ArrayBuffer;
}

/**
 * 所有分片 Hash 完成事件
 */
export type AllChunksHashedEvent = Record<string, never>;

/**
 * 文件 Hash 完成事件
 */
export interface FileHashedEvent {
  /** 文件哈希值 */
  fileHash: string;
}

/**
 * 队列完成事件
 */
export type QueueDrainedEvent = Record<string, never>;

/**
 * 队列中止事件
 */
export interface QueueAbortedEvent {
  /** 错误信息 */
  error: Error;
}

/**
 * 所有上传事件类型的联合类型
 */
export type UploadEvents =
  | ChunkHashedEvent
  | AllChunksHashedEvent
  | FileHashedEvent
  | QueueDrainedEvent
  | QueueAbortedEvent;
