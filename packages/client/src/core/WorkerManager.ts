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
 * 默认 Worker 数量
 * 当无法获取硬件并发数时使用此值
 */
const DEFAULT_WORKER_COUNT = 4;

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
 *
 * 由于多个 Worker 并行处理分片，结果可能乱序返回。
 * 此类使用缓冲机制，确保分片哈希结果按照索引顺序依次发出。
 *
 * 工作原理：
 * 1. 接收任意索引的分片结果并存入缓冲区
 * 2. 检查是否已收到下一个期望索引的结果
 * 3. 如果收到，立即发出并继续检查下一个索引
 * 4. 重复步骤 2-3 直到没有连续的结果可发出
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

  /**
   * 添加分片结果到缓冲区
   * @param index - 分片索引
   * @param event - 分片哈希事件
   */
  add(index: number, event: ChunkHashedEvent): void {
    this.buffer.set(index, event);
    this.flush();
  }

  /**
   * 刷新缓冲区，按顺序发出连续的分片结果
   *
   * 从 nextExpectedIndex 开始，检查缓冲区中是否有连续的结果。
   * 如果存在，则按顺序发出，直到遇到缺失的索引为止。
   */
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
   *
   * 根据配置决定创建单个或多个 Worker：
   * - 多线程模式：根据硬件并发数创建多个 Worker（至少 1 个）
   * - 单线程模式：仅创建 1 个 Worker
   */
  private createWorkers(): void {
    const workerCount = this.config.enableMultiThreading
      ? Math.max(1, navigator.hardwareConcurrency || DEFAULT_WORKER_COUNT)
      : 1;

    for (let workerIndex = 0; workerIndex < workerCount; workerIndex++) {
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
   *
   * 配置 Worker 的消息和错误处理回调
   */
  private setupWorker(worker: Worker): void {
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (this.isAborted) {
        return;
      }

      this.handleWorkerMessage(event.data, worker);
    };

    worker.onerror = (error) => {
      this.handleError(new Error(`Worker error: ${error.message || "Unknown error"}`));
    };
  }

  /**
   * 处理 Worker 返回的消息
   *
   * 根据消息类型分发到相应的处理逻辑：
   * - error: 错误消息，触发错误处理
   * - chunkHashed: 分片哈希完成，根据模式处理
   * - fileHashed: 文件哈希完成（仅单线程模式）
   *
   * @param response - Worker 响应消息
   * @param worker - 发送消息的 Worker 实例
   */
  private handleWorkerMessage(response: WorkerResponse, worker: Worker): void {
    if (response.type === "error") {
      this.handleError(new Error(response.error || "Unknown worker error"));
      return;
    }

    if (response.type === "chunkHashed" && response.chunkIndex !== undefined && response.hash) {
      this.handleChunkHashed(response, worker);
      return;
    }

    if (response.type === "fileHashed" && response.fileHash) {
      this.handleFileHashed(response);
      return;
    }
  }

  /**
   * 处理分片哈希完成的消息
   *
   * 多线程模式：将结果添加到 ResultBuffer 进行排序
   * 单线程模式：直接发出事件，并在所有分片完成后请求文件哈希
   *
   * @param response - 包含分片哈希信息的响应
   * @param worker - Worker 实例（用于单线程模式的文件哈希请求）
   */
  private handleChunkHashed(response: WorkerResponse, worker: Worker): void {
    if (response.chunkIndex === undefined || !response.hash) {
      return;
    }

    this.processedChunkCount++;

    const chunkIndex = response.chunkIndex;
    const chunkEvent: ChunkHashedEvent = {
      chunkIndex,
      hash: response.hash,
      chunkData: response.chunkData || this.chunks[chunkIndex],
    };

    if (this.config.enableMultiThreading) {
      this.resultBuffer?.add(chunkIndex, chunkEvent);
    } else {
      this.config.emitter.emit("chunkHashed", chunkEvent);

      if (this.processedChunkCount >= this.chunks.length) {
        this.config.emitter.emit("allChunksHashed", {} as AllChunksHashedEvent);
        this.requestFileHash(worker);
      }
    }
  }

  /**
   * 处理文件哈希完成的消息（仅单线程模式）
   *
   * @param response - 包含文件哈希信息的响应
   */
  private handleFileHashed(response: WorkerResponse): void {
    if (!this.config.enableMultiThreading && response.fileHash) {
      this.config.emitter.emit("fileHashed", {
        fileHash: response.fileHash,
      } as FileHashedEvent);
    }
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
   *
   * 根据模式采用不同的分发策略：
   * - 多线程模式：使用轮询方式将任务分配给多个 Worker，实现负载均衡
   * - 单线程模式：将所有任务分配给单个 Worker 顺序处理
   */
  private distributeTasks(): void {
    if (this.config.enableMultiThreading) {
      this.distributeTasksToMultipleWorkers();
    } else {
      this.distributeTasksToSingleWorker();
    }
  }

  /**
   * 将任务分发到多个 Worker（多线程模式）
   *
   * 使用轮询算法将分片任务均匀分配给所有 Worker
   */
  private distributeTasksToMultipleWorkers(): void {
    let workerIndex = 0;
    for (let chunkIndex = 0; chunkIndex < this.chunks.length; chunkIndex++) {
      // 使用取模运算实现轮询分配
      const worker = this.workers[workerIndex % this.workers.length];
      const message: WorkerMessage = {
        type: "hashChunk",
        chunkIndex,
        chunkData: this.chunks[chunkIndex],
      };
      worker.postMessage(message);
      workerIndex++;
    }
  }

  /**
   * 将任务分发到单个 Worker（单线程模式）
   *
   * 将所有分片任务按顺序分配给第一个 Worker
   */
  private distributeTasksToSingleWorker(): void {
    const worker = this.workers[0];
    for (let chunkIndex = 0; chunkIndex < this.chunks.length; chunkIndex++) {
      const message: WorkerMessage = {
        type: "hashChunk",
        chunkIndex,
        chunkData: this.chunks[chunkIndex],
      };
      worker.postMessage(message);
    }
  }

  /**
   * 处理错误
   *
   * 当 Worker 发生错误时：
   * 1. 如果已中止，则忽略错误
   * 2. 否则设置中止标志，发出错误事件，并清理所有资源
   *
   * @param error - 错误对象
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
