/**
 * FileService
 * 实现文件会话创建、Hash 检查、文件合并等业务逻辑
 */

import type { ChunkInfo } from "@wl-upload/shared";
import { getFilesCollection } from "../db/mongodb";
import type { FileDocument } from "../models/File";
import { createFileDocument, updateFileDocument, validateFileDocument } from "../models/File";
import { generateToken } from "../utils/token";

/**
 * 创建文件会话输入类型（不包含 token，由服务生成）
 */
export interface CreateFileSessionInput {
  fileName: string;
  fileType: string;
  fileSize: number;
  chunksLength: number;
}

/**
 * 创建文件会话
 * @param input - 文件创建输入（不包含 token）
 * @returns Promise 解析为包含 token 的对象
 * @throws 如果创建失败
 */
export async function createFileSession(input: CreateFileSessionInput): Promise<{ token: string }> {
  // 生成唯一 token
  const token = generateToken();

  // 创建文件文档
  const doc = createFileDocument({
    token,
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
    chunksLength: input.chunksLength,
  });

  const collection = getFilesCollection() as unknown as import("mongodb").Collection<FileDocument>;

  try {
    // 插入文档
    await collection.insertOne(doc);

    return { token };
  } catch (error: unknown) {
    // 处理唯一索引冲突（理论上不应该发生，因为 token 是随机生成的）
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      // 如果 token 冲突，重试一次
      const retryToken = generateToken();
      const retryDoc = createFileDocument({
        token: retryToken,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        chunksLength: input.chunksLength,
      });

      await collection.insertOne(retryDoc);
      return { token: retryToken };
    }

    throw error;
  }
}

/**
 * 根据文件 Hash 检查文件是否存在（用于秒传）
 * @param fileHash - 文件哈希值
 * @returns Promise 解析为是否存在
 * @throws 如果查询失败
 */
export async function fileExistsByHash(fileHash: string): Promise<boolean> {
  if (!fileHash || typeof fileHash !== "string") {
    throw new Error("Invalid fileHash: must be a non-empty string");
  }

  const collection = getFilesCollection() as unknown as import("mongodb").Collection<FileDocument>;

  const doc = await collection.findOne({ fileHash });

  return doc !== null;
}

/**
 * 根据 token 获取文件文档
 * @param token - 会话令牌
 * @returns Promise 解析为文件文档，如果不存在则返回 null
 * @throws 如果查询失败
 */
export async function getFileByToken(token: string): Promise<FileDocument | null> {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid token: must be a non-empty string");
  }

  const collection = getFilesCollection() as unknown as import("mongodb").Collection<FileDocument>;

  const doc = await collection.findOne({ token });

  if (!doc) {
    return null;
  }

  // 验证文档结构
  validateFileDocument(doc);

  return doc;
}

/**
 * 生成文件 URL
 * 格式：{fileNameBase}_{fileHash}.{extension}
 * @param fileName - 原始文件名
 * @param fileHash - 文件哈希值
 * @returns 生成的文件 URL
 */
export function generateFileUrl(fileName: string, fileHash: string): string {
  if (!fileName || typeof fileName !== "string") {
    throw new Error("Invalid fileName: must be a non-empty string");
  }

  if (!fileHash || typeof fileHash !== "string") {
    throw new Error("Invalid fileHash: must be a non-empty string");
  }

  // 提取文件名（去除路径）
  const baseName = fileName.split(/[/\\]/).pop() || fileName;

  // 分离文件名和扩展名
  const lastDotIndex = baseName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    // 没有扩展名
    return `${baseName}_${fileHash}`;
  }

  const nameBase = baseName.substring(0, lastDotIndex);
  const extension = baseName.substring(lastDotIndex + 1);

  return `${nameBase}_${fileHash}.${extension}`;
}

/**
 * 合并文件
 * @param token - 会话令牌
 * @param fileHash - 文件哈希值
 * @param fileName - 文件名
 * @param chunksLength - 分片总数
 * @param chunks - 分片信息数组
 * @returns Promise 解析为包含文件 URL 的对象
 * @throws 如果合并失败
 */
export async function mergeFile(
  token: string,
  fileHash: string,
  fileName: string,
  chunksLength: number,
  chunks: ChunkInfo[],
): Promise<{ url: string }> {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid token: must be a non-empty string");
  }

  if (!fileHash || typeof fileHash !== "string") {
    throw new Error("Invalid fileHash: must be a non-empty string");
  }

  if (!fileName || typeof fileName !== "string") {
    throw new Error("Invalid fileName: must be a non-empty string");
  }

  if (typeof chunksLength !== "number" || chunksLength <= 0) {
    throw new Error("Invalid chunksLength: must be a positive number");
  }

  if (!Array.isArray(chunks)) {
    throw new Error("Invalid chunks: must be an array");
  }

  // 验证分片数量
  if (chunks.length !== chunksLength) {
    throw new Error("Chunk count mismatch");
  }

  // 验证分片顺序和完整性
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].index !== i) {
      throw new Error("Chunks must be in order");
    }
    if (!chunks[i].hash || typeof chunks[i].hash !== "string") {
      throw new Error("Invalid chunk hash");
    }
  }

  const collection = getFilesCollection() as unknown as import("mongodb").Collection<FileDocument>;

  // 查找文件会话
  const doc = await collection.findOne({ token });
  if (!doc) {
    throw new Error("File session not found");
  }

  // 验证分片数量是否匹配
  if (doc.chunksLength !== chunksLength) {
    throw new Error("Chunk count mismatch");
  }

  // 生成文件 URL
  const url = generateFileUrl(fileName, fileHash);

  // 更新文件文档
  const updatedDoc = updateFileDocument(doc, {
    fileHash,
    chunks,
    url,
  });

  // 验证更新后的文档
  validateFileDocument(updatedDoc);

  // 更新数据库
  await collection.updateOne(
    { token },
    {
      $set: {
        fileHash: updatedDoc.fileHash,
        chunks: updatedDoc.chunks,
        url: updatedDoc.url,
        updatedAt: updatedDoc.updatedAt,
      },
    },
  );

  return { url };
}
