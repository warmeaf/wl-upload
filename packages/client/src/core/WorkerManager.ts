/**
 * WorkerManager
 * 管理 Worker 线程池，处理 Hash 计算任务分配和结果排序
 */

import type { Emitter } from "mitt";
import type {
  AllChunksHashedEvent,
  ChunkHashedEvent,
  EventMap,
  FileHashedEvent,
  QueueAbortedEvent,
} from "../types/events";
import { createFileHasher } from "../utils/hash";
import HashWorker from "../workers/hashWorker.ts?worker";

/**
 * Worker 工厂函数
 * 可以被测试环境覆盖
 */
let createWorker: () => Worker = () => {
  return new HashWorker();
};

/**
 * 设置 Worker 工厂函数（用于测试）
 */
export function setWorkerFactory(factory: () => Worker): void {
  createWorker = factory;
}

/**
 * WorkerManager 配置
 */
export interface WorkerManagerConfig {
  /** 是否启用多线程，默认 true */
  enableMultiThreading?: boolean;
  /** 事件发射器 */
  emitter: Emitter<EventMap>;
}

/**
 * Worker 消息类型
 */
interface WorkerMessage {
  type: "hashChunk" | "hashFile";
  chunkIndex?: number;
  chunkData?: ArrayBuffer;
  chunks?: ArrayBuffer[];
}

/**
 * Worker 响应类型
 */
interface WorkerResponse {
  type: "chunkHashed" | "fileHashed" | "error";
  chunkIndex?: number;
  hash?: string;
  chunkData?: ArrayBuffer;
  fileHash?: string;
  error?: string;
}

/**
 * ResultBuffer 用于保证结果按顺序发出
 */
class ResultBuffer {
  private buffer: Map<number, ChunkHashedEvent> = new Map();
  private nextExpectedIndex = 0;
  private totalChunks: number;
  private onChunkReady: (event: ChunkHashedEvent) => void;
  private onAllReady: () => void;

  constructor(
    totalChunks: number,
    onChunkReady: (event: ChunkHashedEvent) => void,
    onAllReady: () => void,
  ) {
    this.totalChunks = totalChunks;
    this.onChunkReady = onChunkReady;
    this.onAllReady = onAllReady;
  }

  add(index: number, event: ChunkHashedEvent): void {
    this.buffer.set(index, event);
    this.flush();
  }

  private flush(): void {
    while (this.buffer.has(this.nextExpectedIndex)) {
      const event = this.buffer.get(this.nextExpectedIndex);
      if (!event) break;

      this.buffer.delete(this.nextExpectedIndex);
      this.onChunkReady(event);
      this.nextExpectedIndex++;

      if (this.nextExpectedIndex >= this.totalChunks) {
        this.onAllReady();
        break;
      }
    }
  }
}

/**
 * WorkerManager 类
 */
export class WorkerManager {
  private config: Required<WorkerManagerConfig>;
  private workers: Worker[] = [];
  private isAborted = false;
  private chunks: ArrayBuffer[] = [];
  private fileHasher = createFileHasher();
  private resultBuffer: ResultBuffer | null = null;
  private processedChunkCount = 0;

  constructor(config: WorkerManagerConfig) {
    this.config = {
      enableMultiThreading: config.enableMultiThreading ?? true,
      emitter: config.emitter,
    };
  }

  /**
   * 处理分片数组
   * @param chunks - 分片数组
   */
  processChunks(chunks: ArrayBuffer[]): void {
    this.isAborted = false;

    this.chunks = chunks;
    this.processedChunkCount = 0;

    if (chunks.length === 0) {
      this.config.emitter.emit("allChunksHashed", {} as AllChunksHashedEvent);
      return;
    }

    this.resultBuffer = new ResultBuffer(
      chunks.length,
      (event) => {
        if (!this.isAborted) {
          this.config.emitter.emit("chunkHashed", event);

          if (this.config.enableMultiThreading) {
            this.fileHasher.append(event.chunkData);
          }
        }
      },
      () => {
        if (!this.isAborted) {
          this.config.emitter.emit("allChunksHashed", {} as AllChunksHashedEvent);

          if (this.config.enableMultiThreading) {
            const fileHash = this.fileHasher.end();
            this.config.emitter.emit("fileHashed", { fileHash } as FileHashedEvent);
          }
        }
      },
    );

    this.createWorkers();

    this.distributeTasks();
  }

  /**
   * 创建 Worker 实例
   */
  private createWorkers(): void {
    const workerCount = this.config.enableMultiThreading
      ? Math.max(1, navigator.hardwareConcurrency || 4)
      : 1;

    for (let i = 0; i < workerCount; i++) {
      try {
        const worker = createWorker();
        this.setupWorker(worker);
        this.workers.push(worker);
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
        return;
      }
    }
  }

  /**
   * 设置 Worker 消息处理
   */
  private setupWorker(worker: Worker): void {
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (this.isAborted) {
        return;
      }

      const response = event.data;

      if (response.type === "error") {
        this.handleError(new Error(response.error || "Unknown worker error"));
        return;
      }

      if (response.type === "chunkHashed" && response.chunkIndex !== undefined && response.hash) {
        this.processedChunkCount++;

        const chunkEvent: ChunkHashedEvent = {
          chunkIndex: response.chunkIndex,
          hash: response.hash,
          chunkData: response.chunkData || this.chunks[response.chunkIndex],
        };

        if (this.config.enableMultiThreading) {
          this.resultBuffer?.add(response.chunkIndex, chunkEvent);
        } else {
          this.config.emitter.emit("chunkHashed", chunkEvent);

          if (this.processedChunkCount >= this.chunks.length) {
            this.config.emitter.emit("allChunksHashed", {} as AllChunksHashedEvent);

            this.requestFileHash(worker);
          }
        }
      } else if (response.type === "fileHashed" && response.fileHash) {
        if (!this.config.enableMultiThreading) {
          this.config.emitter.emit("fileHashed", {
            fileHash: response.fileHash,
          } as FileHashedEvent);
        }
      }
    };

    worker.onerror = (error) => {
      this.handleError(new Error(`Worker error: ${error.message || "Unknown error"}`));
    };
  }

  /**
   * 请求 Worker 计算文件 Hash（单线程模式）
   */
  private requestFileHash(worker: Worker): void {
    const message: WorkerMessage = {
      type: "hashFile",
      chunks: this.chunks,
    };
    worker.postMessage(message);
  }

  /**
   * 分发任务到 Worker
   */
  private distributeTasks(): void {
    if (this.config.enableMultiThreading) {
      let workerIndex = 0;
      for (let i = 0; i < this.chunks.length; i++) {
        const worker = this.workers[workerIndex % this.workers.length];
        const message: WorkerMessage = {
          type: "hashChunk",
          chunkIndex: i,
          chunkData: this.chunks[i],
        };
        worker.postMessage(message);
        workerIndex++;
      }
    } else {
      const worker = this.workers[0];
      for (let i = 0; i < this.chunks.length; i++) {
        const message: WorkerMessage = {
          type: "hashChunk",
          chunkIndex: i,
          chunkData: this.chunks[i],
        };
        worker.postMessage(message);
      }
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
    this.config.emitter.emit("queueAborted", { error } as QueueAbortedEvent);
    this.cleanup();
  }

  /**
   * 中止处理
   */
  abort(): void {
    if (this.isAborted) {
      return;
    }

    this.isAborted = true;
    this.cleanup();
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    for (const worker of this.workers) {
      try {
        worker.terminate();
      } catch {}
    }
    this.workers = [];
    this.resultBuffer = null;
    this.fileHasher = createFileHasher();
  }
}
