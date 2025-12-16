/**
 * UploadQueue
 * 实现并发上传队列，包括任务调度、并发控制、秒传检查、失败处理
 */

import {
  ApiEndpoints,
  type ApiErrorResponse,
  type CreateFileRequest,
  type CreateFileResponse,
  DefaultConfig,
  type MergeFileRequest,
  type MergeFileResponse,
  type PatchHashRequest,
  type PatchHashResponse,
  type UploadChunkResponse,
} from "@wl-upload/shared";
import type { Emitter } from "mitt";
import type { UploadConfig } from "../types/config";
import type {
  AllChunksHashedEvent,
  ChunkHashedEvent,
  EventMap,
  FileHashedEvent,
  QueueAbortedEvent,
  QueueDrainedEvent,
} from "../types/events";

/**
 * 上传任务状态
 */
type TaskState = "pending" | "inFlight" | "completed" | "failed";

/**
 * 上传任务
 */
interface UploadTask {
  chunkIndex: number;
  hash: string;
  chunkData: ArrayBuffer;
  state: TaskState;
}

/**
 * UploadQueue 配置
 */
export interface UploadQueueConfig {
  /** 上传配置 */
  config: UploadConfig;
  /** 事件发射器 */
  emitter: Emitter<EventMap>;
  /** 会话令牌 */
  token: string;
}

/**
 * API 请求函数
 * 这些函数可以被测试环境 mock
 */

/**
 * 创建文件会话
 */
export async function createFileSession(
  baseUrl: string,
  request: CreateFileRequest,
): Promise<CreateFileResponse> {
  const response = await fetch(`${baseUrl}${ApiEndpoints.CREATE_FILE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error: ApiErrorResponse = await response.json();
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return (await response.json()) as CreateFileResponse;
}

/**
 * 检查分片/文件哈希是否存在
 */
export async function checkHashExists(
  baseUrl: string,
  token: string,
  hash: string,
  isChunk: boolean,
): Promise<PatchHashResponse> {
  const request: PatchHashRequest = {
    token,
    hash,
    isChunk,
  };

  const response = await fetch(`${baseUrl}${ApiEndpoints.PATCH_HASH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error: ApiErrorResponse = await response.json();
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return (await response.json()) as PatchHashResponse;
}

/**
 * 上传分片
 */
export async function uploadChunk(
  baseUrl: string,
  token: string,
  chunkData: ArrayBuffer,
  hash: string,
): Promise<UploadChunkResponse> {
  const formData = new FormData();
  formData.append("token", token);
  formData.append("chunk", new Blob([chunkData]));
  formData.append("hash", hash);

  const response = await fetch(`${baseUrl}${ApiEndpoints.UPLOAD_CHUNK}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error: ApiErrorResponse = await response.json();
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return (await response.json()) as UploadChunkResponse;
}

/**
 * 合并文件
 */
export async function mergeFile(
  baseUrl: string,
  request: MergeFileRequest,
): Promise<MergeFileResponse> {
  const response = await fetch(`${baseUrl}${ApiEndpoints.MERGE_FILE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error: ApiErrorResponse = await response.json();
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return (await response.json()) as MergeFileResponse;
}

/**
 * UploadQueue 类
 */
export class UploadQueue {
  private config: Required<UploadConfig>;
  private emitter: Emitter<EventMap>;
  private token: string;
  private tasks: Map<number, UploadTask> = new Map();
  private inFlightCount = 0;
  private allChunksHashed = false;
  private isAborted = false;
  private fileHash: string | null = null;
  private fileInstantUploadChecked = false;

  constructor({ config, emitter, token }: UploadQueueConfig) {
    this.config = {
      chunkSize: config.chunkSize ?? DefaultConfig.CHUNK_SIZE,
      concurrency: config.concurrency ?? DefaultConfig.CONCURRENCY,
      baseUrl: config.baseUrl,
      enableMultiThreading: config.enableMultiThreading ?? DefaultConfig.ENABLE_MULTI_THREADING,
    };
    this.emitter = emitter;
    this.token = token;

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.emitter.on("chunkHashed", (event: ChunkHashedEvent) => {
      if (this.isAborted) {
        return;
      }
      this.enqueueTask(event);
    });

    this.emitter.on("allChunksHashed", (_event: AllChunksHashedEvent) => {
      if (this.isAborted) {
        return;
      }
      this.allChunksHashed = true;
      this.checkCompletion();
    });

    this.emitter.on("fileHashed", (event: FileHashedEvent) => {
      if (this.isAborted) {
        return;
      }
      void this.handleFileHashed(event);
    });
  }

  /**
   * 处理文件 Hash 完成事件
   */
  private async handleFileHashed(event: FileHashedEvent): Promise<void> {
    if (this.fileInstantUploadChecked) {
      return;
    }

    this.fileHash = event.fileHash;
    this.fileInstantUploadChecked = true;

    try {
      const response = await checkHashExists(
        this.config.baseUrl,
        this.token,
        event.fileHash,
        false,
      );

      if (response.exists) {
        // 文件已存在，标记所有任务为完成
        this.markAllTasksComplete();
        this.checkCompletion();
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 标记所有任务为完成
   */
  private markAllTasksComplete(): void {
    for (const task of this.tasks.values()) {
      if (task.state !== "completed") {
        task.state = "completed";
      }
    }
  }

  /**
   * 将任务加入队列
   */
  private enqueueTask(event: ChunkHashedEvent): void {
    if (this.isAborted) {
      return;
    }

    const task: UploadTask = {
      chunkIndex: event.chunkIndex,
      hash: event.hash,
      chunkData: event.chunkData,
      state: "pending",
    };

    this.tasks.set(event.chunkIndex, task);
    this.processQueue();
  }

  /**
   * 处理队列
   */
  private processQueue(): void {
    if (this.isAborted) {
      return;
    }

    // 如果文件已存在且已检查，不再处理新任务
    // (文件存在时，所有任务已被标记为完成)
    if (this.fileHash && this.fileInstantUploadChecked) {
      return;
    }

    // 启动新任务直到达到并发限制
    while (this.inFlightCount < this.config.concurrency) {
      const pendingTask = this.findPendingTask();
      if (!pendingTask) {
        break;
      }

      this.inFlightCount++;
      pendingTask.state = "inFlight";
      void this.executeTask(pendingTask);
    }
  }

  /**
   * 查找待处理的任务
   */
  private findPendingTask(): UploadTask | undefined {
    for (const task of this.tasks.values()) {
      if (task.state === "pending") {
        return task;
      }
    }
    return undefined;
  }

  /**
   * 执行任务
   */
  private async executeTask(task: UploadTask): Promise<void> {
    if (this.isAborted) {
      return;
    }

    try {
      // 检查分片是否存在
      const checkResponse = await checkHashExists(this.config.baseUrl, this.token, task.hash, true);

      if (checkResponse.exists) {
        // 分片已存在，标记为完成
        task.state = "completed";
        this.inFlightCount--;
        this.processQueue();
        this.checkCompletion();
        return;
      }

      // 分片不存在，需要上传
      await uploadChunk(this.config.baseUrl, this.token, task.chunkData, task.hash);

      // 上传成功
      task.state = "completed";
      this.inFlightCount--;
      this.processQueue();
      this.checkCompletion();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 检查队列是否完成
   */
  private checkCompletion(): void {
    if (this.isAborted) {
      return;
    }

    // 必须满足以下条件：
    // 1. 所有分片 Hash 已完成
    // 2. 所有任务都已完成
    // 3. 没有正在执行的任务

    if (!this.allChunksHashed) {
      return;
    }

    const allCompleted = Array.from(this.tasks.values()).every(
      (task) => task.state === "completed",
    );

    if (allCompleted && this.inFlightCount === 0) {
      this.emitter.emit("queueDrained", {} as QueueDrainedEvent);
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: Error): void {
    if (this.isAborted) {
      return;
    }

    this.isAborted = true;
    this.emitter.emit("queueAborted", { error } as QueueAbortedEvent);
  }

  /**
   * 中止队列
   */
  abort(): void {
    if (this.isAborted) {
      return;
    }

    this.isAborted = true;
  }

  /**
   * 获取队列统计信息
   */
  getStats(): {
    total: number;
    completed: number;
    pending: number;
    inFlight: number;
    failed: number;
  } {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.state === "completed").length,
      pending: tasks.filter((t) => t.state === "pending").length,
      inFlight: tasks.filter((t) => t.state === "inFlight").length,
      failed: tasks.filter((t) => t.state === "failed").length,
    };
  }
}
