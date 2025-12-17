# wl-upload

> 高性能大文件分片上传解决方案

基于 TypeScript 的企业级大文件上传库，支持分片上传、多线程 Hash 计算、秒传等特性，帮助开发者轻松实现稳定可靠的大文件上传功能。

## ✨ 核心特性

- 🚀 **大文件分片上传** - 自动将大文件切割成多个分片，支持断点续传
- ⚡ **多线程 Hash 计算** - 基于 Worker 线程池并行计算分片 Hash，充分利用多核 CPU
- 🔄 **并发上传控制** - 可配置的并发数，平衡上传速度和服务器负载
- ⏩ **秒传机制** - 支持分片秒传和文件秒传，避免重复上传
- 📡 **事件驱动架构** - 基于 mitt 的事件系统，灵活监听上传进度和状态
- 📘 **TypeScript 支持** - 完整的类型定义，提供优秀的开发体验
- 🎯 **零依赖核心** - 客户端核心功能无外部依赖（除 mitt 和 spark-md5）

## 📦 安装

### 使用 npm

```bash
npm install @wl-upload/client
```

### 使用 pnpm（推荐）

```bash
pnpm add @wl-upload/client
```

### 使用 yarn

```bash
yarn add @wl-upload/client
```

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0（开发环境）

## 🚀 快速开始

### 最简单的示例

```typescript
import { FileUploader } from '@wl-upload/client';

// 创建上传器实例
const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024, // 2MB 分片大小
    concurrency: 3, // 并发上传数
    baseUrl: 'https://api.example.com', // 服务端 API 地址
  },
});

// 选择文件并上传
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    // 开始上传
    const result = await uploader.upload(file);
    console.log('上传成功，文件 URL:', result.url);
  } catch (error) {
    console.error('上传失败:', error);
  }
});
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
    const { chunksHashed, chunksUploaded, totalChunks } = progress;
    const hashProgress = (chunksHashed / totalChunks) * 50; // Hash 计算占 50%
    const uploadProgress = (chunksUploaded / totalChunks) * 50; // 上传占 50%
    const totalProgress = hashProgress + uploadProgress;

    console.log(`上传进度: ${totalProgress.toFixed(2)}%`);
    console.log(`Hash 计算: ${chunksHashed}/${totalChunks}`);
    console.log(`分片上传: ${chunksUploaded}/${totalChunks}`);
  },
});

await uploader.upload(file);
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
    console.log('上传状态:', status);
    // status 可能的值: 'idle' | 'uploading' | 'completed' | 'failed'
  },
});

await uploader.upload(file);
```

### 取消上传

```typescript
// 取消当前上传
uploader.abort();
```

## ⚙️ 配置选项

### 核心配置项

#### chunkSize（分片大小）

- **类型**：`number`
- **默认值**：`2 * 1024 * 1024` (2MB)
- **说明**：每个分片的大小（字节）。文件会按照此大小切割成多个分片。
- **建议值**：
  - 小文件（< 100MB）：1MB - 2MB
  - 中等文件（100MB - 1GB）：2MB - 5MB
  - 大文件（> 1GB）：5MB - 10MB

#### concurrency（并发数）

- **类型**：`number`
- **默认值**：`3`
- **说明**：同时上传的分片数量。较大的值可以提升上传速度，但会增加服务器负载和网络带宽占用。
- **建议值**：
  - 网络良好：3 - 5
  - 网络一般：2 - 3
  - 网络较差：1 - 2

#### baseUrl（服务端地址）

- **类型**：`string`
- **必填**：是
- **说明**：服务端 API 的基础地址。所有 API 请求会基于此地址。

#### enableMultiThreading（启用多线程）

- **类型**：`boolean`
- **默认值**：`true`
- **说明**：是否启用多线程 Hash 计算。启用后会使用 Worker 线程池并行计算分片 Hash，显著提升计算速度。
- **使用场景**：
  - `true`（默认）：大文件上传，追求最佳性能
  - `false`：资源受限环境、调试场景、小文件上传

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
});
```

## 📚 API 文档

详细的 API 文档和使用指南请参考：

- [快速开始指南](docs/implementation/getting-started.md) - 详细的安装和使用教程
- [API 文档](docs/implementation/API.md) - 服务端 API 规范
- [架构设计](docs/implementation/architecture.md) - 系统架构和技术实现
- [使用示例](examples/) - 完整的使用示例代码

### 服务端要求

使用 wl-upload 需要服务端实现以下 4 个 API 接口：

1. **POST /file/create** - 创建上传会话
2. **POST /file/patchHash** - 检查分块/文件是否存在
3. **POST /file/uploadChunk** - 上传分块
4. **POST /file/merge** - 合并文件

详细的 API 规范请参考 [API 文档](docs/implementation/API.md)。

本项目提供了基于 Hono.js 和 MongoDB 的服务端参考实现，位于 `packages/server` 目录。

## 📁 项目结构

本项目采用 monorepo 架构，使用 pnpm workspace 管理：

```
wl-upload/
├── packages/
│   ├── client/          # 客户端库（核心包）
│   ├── server/          # 服务端实现（参考实现）
│   └── shared/          # 共享类型和常量
├── examples/            # 使用示例
├── docs/                # 项目文档
│   └── implementation/  # 实现文档
└── README.md            # 本文件
```

## 🛠️ 开发指南

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 启动所有包的开发模式
pnpm dev

# 启动特定包的开发模式
pnpm --filter @wl-upload/client dev
pnpm --filter @wl-upload/server dev
```

### 构建

```bash
# 构建所有包
pnpm build

# 构建特定包
pnpm --filter @wl-upload/client build
```

### 测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage

# 测试 UI
pnpm test:ui
```

### 代码检查

```bash
# 检查代码
pnpm lint

# 自动修复
pnpm lint:fix

# 格式化代码
pnpm format

# 类型检查
pnpm typecheck
```

### 运行示例

```bash
cd examples
pnpm install
pnpm dev
```

## 🌐 浏览器兼容性

### Worker 支持

- Chrome/Edge：✅ 支持
- Firefox：✅ 支持
- Safari：✅ 支持
- IE：❌ 不支持（不兼容 IE）

### 多线程支持

- `navigator.hardwareConcurrency`：Chrome 37+、Firefox 48+、Safari 10.1+
- 不支持时会自动降级到默认值（4 个 Worker）

## 📖 相关文档

- [快速开始](docs/implementation/getting-started.md)
- [API 文档](docs/implementation/API.md)
- [架构设计](docs/implementation/architecture.md)
- [使用示例](docs/implementation/usage-examples.md)
- [测试指南](docs/implementation/testing.md)
- [工程化工具](docs/implementation/engineering-tools.md)

## 📝 许可证

[MIT](LICENSE) © 2025 wl-upload

