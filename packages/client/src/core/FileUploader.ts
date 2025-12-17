/**
 * FileUploader
 * 主上传器类，整合 WorkerManager、UploadQueue、ChunkProcessor
 */

import type { FileInfo, UploadStatus } from "@wl-upload/shared";
import mitt from "mitt";
import type { FileUploaderOptions } from "../types/config";
import type { EventMap } from "../types/events";
import type { FileChunk } from "../utils/file";
import { ChunkProcessor } from "./ChunkProcessor";
import { createFileSession, mergeFile, UploadQueue } from "./UploadQueue";
import { WorkerManager } from "./WorkerManager";

/**
 * FileUploader 类
 */
export class FileUploader {
  private options: FileUploaderOptions;
  private emitter: ReturnType<typeof mitt<EventMap>>;
  private workerManager: WorkerManager;
  private uploadQueue: UploadQueue | null = null;
  private chunkProcessor: ChunkProcessor;
  private status: UploadStatus = "idle";
  private token: string | null = null;
  private fileHash: string | null = null;
  private isMerged = false;
  private chunks: FileChunk[] = [];
  private chunkHashes: Map<number, string> = new Map();
  private resolvePromise: ((url: string) => void) | null = null;
  private rejectPromise: ((error: Error) => void) | null = null;
  private originalFileName: string | null = null;

  constructor(options: FileUploaderOptions) {
    this.options = options;
    this.emitter = mitt<EventMap>();

    // 初始化各个组件
    this.workerManager = new WorkerManager({
      enableMultiThreading: this.options.config.enableMultiThreading ?? true,
      emitter: this.emitter,
    });

    this.chunkProcessor = new ChunkProcessor({
      chunkSize: this.options.config.chunkSize ?? 5 * 1024 * 1024, // 5MB
    });

    // 绑定事件处理
    this.setupEventHandlers();
  }

  /**
   * 设置事件处理
   */
  private setupEventHandlers(): void {
    // 监听文件Hash计算完成事件
    this.emitter.on("fileHashed", (event) => {
      this.fileHash = event.fileHash;
    });

    // 监听分片Hash计算完成事件，保存Hash映射
    this.emitter.on("chunkHashed", (event) => {
      this.chunkHashes.set(event.chunkIndex, event.hash);
    });

    // 监听队列完成事件，触发文件合并
    this.emitter.on("queueDrained", () => {
      void this.handleQueueDrained();
    });

    // 监听队列中止事件
    this.emitter.on("queueAborted", (event) => {
      this.handleQueueAborted(event);
    });
  }

  /**
   * 验证文件
   */
  async validateFile(file: File): Promise<boolean> {
    if (!file) {
      return false;
    }

    if (file.size === 0) {
      return false;
    }

    return true;
  }

  /**
   * 开始上传
   */
  async upload(file: File): Promise<string> {
    // 验证文件
    const isValid = await this.validateFile(file);
    if (!isValid) {
      throw new Error("Invalid file");
    }

    // 保存原始文件名
    this.originalFileName = file.name;

    // 更新状态
    this.setStatus("uploading");

    // 重置状态（保留文件名）
    this.resetState(false);

    try {
      // 创建上传会话
      await this.createUploadSession(file);

      // 初始化上传队列（需要 token）
      if (!this.token) {
        throw new Error("Failed to get upload token");
      }
      this.uploadQueue = new UploadQueue({
        config: this.options.config,
        emitter: this.emitter,
        token: this.token,
      });

      // 处理分片
      const chunks = await this.chunkProcessor.processFile(file);
      this.chunks = chunks;

      // 更新进度信息
      this.updateProgress();

      // 等待上传完成
      return new Promise<string>((resolve, reject) => {
        this.resolvePromise = resolve;
        this.rejectPromise = reject;

        // 开始 Hash 计算
        this.workerManager.processChunks(chunks.map((c) => c.data));
      });
    } catch (error) {
      this.setStatus("failed");
      throw error;
    }
  }

  /**
   * 创建上传会话
   */
  private async createUploadSession(file: File): Promise<void> {
    const fileInfo: FileInfo = {
      name: file.name,
      type: file.type,
      size: file.size,
    };

    const response = await createFileSession(this.options.config.baseUrl, {
      fileName: fileInfo.name,
      fileType: fileInfo.type,
      fileSize: fileInfo.size,
      chunksLength: Math.ceil(file.size / (this.options.config.chunkSize ?? 5 * 1024 * 1024)),
    });

    this.token = response.token;
  }

  /**
   * 处理队列完成
   */
  private async handleQueueDrained(): Promise<void> {
    if (this.isMerged || !this.resolvePromise) {
      return;
    }

    try {
      await this.mergeFile();
    } catch (error) {
      if (this.rejectPromise) {
        this.rejectPromise(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * 处理队列中止
   */
  private handleQueueAborted(event: EventMap["queueAborted"]): void {
    this.workerManager.abort();
    this.setStatus("failed");

    if (this.rejectPromise) {
      this.rejectPromise(event.error);
    }
  }

  /**
   * 合并文件
   */
  private async mergeFile(): Promise<void> {
    if (!this.token || !this.resolvePromise) {
      throw new Error("Missing token or resolver");
    }

    // 构建分片信息
    const chunks = Array.from(this.chunkHashes.entries()).map(([index, hash]) => ({
      index,
      hash,
    }));

    // 如果没有文件 Hash，使用空字符串
    const finalFileHash = this.fileHash || "";

    const response = await mergeFile(this.options.config.baseUrl, {
      token: this.token,
      fileHash: finalFileHash,
      fileName: this.originalFileName || "unknown",
      chunksLength: this.chunks.length,
      chunks,
    });

    this.isMerged = true;
    this.setStatus("completed");

    // 返回文件 URL
    this.resolvePromise(response.url);

    // 更新进度
    this.updateProgress();
  }

  /**
   * 更新进度
   */
  private updateProgress(): void {
    if (this.options.onProgress) {
      const chunksHashed = this.chunkHashes.size;
      const totalChunks = this.chunks.length;

      // 从 UploadQueue 获取上传进度（如果存在）
      const stats = this.uploadQueue?.getStats();
      const chunksUploaded = stats?.completed || 0;

      this.options.onProgress({
        chunksHashed,
        chunksUploaded,
        totalChunks,
      });
    }
  }

  /**
   * 设置状态
   */
  private setStatus(status: UploadStatus): void {
    this.status = status;
    if (this.options.onStatusChange) {
      this.options.onStatusChange(status);
    }
  }

  /**
   * 重置状态
   */
  private resetState(resetFileName: boolean = true): void {
    if (resetFileName) {
      this.originalFileName = null;
    }
    this.token = null;
    this.fileHash = null;
    this.isMerged = false;
    this.chunks = [];
    this.chunkHashes.clear();
    this.resolvePromise = null;
    this.rejectPromise = null;
    this.workerManager.abort();
    if (this.uploadQueue) {
      this.uploadQueue.abort();
    }
  }

  /**
   * 中止上传
   */
  abort(): void {
    this.resetState();
    this.setStatus("failed");

    if (this.rejectPromise) {
      this.rejectPromise(new Error("Upload aborted"));
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): UploadStatus {
    return this.status;
  }
}
