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

  app.route("/file", fileRoutes);

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
  await connect(mongoUri);

  if (dbName) {
    await initializeIndexes();
  }

  const app = createApp();

  const server = serve({
    fetch: app.fetch,
    port,
  });

  console.log(`🚀 wl-upload server started on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);

  return server;
}

if (import.meta.main) {
  const port = Number(process.env.PORT) || 3001;
  startServer(port).catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

export default createApp();
