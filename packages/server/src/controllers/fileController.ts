/**
 * FileController
 * 实现 API 请求处理逻辑，调用服务层
 */

import type {
  ApiErrorResponse,
  CreateFileRequest,
  CreateFileResponse,
  MergeFileRequest,
  MergeFileResponse,
  PatchHashRequest,
  PatchHashResponse,
  UploadChunkResponse,
} from "@wl-upload/shared";
import { ErrorCodes } from "@wl-upload/shared";
import type { Context } from "hono";
import * as ChunkService from "../services/chunkService";
import * as FileService from "../services/fileService";

/**
 * 创建文件会话
 * POST /file/create
 */
export async function createFile(ctx: Context): Promise<Response> {
  try {
    const body = await ctx.req.json<CreateFileRequest>();

    if (
      !body.fileName ||
      !body.fileType ||
      typeof body.fileSize !== "number" ||
      typeof body.chunksLength !== "number" ||
      body.fileSize <= 0 ||
      body.chunksLength <= 0
    ) {
      return ctx.json<ApiErrorResponse>(
        {
          code: 400,
          message: "Invalid request body",
        },
        400,
      );
    }

    const result = await FileService.createFileSession({
      fileName: body.fileName,
      fileType: body.fileType,
      fileSize: body.fileSize,
      chunksLength: body.chunksLength,
    });

    return ctx.json<CreateFileResponse>({
      code: ErrorCodes.SUCCESS,
      token: result.token,
    });
  } catch (error) {
    return ctx.json<ApiErrorResponse>(
      {
        code: 500,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      500,
    );
  }
}

/**
 * 检查分片/文件哈希是否存在
 * POST /file/patchHash
 */
export async function patchHash(ctx: Context): Promise<Response> {
  try {
    const body = await ctx.req.json<PatchHashRequest>();

    if (!body.token || !body.hash || typeof body.isChunk !== "boolean") {
      return ctx.json<ApiErrorResponse>(
        {
          code: 400,
          message: "Invalid request body",
        },
        400,
      );
    }

    const fileDoc = await FileService.getFileByToken(body.token);
    if (!fileDoc) {
      return ctx.json<ApiErrorResponse>(
        {
          code: ErrorCodes.INVALID_TOKEN,
          message: "Invalid token",
        },
        401,
      );
    }

    let exists: boolean;

    if (body.isChunk) {
      exists = await ChunkService.chunkExists(body.hash);
    } else {
      exists = await FileService.fileExistsByHash(body.hash);
    }

    return ctx.json<PatchHashResponse>({
      code: ErrorCodes.SUCCESS,
      exists,
    });
  } catch (error) {
    return ctx.json<ApiErrorResponse>(
      {
        code: 500,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      500,
    );
  }
}

/**
 * 上传分片
 * POST /file/uploadChunk
 */
export async function uploadChunk(ctx: Context): Promise<Response> {
  try {
    const formData = await ctx.req.formData();

    const token = formData.get("token");
    const chunk = formData.get("chunk");
    const hash = formData.get("hash");

    if (!token || !chunk || !hash) {
      return ctx.json<ApiErrorResponse>(
        {
          code: 400,
          message: "Missing required fields: token, chunk, hash",
        },
        400,
      );
    }

    if (typeof token !== "string" || typeof hash !== "string") {
      return ctx.json<ApiErrorResponse>(
        {
          code: 400,
          message: "Invalid field types",
        },
        400,
      );
    }

    const fileDoc = await FileService.getFileByToken(token);
    if (!fileDoc) {
      return ctx.json<ApiErrorResponse>(
        {
          code: ErrorCodes.INVALID_TOKEN,
          message: "Invalid token",
        },
        401,
      );
    }

    let chunkBuffer: Buffer;
    if (chunk instanceof File) {
      const arrayBuffer = await chunk.arrayBuffer();
      chunkBuffer = Buffer.from(arrayBuffer);
    } else if (chunk && typeof chunk === "object" && "arrayBuffer" in chunk) {
      const blobLike = chunk as { arrayBuffer(): Promise<ArrayBuffer> };
      const arrayBuffer = await blobLike.arrayBuffer();
      chunkBuffer = Buffer.from(arrayBuffer);
    } else {
      return ctx.json<ApiErrorResponse>(
        {
          code: 400,
          message: "Invalid chunk data",
        },
        400,
      );
    }

    await ChunkService.storeChunk(hash, chunkBuffer);

    return ctx.json<UploadChunkResponse>({
      code: ErrorCodes.SUCCESS,
      success: true,
    });
  } catch (error) {
    return ctx.json<ApiErrorResponse>(
      {
        code: ErrorCodes.UPLOAD_FAILED,
        message: error instanceof Error ? error.message : "Upload failed",
      },
      500,
    );
  }
}

/**
 * 合并文件
 * POST /file/merge
 */
export async function mergeFile(ctx: Context): Promise<Response> {
  try {
    const body = await ctx.req.json<MergeFileRequest>();

    if (
      !body.token ||
      !body.fileHash ||
      !body.fileName ||
      typeof body.chunksLength !== "number" ||
      !Array.isArray(body.chunks) ||
      body.chunksLength <= 0
    ) {
      return ctx.json<ApiErrorResponse>(
        {
          code: 400,
          message: "Invalid request body",
        },
        400,
      );
    }

    const fileDoc = await FileService.getFileByToken(body.token);
    if (!fileDoc) {
      return ctx.json<ApiErrorResponse>(
        {
          code: ErrorCodes.INVALID_TOKEN,
          message: "Invalid token",
        },
        401,
      );
    }

    const result = await FileService.mergeFile(
      body.token,
      body.fileHash,
      body.fileName,
      body.chunksLength,
      body.chunks,
    );

    return ctx.json<MergeFileResponse>({
      code: ErrorCodes.SUCCESS,
      url: result.url,
    });
  } catch (error) {
    return ctx.json<ApiErrorResponse>(
      {
        code: ErrorCodes.MERGE_FAILED,
        message: error instanceof Error ? error.message : "Merge failed",
      },
      500,
    );
  }
}
