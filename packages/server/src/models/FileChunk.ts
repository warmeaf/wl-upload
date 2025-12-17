/**
 * FileChunk 数据模型
 * 定义文件分片记录的数据结构和操作
 */

import type { Collection, ObjectId } from "mongodb";

/**
 * FileChunk 数据库文档类型
 */
export interface FileChunkDocument {
  /** MongoDB 文档 ID */
  _id?: ObjectId | string;
  /** 分片哈希值（唯一索引） */
  hash: string;
  /** 分片二进制数据 */
  chunk: Buffer;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 创建分片记录输入类型
 */
export interface FileChunkCreateInput {
  /** 分片哈希值 */
  hash: string;
  /** 分片二进制数据 */
  chunk: Buffer;
}

/**
 * 创建分片索引
 * @param collection - fileChunks 集合实例
 */
export async function createFileChunkIndexes(
  collection: Collection<FileChunkDocument>,
): Promise<void> {
  await collection.createIndex({ hash: 1 }, { unique: true });
}

/**
 * 验证分片文档结构
 * @param doc - 要验证的文档
 * @throws 如果文档结构无效
 */
export function validateFileChunkDocument(doc: FileChunkDocument): void {
  if (!doc.hash || typeof doc.hash !== "string") {
    throw new Error("Invalid hash field");
  }

  if (!Buffer.isBuffer(doc.chunk)) {
    throw new Error("Invalid chunk field: must be a Buffer");
  }

  if (!(doc.createdAt instanceof Date)) {
    throw new Error("Invalid createdAt field");
  }
}

/**
 * 创建分片文档
 * @param input - 创建输入
 * @param now - 当前时间（用于测试）
 * @returns 分片文档
 */
export function createFileChunkDocument(
  input: FileChunkCreateInput,
  now: Date = new Date(),
): FileChunkDocument {
  return {
    hash: input.hash,
    chunk: input.chunk,
    createdAt: now,
  };
}
