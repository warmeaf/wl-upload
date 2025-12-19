# 文件秒传场景时序图

## 场景描述

当文件 Hash 计算完成后，检查发现文件已存在于服务端，此时跳过所有分片上传，直接进入合并阶段获取文件 URL。

## 时序图

```mermaid
sequenceDiagram
    participant FU as FileUploader
    participant WM as WorkerManager
    participant Emitter as EventEmitter
    participant UQ as UploadQueue
    participant Server as 服务端

    Note over WM: 所有分片Hash计算完成
    WM->>Emitter: emit("allChunksHashed")
    Emitter->>UQ: allChunksHashed事件
    UQ->>UQ: allChunksHashed = true
    
    Note over WM: 文件Hash计算完成
    WM->>WM: fileHasher.end()
    WM->>Emitter: emit("fileHashed", {fileHash})
    Emitter->>UQ: fileHashed事件
    activate UQ
    
    Note over UQ: 文件秒传检查
    UQ->>UQ: handleFileHashed(event)
    UQ->>Server: POST /file/patchHash<br/>(token, fileHash, isChunk: false)
    Server->>Server: 检查文件是否存在
    Server-->>UQ: {exists: true}
    
    Note over UQ: 文件已存在，标记所有任务完成
    UQ->>UQ: fileExists = true
    UQ->>UQ: markAllTasksComplete()
    
    loop 所有待处理任务
        UQ->>UQ: task.state = "completed"
        UQ->>Emitter: emit("chunkUploaded")
        Emitter->>FU: chunkUploaded事件
    end
    
    Note over UQ: 检查完成条件<br/>(allChunksHashed === true && 所有任务完成)
    UQ->>UQ: checkCompletion()
    UQ->>Emitter: emit("queueDrained")
    Emitter->>FU: queueDrained事件
    deactivate UQ
    
    Note over FU: 直接进入合并阶段
    FU->>FU: mergeFile()
    FU->>Server: POST /file/merge<br/>(token, fileHash, fileName, chunks)
    Server->>Server: 更新文件记录并返回URL
    Server-->>FU: {url}
    
    FU->>FU: setStatus("completed")
    FU->>FU: Promise.resolve(url)
```

## 关键流程说明

1. **所有分片Hash计算完成**：WorkerManager 完成所有分片 Hash 计算后，触发 `allChunksHashed` 事件，UploadQueue 设置 `allChunksHashed = true` 标志。

2. **文件Hash计算完成**：WorkerManager 完成文件 Hash 计算后，触发 `fileHashed` 事件（多线程模式下，此时所有分片 Hash 已完成）。

3. **秒传检查**：UploadQueue 监听 `fileHashed` 事件，立即请求服务端检查文件是否存在。

4. **文件已存在**：服务端返回 `exists: true`，表示文件已存在。

5. **跳过上传**：UploadQueue 将所有待上传和正在上传的任务标记为完成，触发 `chunkUploaded` 事件更新进度。

6. **检查完成条件**：调用 `checkCompletion()`，此时 `allChunksHashed === true` 且所有任务完成，触发 `queueDrained` 事件。

7. **触发合并**：FileUploader 监听 `queueDrained` 事件，调用 `mergeFile()` 直接进入合并阶段。

8. **完成**：服务端更新文件记录并返回 URL，上传流程完成。整个过程跳过了所有分片的上传步骤，实现了文件秒传。

