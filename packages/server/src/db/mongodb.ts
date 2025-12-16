/**
 * MongoDB 数据库连接管理
 * 实现 MongoDB 连接和基础操作封装
 */

import { type Collection, type Db, MongoClient } from "mongodb";
import { createFileIndexes, type FileDocument } from "../models/File";
import { createFileChunkIndexes, type FileChunkDocument } from "../models/FileChunk";

/**
 * MongoDB 客户端实例
 */
let client: MongoClient | null = null;

/**
 * 数据库实例
 */
let db: Db | null = null;

/**
 * 默认 MongoDB URI
 */
const DEFAULT_MONGODB_URI = "mongodb://localhost:27017";

/**
 * 默认数据库名称
 */
const DEFAULT_DB_NAME = "wl-upload";

/**
 * 连接到 MongoDB
 * @param uri - MongoDB 连接 URI，如果不提供则使用环境变量 MONGODB_URI 或默认值
 * @throws 如果连接失败
 */
export async function connect(uri?: string): Promise<void> {
  // 如果已经连接，直接返回
  if (client && db) {
    return;
  }

  // 确定连接 URI
  const connectionUri = uri || process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

  // 创建客户端
  client = new MongoClient(connectionUri, {
    // 连接选项可以在这里配置
  });

  // 连接到数据库
  await client.connect();

  // 获取数据库名称
  const dbName = process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME;

  // 获取数据库实例
  db = client.db(dbName);
}

/**
 * 关闭数据库连接
 * @throws 如果关闭失败
 */
export async function close(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

/**
 * 检查是否已连接
 * @returns 如果已连接返回 true，否则返回 false
 */
export function isConnected(): boolean {
  return client !== null && db !== null;
}

/**
 * 获取数据库实例
 * @param dbName - 数据库名称，如果不提供则使用环境变量 MONGODB_DB_NAME 或默认值
 * @returns 数据库实例
 * @throws 如果未连接
 * @remarks
 * 注意：如果提供的 `dbName` 与当前连接的数据库名称不同，此函数会返回一个新的数据库实例，
 * 但不会更新内部存储的 `db` 变量。这意味着后续调用 `getFilesCollection()` 或 `getFileChunksCollection()`
 * 时仍会使用原始连接的数据库。建议在应用中使用统一的数据库名称，或直接使用 `getFilesCollection()`
 * 和 `getFileChunksCollection()` 来访问集合。
 */
export function getDatabase(dbName?: string): Db {
  if (!client || !db) {
    throw new Error("Database not connected");
  }

  const databaseName = dbName || process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME;

  // 如果请求的数据库名称与当前数据库名称不同，返回新的数据库实例
  // 注意：这不会更新内部存储的 db 变量
  if (databaseName !== db.databaseName) {
    return client.db(databaseName);
  }

  return db;
}

/**
 * 获取 files 集合
 * @returns files 集合实例
 * @throws 如果未连接
 */
export function getFilesCollection(): Collection {
  const database = getDatabase();
  return database.collection("files");
}

/**
 * 获取 fileChunks 集合
 * @returns fileChunks 集合实例
 * @throws 如果未连接
 */
export function getFileChunksCollection(): Collection {
  const database = getDatabase();
  return database.collection("fileChunks");
}

/**
 * 初始化数据库索引
 * 为 files 和 fileChunks 集合创建必要的索引
 * @throws 如果未连接或索引创建失败
 */
export async function initializeIndexes(): Promise<void> {
  if (!client || !db) {
    throw new Error("Database not connected");
  }

  const filesCollection = getFilesCollection() as unknown as Collection<FileDocument>;
  const fileChunksCollection =
    getFileChunksCollection() as unknown as Collection<FileChunkDocument>;

  // 创建 files 集合的索引
  await createFileIndexes(filesCollection);

  // 创建 fileChunks 集合的索引
  await createFileChunkIndexes(fileChunksCollection);
}
