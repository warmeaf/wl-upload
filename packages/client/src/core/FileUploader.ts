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

    this.workerManager = new WorkerManager({
      enableMultiThreading: this.options.config.enableMultiThreading ?? true,
      emitter: this.emitter,
    });

    this.chunkProcessor = new ChunkProcessor({
      chunkSize: this.options.config.chunkSize ?? 5 * 1024 * 1024,
    });

    this.setupEventHandlers();
  }

  /**
   * 设置事件处理
   */
  private setupEventHandlers(): void {
    this.emitter.on("fileHashed", (event) => {
      this.fileHash = event.fileHash;
    });

    this.emitter.on("chunkHashed", (event) => {
      this.chunkHashes.set(event.chunkIndex, event.hash);
    });

    this.emitter.on("queueDrained", () => {
      void this.handleQueueDrained();
    });

    this.emitter.on("queueAborted", (event) => {
      this.handleQueueAborted(event);
    });

    this.emitter.on("chunkUploaded", () => {
      this.updateProgress();
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
    const isValid = await this.validateFile(file);
    if (!isValid) {
      throw new Error("Invalid file");
    }

    this.originalFileName = file.name;

    this.setStatus("uploading");

    this.resetState(false);

    try {
      await this.createUploadSession(file);

      if (!this.token) {
        throw new Error("Failed to get upload token");
      }
      this.uploadQueue = new UploadQueue({
        config: this.options.config,
        emitter: this.emitter,
        token: this.token,
      });

      const chunks = await this.chunkProcessor.processFile(file);
      this.chunks = chunks;

      this.updateProgress();

      return new Promise<string>((resolve, reject) => {
        this.resolvePromise = resolve;
        this.rejectPromise = reject;

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

    const chunks = Array.from(this.chunkHashes.entries()).map(([index, hash]) => ({
      index,
      hash,
    }));

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

    if (this.resolvePromise) {
      this.resolvePromise(response.url);
      this.resolvePromise = null;
    }

    this.updateProgress();
  }

  /**
   * 更新进度
   */
  private updateProgress(): void {
    if (this.options.onProgress) {
      const chunksHashed = this.chunkHashes.size;
      const totalChunks = this.chunks.length;

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
