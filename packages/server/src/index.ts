/**
 * wl-upload server entry file
 * 初始化 Hono 应用，注册路由，启动服务器
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { connect, initializeIndexes } from "./db/mongodb";
import fileRoutes from "./routes/file";

/**
 * 创建 Hono 应用实例
 */
export function createApp(): Hono {
  const app = new Hono();

  // 注册文件上传相关路由
  app.route("/file", fileRoutes);

  // 健康检查端点
  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "wl-upload-server",
    });
  });

  return app;
}

/**
 * 启动服务器
 * @param port - 端口号，默认 3001
 * @param mongoUri - MongoDB 连接 URI，可选
 * @param dbName - MongoDB 数据库名称，可选
 * @returns Promise resolving to the server instance
 */
export async function startServer(
  port: number = 3001,
  mongoUri?: string,
  dbName?: string,
): Promise<ReturnType<typeof serve>> {
  // 连接到 MongoDB
  await connect(mongoUri);

  // 如果指定了数据库名称，初始化索引
  if (dbName) {
    await initializeIndexes();
  }

  // 创建应用
  const app = createApp();

  // 启动服务器
  const server = serve({
    fetch: app.fetch,
    port,
  });

  console.log(`🚀 wl-upload server started on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);

  return server;
}

// 如果直接运行此文件，启动服务器
if (import.meta.main) {
  const port = Number(process.env.PORT) || 3001;
  startServer(port).catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

// 导出默认应用
export default createApp();
