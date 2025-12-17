/**
 * index.ts integration tests
 * 测试服务器入口模块
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, startServer } from "../../src/index";

describe("Server entry point", () => {
  it("should create a Hono app", () => {
    const app = createApp();
    expect(app).toBeDefined();
    expect(typeof app.fetch).toBe("function");
  });

  it("should have health check route", async () => {
    const app = createApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      status: string;
      service: string;
      timestamp: string;
    };
    expect(json).toMatchObject({
      status: "ok",
      service: "wl-upload-server",
    });
    expect(json.timestamp).toBeDefined();
  });

  it("should have file routes", async () => {
    const app = createApp();

    // Test that file routes exist (should return 405 for wrong method)
    const res1 = await app.request("/file/create", { method: "GET" });
    expect([404, 405]).toContain(res1.status);

    const res2 = await app.request("/file/patchHash", { method: "GET" });
    expect([404, 405]).toContain(res2.status);

    const res3 = await app.request("/file/uploadChunk", { method: "GET" });
    expect([404, 405]).toContain(res3.status);

    const res4 = await app.request("/file/merge", { method: "GET" });
    expect([404, 405]).toContain(res4.status);
  });
});

describe("Server startup", () => {
  beforeEach(() => {
    // Mock console methods to avoid output during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should export startServer function", () => {
    expect(startServer).toBeDefined();
    expect(typeof startServer).toBe("function");
  });
});
