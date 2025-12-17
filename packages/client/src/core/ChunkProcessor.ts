/**
 * ChunkProcessor
 * 处理文件分片切割和预处理逻辑
 */

import {
  calculateChunkCount,
  type FileChunk,
  splitFileIntoChunks,
  validateFile,
} from "../utils/file";

/**
 * ChunkProcessor 配置
 */
export interface ChunkProcessorConfig {
  /** 分片大小（字节） */
  chunkSize: number;
}

/**
 * ChunkProcessor 类
 */
export class ChunkProcessor {
  private config: ChunkProcessorConfig;

  constructor(config: ChunkProcessorConfig) {
    if (config.chunkSize <= 0) {
      throw new Error("Chunk size must be greater than 0");
    }
    this.config = config;
  }

  /**
   * 处理文件，将其分割成多个分片
   * @param file - 要处理的文件
   * @returns Promise 解析为分片数组
   * @throws 如果文件无效
   */
  async processFile(file: File): Promise<FileChunk[]> {
    validateFile(file);

    const chunks = await splitFileIntoChunks(file, this.config.chunkSize);

    return chunks;
  }

  /**
   * 计算文件需要分割的分片数量
   * @param fileSize - 文件大小（字节）
   * @returns 分片数量
   */
  getTotalChunks(fileSize: number): number {
    return calculateChunkCount(fileSize, this.config.chunkSize);
  }
}
