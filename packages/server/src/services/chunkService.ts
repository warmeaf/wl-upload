/**
 * ChunkService
 * 实现分片存储、查询、去重等业务逻辑
 */

import { getFileChunksCollection } from "../db/mongodb";
import type { FileChunkDocument } from "../models/FileChunk";
import { createFileChunkDocument, validateFileChunkDocument } from "../models/FileChunk";

/**
 * 存储分片数据（带去重）
 * @param hash - 分片哈希值
 * @param chunkData - 分片二进制数据
 * @returns Promise 解析为是否成功（如果分片已存在也返回 true）
 * @throws 如果存储失败
 */
export async function storeChunk(hash: string, chunkData: Buffer): Promise<boolean> {
  if (!hash || typeof hash !== "string") {
    throw new Error("Invalid hash: must be a non-empty string");
  }

  if (!Buffer.isBuffer(chunkData)) {
    throw new Error("Invalid chunkData: must be a Buffer");
  }

  const collection =
    getFileChunksCollection() as unknown as import("mongodb").Collection<FileChunkDocument>;

  // 检查分片是否已存在
  const existing = await collection.findOne({ hash });
  if (existing) {
    // 分片已存在，跳过存储（去重）
    return true;
  }

  try {
    // 创建分片文档
    const doc = createFileChunkDocument({ hash, chunk: chunkData });

    // 存储分片
    await collection.insertOne(doc);

    return true;
  } catch (error: unknown) {
    // 处理唯一索引冲突（E11000 错误码）
    // 这可能在并发情况下发生：两个请求同时检查都不存在，然后都尝试插入
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      // 分片已存在（被其他请求插入），视为成功
      return true;
    }

    // 其他错误重新抛出
    throw error;
  }
}

/**
 * 检查分片是否存在
 * @param hash - 分片哈希值
 * @returns Promise 解析为是否存在
 * @throws 如果查询失败
 */
export async function chunkExists(hash: string): Promise<boolean> {
  if (!hash || typeof hash !== "string") {
    throw new Error("Invalid hash: must be a non-empty string");
  }

  const collection =
    getFileChunksCollection() as unknown as import("mongodb").Collection<FileChunkDocument>;

  const doc = await collection.findOne({ hash });

  return doc !== null;
}

/**
 * 根据哈希值获取分片数据
 * @param hash - 分片哈希值
 * @returns Promise 解析为分片文档，如果不存在则返回 null
 * @throws 如果查询失败
 */
export async function getChunk(hash: string): Promise<FileChunkDocument | null> {
  if (!hash || typeof hash !== "string") {
    throw new Error("Invalid hash: must be a non-empty string");
  }

  const collection =
    getFileChunksCollection() as unknown as import("mongodb").Collection<FileChunkDocument>;

  const doc = await collection.findOne({ hash });

  if (!doc) {
    return null;
  }

  // 验证文档结构
  validateFileChunkDocument(doc);

  return doc;
}
