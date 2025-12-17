/**
 * File 数据模型
 * 定义文件记录的数据结构和操作
 */

import type { Collection, ObjectId } from "mongodb";

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
 * File 数据库文档类型
 */
export interface FileDocument {
  /** MongoDB 文档 ID */
  _id?: ObjectId | string;
  /** 会话令牌（唯一索引） */
  token: string;
  /** 文件名 */
  fileName: string;
  /** 文件类型 */
  fileType: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 分片总数 */
  chunksLength: number;
  /** 文件哈希值（初始为空字符串） */
  fileHash: string;
  /** 已上传分片信息数组（初始为空数组） */
  chunks: ChunkInfo[];
  /** 文件 URL（初始为空字符串） */
  url: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 创建文件记录输入类型
 */
export interface FileCreateInput {
  /** 会话令牌 */
  token: string;
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
 * 更新文件记录输入类型
 */
export interface FileUpdateInput {
  /** 文件哈希值 */
  fileHash?: string;
  /** 已上传分片信息数组 */
  chunks?: ChunkInfo[];
  /** 文件 URL */
  url?: string;
}

/**
 * 创建文件索引
 * @param collection - files 集合实例
 */
export async function createFileIndexes(collection: Collection<FileDocument>): Promise<void> {
  await collection.createIndex({ token: 1 }, { unique: true });

  await collection.createIndex({ fileHash: 1 });
}

/**
 * 验证文件文档结构
 * @param doc - 要验证的文档
 * @throws 如果文档结构无效
 */
export function validateFileDocument(doc: FileDocument): void {
  if (!doc.token || typeof doc.token !== "string") {
    throw new Error("Invalid token field");
  }

  if (!doc.fileName || typeof doc.fileName !== "string") {
    throw new Error("Invalid fileName field");
  }

  if (!doc.fileType || typeof doc.fileType !== "string") {
    throw new Error("Invalid fileType field");
  }

  if (typeof doc.fileSize !== "number" || doc.fileSize <= 0) {
    throw new Error("Invalid fileSize field");
  }

  if (typeof doc.chunksLength !== "number" || doc.chunksLength <= 0) {
    throw new Error("Invalid chunksLength field");
  }

  if (typeof doc.fileHash !== "string") {
    throw new Error("Invalid fileHash field");
  }

  if (!Array.isArray(doc.chunks)) {
    throw new Error("Invalid chunks field");
  }

  for (const chunk of doc.chunks) {
    if (typeof chunk.index !== "number" || typeof chunk.hash !== "string" || !chunk.hash) {
      throw new Error("Invalid chunk structure");
    }
  }

  if (typeof doc.url !== "string") {
    throw new Error("Invalid url field");
  }

  if (!(doc.createdAt instanceof Date)) {
    throw new Error("Invalid createdAt field");
  }

  if (!(doc.updatedAt instanceof Date)) {
    throw new Error("Invalid updatedAt field");
  }
}

/**
 * 创建文件文档
 * @param input - 创建输入
 * @param now - 当前时间（用于测试）
 * @returns 文件文档
 */
export function createFileDocument(input: FileCreateInput, now: Date = new Date()): FileDocument {
  return {
    token: input.token,
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
    chunksLength: input.chunksLength,
    fileHash: "",
    chunks: [],
    url: "",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 更新文件文档
 * @param doc - 要更新的文档
 * @param input - 更新输入
 * @param now - 当前时间（用于测试）
 * @returns 更新后的文件文档
 */
export function updateFileDocument(
  doc: FileDocument,
  input: FileUpdateInput,
  now: Date = new Date(),
): FileDocument {
  const updated: FileDocument = { ...doc };

  if (input.fileHash !== undefined) {
    updated.fileHash = input.fileHash;
  }

  if (input.chunks !== undefined) {
    if (!Array.isArray(input.chunks)) {
      throw new Error("Invalid chunks field: must be an array");
    }
    for (const chunk of input.chunks) {
      if (typeof chunk.index !== "number" || typeof chunk.hash !== "string" || !chunk.hash) {
        throw new Error("Invalid chunk structure");
      }
    }
    updated.chunks = input.chunks;
  }

  if (input.url !== undefined) {
    if (typeof input.url !== "string") {
      throw new Error("Invalid url field: must be a string");
    }
    updated.url = input.url;
  }

  updated.updatedAt = now;

  return updated;
}
