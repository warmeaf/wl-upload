/**
 * File Routes
 * 定义文件上传相关的 API 路由
 */

import { Hono } from "hono";
import { createFile, mergeFile, patchHash, uploadChunk } from "../controllers/fileController";

/**
 * 创建文件路由
 */
const fileRouter = new Hono();

// POST /file/create - 创建文件会话
fileRouter.post("/create", createFile);

// POST /file/patchHash - 检查分片/文件哈希是否存在
fileRouter.post("/patchHash", patchHash);

// POST /file/uploadChunk - 上传分片
fileRouter.post("/uploadChunk", uploadChunk);

// POST /file/merge - 合并文件
fileRouter.post("/merge", mergeFile);

export default fileRouter;
