/**
 * Token 工具
 * 实现 Token 生成和验证功能
 */

import { randomBytes } from "node:crypto";

/**
 * Token 长度（字节数）
 * 32 字节 = 64 个十六进制字符
 */
const TOKEN_BYTE_LENGTH = 32;

/**
 * Token 字符串长度（十六进制字符数）
 */
const TOKEN_STRING_LENGTH = TOKEN_BYTE_LENGTH * 2; // 64

/**
 * 生成唯一的会话 Token
 * @returns 64 个十六进制字符的 Token 字符串（小写）
 */
export function generateToken(): string {
  const bytes = randomBytes(TOKEN_BYTE_LENGTH);
  return bytes.toString("hex");
}

/**
 * 验证 Token 格式有效性
 * @param token - 要验证的 Token 字符串
 * @returns 如果 Token 格式有效返回 true，否则返回 false
 */
export function validateToken(token: string): boolean {
  if (token == null) {
    return false;
  }

  if (typeof token !== "string") {
    return false;
  }

  if (token.length !== TOKEN_STRING_LENGTH) {
    return false;
  }

  return /^[0-9a-f]{64}$/.test(token);
}
