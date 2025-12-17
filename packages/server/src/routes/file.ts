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

fileRouter.post("/create", createFile);

fileRouter.post("/patchHash", patchHash);

fileRouter.post("/uploadChunk", uploadChunk);

fileRouter.post("/merge", mergeFile);

export default fileRouter;
