/**
 * Hash 计算工具
 * 使用 SparkMD5 实现文件和分片 Hash 计算
 */

import SparkMD5 from "spark-md5";

/**
 * 计算单个分片的 MD5 Hash
 * @param chunk - 分片的 ArrayBuffer 数据
 * @returns 十六进制字符串格式的 MD5 Hash（小写）
 */
export function calculateChunkHash(chunk: ArrayBuffer): string {
  return SparkMD5.ArrayBuffer.hash(chunk);
}

/**
 * 文件 Hash 计算器接口
 */
export interface FileHasher {
  /**
   * 追加分片数据到 Hash 计算器
   * @param chunk - 分片的 ArrayBuffer 数据
   */
  append(chunk: ArrayBuffer): void;

  /**
   * 完成 Hash 计算并返回结果
   * @returns 十六进制字符串格式的 MD5 Hash（小写）
   */
  end(): string;
}

/**
 * 创建文件 Hash 计算器
 * 用于增量计算多个分片的文件 Hash
 * @returns FileHasher 实例
 */
export function createFileHasher(): FileHasher {
  const spark = new SparkMD5.ArrayBuffer();

  return {
    append(chunk: ArrayBuffer): void {
      spark.append(chunk);
    },
    end(): string {
      return spark.end();
    },
  };
}
