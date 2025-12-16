# 快速开始

本文档将帮助你快速上手 wl-upload，从安装到基本使用，让你在几分钟内开始使用大文件分片上传功能。

## 安装

### 使用 npm

```bash
npm install wl-upload
```

### 使用 pnpm（推荐）

```bash
pnpm add wl-upload
```

### 使用 yarn

```bash
yarn add wl-upload
```

## 基本使用

### 最简单的示例

```typescript
import { FileUploader } from 'wl-upload'

// 创建上传器实例
const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024, // 2MB 分片大小
    concurrency: 3, // 并发上传数
    baseUrl: 'https://api.example.com', // 服务端 API 地址
  },
})

// 选择文件并上传
const fileInput = document.querySelector('input[type="file"]')
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0]
  if (!file) return

  try {
    // 开始上传
    const result = await uploader.upload(file)
    console.log('上传成功，文件 URL:', result.url)
  } catch (error) {
    console.error('上传失败:', error)
  }
})
```

### 监听上传进度

```typescript
const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024,
    concurrency: 3,
    baseUrl: 'https://api.example.com',
  },
  onProgress: (progress) => {
    const { chunksHashed, chunksUploaded, totalChunks } = progress
    const hashProgress = (chunksHashed / totalChunks) * 50 // Hash 计算占 50%
    const uploadProgress = (chunksUploaded / totalChunks) * 50 // 上传占 50%
    const totalProgress = hashProgress + uploadProgress

    console.log(`上传进度: ${totalProgress.toFixed(2)}%`)
    console.log(`Hash 计算: ${chunksHashed}/${totalChunks}`)
    console.log(`分片上传: ${chunksUploaded}/${totalChunks}`)
  },
})

await uploader.upload(file)
```

### 处理上传状态

```typescript
const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024,
    concurrency: 3,
    baseUrl: 'https://api.example.com',
  },
  onStatusChange: (status) => {
    console.log('上传状态:', status)
    // status 可能的值: 'idle' | 'uploading' | 'completed' | 'failed'
  },
})

await uploader.upload(file)
```

## 配置说明

### 核心配置项

#### chunkSize（分片大小）

- **类型**：`number`
- **默认值**：`2 * 1024 * 1024` (2MB)
- **说明**：每个分片的大小（字节）。文件会按照此大小切割成多个分片。
- **建议值**：
  - 小文件（< 100MB）：1MB - 2MB
  - 中等文件（100MB - 1GB）：2MB - 5MB
  - 大文件（> 1GB）：5MB - 10MB

```typescript
const uploader = new FileUploader({
  config: {
    chunkSize: 5 * 1024 * 1024, // 5MB 分片
    // ...
  },
})
```

#### concurrency（并发数）

- **类型**：`number`
- **默认值**：`3`
- **说明**：同时上传的分片数量。较大的值可以提升上传速度，但会增加服务器负载和网络带宽占用。
- **建议值**：
  - 网络良好：3 - 5
  - 网络一般：2 - 3
  - 网络较差：1 - 2

```typescript
const uploader = new FileUploader({
  config: {
    concurrency: 5, // 同时上传 5 个分片
    // ...
  },
})
```

#### baseUrl（服务端地址）

- **类型**：`string`
- **必填**：是
- **说明**：服务端 API 的基础地址。所有 API 请求会基于此地址。

```typescript
const uploader = new FileUploader({
  config: {
    baseUrl: 'https://api.example.com',
    // ...
  },
})
```

#### enableMultiThreading（启用多线程）

- **类型**：`boolean`
- **默认值**：`true`
- **说明**：是否启用多线程 Hash 计算。启用后会使用 Worker 线程池并行计算分片 Hash，显著提升计算速度。
- **使用场景**：
  - `true`（默认）：大文件上传，追求最佳性能
  - `false`：资源受限环境、调试场景、小文件上传

```typescript
// 启用多线程（默认）
const uploader = new FileUploader({
  config: {
    enableMultiThreading: true, // 默认值，可省略
    // ...
  },
})

// 禁用多线程（单线程模式）
const uploader = new FileUploader({
  config: {
    enableMultiThreading: false, // 使用单 Worker 串行计算
    // ...
  },
})
```

### 完整配置示例

```typescript
const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024, // 2MB 分片
    concurrency: 3, // 并发上传 3 个分片
    baseUrl: 'https://api.example.com', // 服务端地址
    enableMultiThreading: true, // 启用多线程 Hash 计算
  },
  onProgress: (progress) => {
    // 进度回调
  },
  onStatusChange: (status) => {
    // 状态变更回调
  },
})
```

## API 概览

### FileUploader 类

#### 构造函数

```typescript
new FileUploader(options: UploaderOptions)
```

**参数**：

- `options.config`：配置对象
- `options.onProgress`：进度回调函数（可选）
- `options.onStatusChange`：状态变更回调函数（可选）

#### upload(file: File)

开始上传文件。

**参数**：

- `file`：要上传的文件对象（File）

**返回值**：`Promise<UploadResult>`

**UploadResult**：

```typescript
interface UploadResult {
  url: string // 上传完成后的文件 URL
}
```

**示例**：

```typescript
const result = await uploader.upload(file)
console.log('文件 URL:', result.url)
```

#### abort()

中止当前上传。

**示例**：

```typescript
uploader.abort()
```

#### on(event: string, callback: Function)

监听事件。

**事件类型**：

- `'chunkHashed'`：单个分片 Hash 完成
- `'allChunksHashed'`：所有分片 Hash 完成
- `'fileHashed'`：文件 Hash 完成
- `'queueDrained'`：上传队列全部完成
- `'queueAborted'`：上传失败

**示例**：

```typescript
uploader.on('chunkHashed', (event) => {
  console.log('分片 Hash 完成:', event.chunkIndex)
})

uploader.on('queueAborted', (event) => {
  console.error('上传失败:', event.error)
})
```

## 服务端要求

使用 wl-upload 需要服务端实现以下 4 个 API 接口：

1. **POST /file/create**：创建上传会话
2. **POST /file/patchHash**：检查分块/文件是否存在
3. **POST /file/uploadChunk**：上传分块
4. **POST /file/merge**：合并文件

详细的 API 规范请参考 [服务端 API 文档](../../server-docs/API.md)。

## 浏览器兼容性

### Worker 支持

- Chrome/Edge：✅ 支持
- Firefox：✅ 支持
- Safari：✅ 支持
- IE：❌ 不支持（不兼容 IE）

### 多线程支持

- `navigator.hardwareConcurrency`：Chrome 37+、Firefox 48+、Safari 10.1+
- 不支持时会自动降级到默认值（4 个 Worker）
