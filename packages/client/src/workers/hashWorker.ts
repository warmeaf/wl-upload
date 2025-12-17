/**
 * Hash Worker
 * 在 Worker 线程中计算分片 Hash 和文件 Hash
 */

import { calculateChunkHash, createFileHasher } from "../utils/hash";

/**
 * Worker 消息类型定义
 */

/**
 * 计算分片 Hash 的消息
 */
interface ChunkHashMessage {
  type: "hashChunk";
  chunkIndex: number;
  chunkData: ArrayBuffer;
}

/**
 * 计算文件 Hash 的消息（单线程模式）
 */
interface FileHashMessage {
  type: "hashFile";
  chunks: ArrayBuffer[];
}

/**
 * 分片 Hash 完成的消息
 */
interface ChunkHashedMessage {
  type: "chunkHashed";
  chunkIndex: number;
  hash: string;
  chunkData: ArrayBuffer;
}

/**
 * 文件 Hash 完成的消息
 */
interface FileHashedMessage {
  type: "fileHashed";
  fileHash: string;
}

/**
 * 错误消息
 */
interface ErrorMessage {
  type: "error";
  error: string;
}

type WorkerMessage = ChunkHashMessage | FileHashMessage;

/**
 * 处理 Worker 消息
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  try {
    const message = event.data;

    if (message.type === "hashChunk") {
      const hash = calculateChunkHash(message.chunkData);

      const response: ChunkHashedMessage = {
        type: "chunkHashed",
        chunkIndex: message.chunkIndex,
        hash,
        chunkData: message.chunkData,
      };

      self.postMessage(response);
    } else if (message.type === "hashFile") {
      const hasher = createFileHasher();

      for (const chunk of message.chunks) {
        hasher.append(chunk);
      }

      const fileHash = hasher.end();

      const response: FileHashedMessage = {
        type: "fileHashed",
        fileHash,
      };

      self.postMessage(response);
    } else {
      const unknownMessage = message as { type?: string };
      throw new Error(`Unknown message type: ${unknownMessage.type || "undefined"}`);
    }
  } catch (error) {
    const errorResponse: ErrorMessage = {
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    };

    self.postMessage(errorResponse);
  }
};
