# wl-upload 核心功能开发计划（TDD）

## TDD 开发流程

每个功能模块遵循 **Red → Green → Refactor** 循环：

1. **Red**：先编写测试用例（测试失败）
2. **Green**：实现最小功能使测试通过
3. **Refactor**：重构代码，保持测试通过

## 开发顺序

开发遵循依赖关系从底层到上层逐步实现，每个模块都遵循 **Red → Green → Refactor** 循环。

### 第一阶段：基础设施层（Foundation Layer）

#### 1.1 共享类型定义（@wl-upload/shared）
- **文件**: `packages/shared/src/types/api.ts`, `packages/shared/src/types/common.ts`
- **测试**: `packages/shared/tests/types.test.ts`
- **说明**: 定义所有 API 请求/响应类型、通用类型，为后续开发提供类型基础
- **依赖**: 无

#### 1.2 常量定义（@wl-upload/shared）
- **文件**: `packages/shared/src/constants/index.ts`
- **测试**: `packages/shared/tests/constants.test.ts`
- **说明**: 定义错误码、默认配置值等常量
- **依赖**: 无

#### 1.3 客户端类型定义（@wl-upload/client）
- **文件**: `packages/client/src/types/config.ts`, `packages/client/src/types/events.ts`, `packages/client/src/types/upload.ts`
- **测试**: `packages/client/tests/types.test.ts`
- **说明**: 定义客户端配置、事件、上传相关类型
- **依赖**: @wl-upload/shared

### 第二阶段：工具函数层（Utility Layer）

#### 2.1 Hash 计算工具（客户端）
- **文件**: `packages/client/src/utils/hash.ts`
- **测试**: `packages/client/tests/unit/utils/hash.test.ts`
- **说明**: 实现文件 Hash 和分片 Hash 计算的基础函数（使用 SparkMD5）
- **依赖**: 类型定义

#### 2.2 文件处理工具（客户端）
- **文件**: `packages/client/src/utils/file.ts`
- **测试**: `packages/client/tests/unit/utils/file.test.ts`
- **说明**: 实现文件校验、分片切割等工具函数
- **依赖**: 类型定义

#### 2.3 Token 工具（服务端）
- **文件**: `packages/server/src/utils/token.ts`
- **测试**: `packages/server/tests/unit/utils/token.test.ts`
- **说明**: 实现 Token 生成和验证功能
- **依赖**: 无

### 第三阶段：数据层（Data Layer）

#### 3.1 数据库连接（服务端）
- **文件**: `packages/server/src/db/mongodb.ts`
- **测试**: `packages/server/tests/unit/db/mongodb.test.ts`
- **说明**: 实现 MongoDB 连接和基础操作封装
- **依赖**: 无

#### 3.2 数据模型（服务端）
- **文件**: `packages/server/src/models/File.ts`, `packages/server/src/models/FileChunk.ts`
- **测试**: `packages/server/tests/unit/models/File.test.ts`, `packages/server/tests/unit/models/FileChunk.test.ts`
- **说明**: 定义文件记录和分片记录的数据模型（MongoDB Schema）
- **依赖**: 数据库连接

### 第四阶段：核心业务逻辑层（Core Business Logic Layer）

#### 4.1 Hash Worker（客户端）
- **文件**: `packages/client/src/workers/hashWorker.ts`
- **测试**: `packages/client/tests/unit/workers/hashWorker.test.ts`
- **说明**: 实现 Worker 线程中的 Hash 计算逻辑，处理分片 Hash 和文件 Hash 计算
- **依赖**: Hash 工具函数

#### 4.2 WorkerManager（客户端）
- **文件**: `packages/client/src/core/WorkerManager.ts`
- **测试**: `packages/client/tests/unit/core/WorkerManager.test.ts`
- **说明**: 实现 Worker 线程池管理，支持单线程和多线程模式，处理任务分配和结果排序
- **依赖**: Hash Worker、事件系统（mitt）

#### 4.3 分片处理器（客户端）
- **文件**: `packages/client/src/core/ChunkProcessor.ts`
- **测试**: `packages/client/tests/unit/core/ChunkProcessor.ts`
- **说明**: 实现分片切割和预处理逻辑
- **依赖**: 文件工具函数

#### 4.4 服务层 - 分片服务（服务端）
- **文件**: `packages/server/src/services/chunkService.ts`
- **测试**: `packages/server/tests/unit/services/chunkService.test.ts`
- **说明**: 实现分片存储、查询、去重等业务逻辑
- **依赖**: 数据模型

#### 4.5 服务层 - 文件服务（服务端）
- **文件**: `packages/server/src/services/fileService.ts`
- **测试**: `packages/server/tests/unit/services/fileService.test.ts`
- **说明**: 实现文件会话创建、Hash 检查、文件合并等业务逻辑
- **依赖**: 分片服务、数据模型

### 第五阶段：API 层（API Layer）

#### 5.1 上传队列（客户端）
- **文件**: `packages/client/src/core/UploadQueue.ts`
- **测试**: `packages/client/tests/unit/core/UploadQueue.test.ts`
- **说明**: 实现并发上传队列，包括任务调度、并发控制、秒传检查、失败处理
- **依赖**: 事件系统、API 请求函数（需要 mock）

#### 5.2 API 控制器（服务端）
- **文件**: `packages/server/src/controllers/fileController.ts`
- **测试**: `packages/server/tests/unit/controllers/fileController.test.ts`
- **说明**: 实现 API 请求处理逻辑，调用服务层
- **依赖**: 文件服务、分片服务

#### 5.3 API 路由（服务端）
- **文件**: `packages/server/src/routes/file.ts`
- **测试**: `packages/server/tests/integration/routes/file.test.ts`
- **说明**: 定义 4 个 API 端点：`/file/create`, `/file/patchHash`, `/file/uploadChunk`, `/file/merge`
- **依赖**: API 控制器

### 第六阶段：主入口层（Main Entry Layer）

#### 6.1 FileUploader 主类（客户端）
- **文件**: `packages/client/src/core/FileUploader.ts`
- **测试**: `packages/client/tests/unit/core/FileUploader.test.ts`
- **说明**: 实现主上传器类，整合 WorkerManager、UploadQueue、ChunkProcessor，实现完整的上传流程
- **依赖**: WorkerManager、UploadQueue、ChunkProcessor、事件系统

#### 6.2 客户端入口文件（客户端）
- **文件**: `packages/client/src/index.ts`
- **测试**: `packages/client/tests/integration/index.test.ts`
- **说明**: 导出公共 API，确保模块正确导出
- **依赖**: FileUploader

#### 6.3 服务端入口文件（服务端）
- **文件**: `packages/server/src/index.ts`
- **测试**: `packages/server/tests/integration/index.test.ts`
- **说明**: 初始化 Hono 应用，注册路由，启动服务器
- **依赖**: API 路由、数据库连接

### 第七阶段：集成测试（Integration Testing）

#### 7.1 端到端测试（客户端）
- **文件**: `packages/client/tests/integration/e2e.test.ts`
- **说明**: 测试完整的上传流程，包括 Hash 计算、分片上传、文件合并等
- **依赖**: 所有客户端模块

#### 7.2 端到端测试（服务端）
- **文件**: `packages/server/tests/integration/e2e.test.ts`
- **说明**: 测试完整的 API 流程，包括会话创建、分片上传、文件合并等
- **依赖**: 所有服务端模块

## 开发原则

1. **依赖优先**: 先开发被依赖的模块，后开发依赖其他模块的模块
2. **测试驱动**: 每个模块都先写测试（Red），再实现功能（Green），最后重构（Refactor）
3. **独立测试**: 每个模块的单元测试应该独立，使用 mock 隔离依赖
4. **渐进集成**: 完成一个阶段后再进入下一阶段，确保基础稳固

## 关键测试场景

### WorkerManager 测试重点
- 单线程模式下的 Hash 计算
- 多线程模式下的任务分配和结果排序
- Worker 错误处理和资源清理

### UploadQueue 测试重点
- 并发控制（pending → inFlight → completed）
- 分片秒传检查
- 失败即中止机制
- 队列完成判定

### FileUploader 测试重点
- 完整上传流程
- 文件秒传场景
- 事件触发顺序
- 错误处理和状态管理
- 用户中止操作

### 服务端测试重点
- Token 验证
- 分片去重
- 文件秒传检查
- 文件合并逻辑