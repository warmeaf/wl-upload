/**
 * 文件处理工具
 * 实现文件校验、分片切割等功能
 */

/**
 * 文件分片数据
 */
export interface FileChunk {
  /** 分片索引 */
  index: number;
  /** 分片数据 */
  data: ArrayBuffer;
}

/**
 * 校验文件是否有效
 * @param file - 要校验的文件对象
 * @throws 如果文件无效（null、undefined 或大小为 0）
 */
export function validateFile(file: File): void {
  if (!file) {
    throw new Error("File is required");
  }

  if (file.size === 0) {
    throw new Error("File size must be greater than 0");
  }
}

/**
 * 计算文件需要分割的分片数量
 * @param fileSize - 文件大小（字节）
 * @param chunkSize - 分片大小（字节）
 * @returns 分片数量
 */
export function calculateChunkCount(fileSize: number, chunkSize: number): number {
  if (fileSize <= 0) {
    return 0;
  }

  if (chunkSize <= 0) {
    throw new Error("Chunk size must be greater than 0");
  }

  return Math.ceil(fileSize / chunkSize);
}

/**
 * 将文件分割成多个分片
 * @param file - 要分割的文件
 * @param chunkSize - 每个分片的大小（字节）
 * @returns Promise 解析为分片数组
 */
export async function splitFileIntoChunks(file: File, chunkSize: number): Promise<FileChunk[]> {
  if (chunkSize <= 0) {
    throw new Error("Chunk size must be greater than 0");
  }

  const chunks: FileChunk[] = [];
  const totalChunks = calculateChunkCount(file.size, chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);

    const blob = file.slice(start, end);
    const arrayBuffer = await blob.arrayBuffer();

    chunks.push({
      index: i,
      data: arrayBuffer,
    });
  }

  return chunks;
}
