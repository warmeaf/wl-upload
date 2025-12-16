# 使用示例

本文档提供了 wl-upload 的各种使用场景和代码示例，帮助你快速集成到项目中。

## 基础示例

### 单文件上传

最简单的文件上传示例：

```typescript
import { FileUploader } from 'wl-upload'

const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024,
    concurrency: 3,
    baseUrl: 'https://api.example.com',
  },
})

// HTML: <input type="file" id="fileInput" />
const fileInput = document.getElementById('fileInput') as HTMLInputElement

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  try {
    const result = await uploader.upload(file)
    alert(`上传成功！文件 URL: ${result.url}`)
  } catch (error) {
    console.error('上传失败:', error)
    alert('上传失败，请重试')
  }
})
```

### 拖拽上传

实现拖拽文件上传：

```typescript
import { FileUploader } from 'wl-upload'

const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024,
    concurrency: 3,
    baseUrl: 'https://api.example.com',
  },
})

// HTML: <div id="dropZone">拖拽文件到这里</div>
const dropZone = document.getElementById('dropZone')!

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault()
  dropZone.style.backgroundColor = '#e3f2fd'
})

dropZone.addEventListener('dragleave', () => {
  dropZone.style.backgroundColor = ''
})

dropZone.addEventListener('drop', async (e) => {
  e.preventDefault()
  dropZone.style.backgroundColor = ''

  const file = e.dataTransfer.files[0]
  if (!file) return

  try {
    const result = await uploader.upload(file)
    console.log('上传成功:', result.url)
  } catch (error) {
    console.error('上传失败:', error)
  }
})
```

## 多文件上传

### 批量上传多个文件

```typescript
import { FileUploader } from 'wl-upload'

const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024,
    concurrency: 3,
    baseUrl: 'https://api.example.com',
  },
})

// HTML: <input type="file" id="fileInput" multiple />
const fileInput = document.getElementById('fileInput') as HTMLInputElement

fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || [])
  if (files.length === 0) return

  // 串行上传（一个接一个）
  for (const file of files) {
    try {
      const result = await uploader.upload(file)
      console.log(`${file.name} 上传成功:`, result.url)
    } catch (error) {
      console.error(`${file.name} 上传失败:`, error)
    }
  }
})
```

### 并发上传多个文件

```typescript
import { FileUploader } from 'wl-upload'

// 为每个文件创建独立的上传器实例
const uploadFiles = async (files: File[]) => {
  const uploaders = files.map((file) => {
    const uploader = new FileUploader({
      config: {
        chunkSize: 2 * 1024 * 1024,
        concurrency: 3,
        baseUrl: 'https://api.example.com',
      },
      onProgress: (progress) => {
        const percent = (
          (progress.chunksUploaded / progress.totalChunks) *
          100
        ).toFixed(2)
        console.log(`${file.name} 进度: ${percent}%`)
      },
    })
    return { file, uploader }
  })

  // 并发上传所有文件
  const results = await Promise.allSettled(
    uploaders.map(({ file, uploader }) => uploader.upload(file))
  )

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`${files[index].name} 上传成功:`, result.value.url)
    } else {
      console.error(`${files[index].name} 上传失败:`, result.reason)
    }
  })
}

// 使用
const fileInput = document.getElementById('fileInput') as HTMLInputElement
fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || [])
  await uploadFiles(files)
})
```

## 进度监听

### 显示上传进度条

```typescript
import { FileUploader } from 'wl-upload'

const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024,
    concurrency: 3,
    baseUrl: 'https://api.example.com',
  },
  onProgress: (progress) => {
    const { chunksHashed, chunksUploaded, totalChunks } = progress

    // Hash 计算进度（占 50%）
    const hashProgress = (chunksHashed / totalChunks) * 50
    // 上传进度（占 50%）
    const uploadProgress = (chunksUploaded / totalChunks) * 50
    // 总进度
    const totalProgress = hashProgress + uploadProgress

    // 更新进度条
    const progressBar = document.getElementById(
      'progressBar'
    ) as HTMLProgressElement
    progressBar.value = totalProgress

    // 更新文本
    const progressText = document.getElementById('progressText')!
    progressText.textContent = `上传中: ${totalProgress.toFixed(
      2
    )}% (${chunksUploaded}/${totalChunks})`
  },
})

await uploader.upload(file)
```

### 显示详细进度信息

```typescript
import { FileUploader } from 'wl-upload'

const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024,
    concurrency: 3,
    baseUrl: 'https://api.example.com',
  },
  onProgress: (progress) => {
    const { chunksHashed, chunksUploaded, totalChunks } = progress

    console.log('=== 上传进度 ===')
    console.log(`总分片数: ${totalChunks}`)
    console.log(
      `Hash 计算: ${chunksHashed}/${totalChunks} (${(
        (chunksHashed / totalChunks) *
        100
      ).toFixed(2)}%)`
    )
    console.log(
      `分片上传: ${chunksUploaded}/${totalChunks} (${(
        (chunksUploaded / totalChunks) *
        100
      ).toFixed(2)}%)`
    )
    console.log(
      `总体进度: ${(
        ((chunksHashed + chunksUploaded) / (totalChunks * 2)) *
        100
      ).toFixed(2)}%`
    )
  },
})

await uploader.upload(file)
```

## 错误处理

### 基本错误处理

```typescript
import { FileUploader } from 'wl-upload'

const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024,
    concurrency: 3,
    baseUrl: 'https://api.example.com',
  },
})

try {
  const result = await uploader.upload(file)
  console.log('上传成功:', result.url)
} catch (error) {
  if (error instanceof Error) {
    console.error('上传失败:', error.message)

    // 根据错误类型处理
    if (error.message.includes('network')) {
      alert('网络错误，请检查网络连接')
    } else if (error.message.includes('token')) {
      alert('会话已过期，请重新上传')
    } else {
      alert('上传失败，请重试')
    }
  }
}
```

### 监听错误事件

```typescript
import { FileUploader } from 'wl-upload'

const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024,
    concurrency: 3,
    baseUrl: 'https://api.example.com',
  },
})

// 监听上传失败事件
uploader.on('queueAborted', (event) => {
  console.error('上传失败:', event.error)

  // 发送错误日志到服务器
  fetch('/api/log-error', {
    method: 'POST',
    body: JSON.stringify({
      error: event.error.message,
      fileName: file.name,
      timestamp: new Date().toISOString(),
    }),
  })
})

try {
  await uploader.upload(file)
} catch (error) {
  // 错误已在 queueAborted 事件中处理
}
```

### 重试机制

```typescript
import { FileUploader } from 'wl-upload'

const uploadWithRetry = async (file: File, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const uploader = new FileUploader({
      config: {
        chunkSize: 2 * 1024 * 1024,
        concurrency: 3,
        baseUrl: 'https://api.example.com',
      },
    })

    try {
      const result = await uploader.upload(file)
      return result
    } catch (error) {
      console.error(`第 ${attempt} 次上传失败:`, error)

      if (attempt === maxRetries) {
        throw new Error(`上传失败，已重试 ${maxRetries} 次`)
      }

      // 等待后重试
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }
}

// 使用
try {
  const result = await uploadWithRetry(file)
  console.log('上传成功:', result.url)
} catch (error) {
  console.error('最终上传失败:', error)
}
```

## 配置示例

### 启用/禁用多线程

#### 启用多线程（默认，推荐）

```typescript
import { FileUploader } from 'wl-upload'

// 大文件上传，启用多线程 Hash 计算
const uploader = new FileUploader({
  config: {
    chunkSize: 5 * 1024 * 1024, // 5MB 分片
    concurrency: 5, // 高并发
    baseUrl: 'https://api.example.com',
    enableMultiThreading: true, // 启用多线程（默认值）
  },
})

await uploader.upload(largeFile) // 大文件
```

#### 禁用多线程（单线程模式）

```typescript
import { FileUploader } from 'wl-upload'

// 资源受限环境或调试场景，禁用多线程
const uploader = new FileUploader({
  config: {
    chunkSize: 1 * 1024 * 1024, // 1MB 分片
    concurrency: 2, // 低并发
    baseUrl: 'https://api.example.com',
    enableMultiThreading: false, // 禁用多线程
  },
})

await uploader.upload(smallFile) // 小文件或调试
```

### 自定义分片大小

```typescript
import { FileUploader } from 'wl-upload'

// 根据文件大小动态调整分片大小
const getChunkSize = (fileSize: number): number => {
  if (fileSize < 100 * 1024 * 1024) {
    // < 100MB
    return 1 * 1024 * 1024 // 1MB
  } else if (fileSize < 1024 * 1024 * 1024) {
    // < 1GB
    return 2 * 1024 * 1024 // 2MB
  } else {
    // >= 1GB
    return 5 * 1024 * 1024 // 5MB
  }
}

const uploader = new FileUploader({
  config: {
    chunkSize: getChunkSize(file.size),
    concurrency: 3,
    baseUrl: 'https://api.example.com',
  },
})

await uploader.upload(file)
```

### 自定义并发数

```typescript
import { FileUploader } from 'wl-upload'

// 根据网络状况动态调整并发数
const getConcurrency = (): number => {
  const connection = (navigator as any).connection
  if (!connection) return 3 // 默认值

  const effectiveType = connection.effectiveType
  switch (effectiveType) {
    case '4g':
      return 5 // 4G 网络，高并发
    case '3g':
      return 3 // 3G 网络，中等并发
    case '2g':
    case 'slow-2g':
      return 1 // 2G 网络，低并发
    default:
      return 3
  }
}

const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024,
    concurrency: getConcurrency(),
    baseUrl: 'https://api.example.com',
  },
})

await uploader.upload(file)
```

## 高级用法

### 事件监听

```typescript
import { FileUploader } from 'wl-upload'

const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024,
    concurrency: 3,
    baseUrl: 'https://api.example.com',
  },
})

// 监听所有事件
uploader.on('chunkHashed', (event) => {
  console.log(`分片 ${event.chunkIndex} Hash 完成:`, event.hash)
})

uploader.on('allChunksHashed', () => {
  console.log('所有分片 Hash 计算完成')
})

uploader.on('fileHashed', (event) => {
  console.log('文件 Hash 完成:', event.fileHash)
})

uploader.on('queueDrained', () => {
  console.log('所有分片上传完成，开始合并')
})

uploader.on('queueAborted', (event) => {
  console.error('上传失败:', event.error)
})

await uploader.upload(file)
```

### 手动中止上传

```typescript
import { FileUploader } from 'wl-upload'

const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024,
    concurrency: 3,
    baseUrl: 'https://api.example.com',
  },
})

// 开始上传
const uploadPromise = uploader.upload(file)

// HTML: <button id="cancelBtn">取消上传</button>
const cancelBtn = document.getElementById('cancelBtn')!
cancelBtn.addEventListener('click', () => {
  uploader.abort()
  console.log('上传已取消')
})

try {
  const result = await uploadPromise
  console.log('上传成功:', result.url)
} catch (error) {
  if (error.message.includes('aborted')) {
    console.log('上传已取消')
  } else {
    console.error('上传失败:', error)
  }
}
```

### 状态管理

```typescript
import { FileUploader } from 'wl-upload'

const uploader = new FileUploader({
  config: {
    chunkSize: 2 * 1024 * 1024,
    concurrency: 3,
    baseUrl: 'https://api.example.com',
  },
  onStatusChange: (status) => {
    console.log('状态变更:', status)

    // 根据状态更新 UI
    const statusElement = document.getElementById('status')!
    switch (status) {
      case 'idle':
        statusElement.textContent = '就绪'
        break
      case 'uploading':
        statusElement.textContent = '上传中...'
        break
      case 'completed':
        statusElement.textContent = '上传完成'
        break
      case 'failed':
        statusElement.textContent = '上传失败'
        break
    }
  },
})

await uploader.upload(file)
```

### React 集成示例

```tsx
import React, { useState } from 'react'
import { FileUploader } from 'wl-upload'

const FileUploadComponent: React.FC = () => {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<
    'idle' | 'uploading' | 'completed' | 'failed'
  >('idle')
  const [fileUrl, setFileUrl] = useState<string>('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const uploader = new FileUploader({
      config: {
        chunkSize: 2 * 1024 * 1024,
        concurrency: 3,
        baseUrl: 'https://api.example.com',
      },
      onProgress: (progress) => {
        const totalProgress =
          (progress.chunksUploaded / progress.totalChunks) * 100
        setProgress(totalProgress)
      },
      onStatusChange: (status) => {
        setStatus(status)
      },
    })

    try {
      const result = await uploader.upload(file)
      setFileUrl(result.url)
    } catch (error) {
      console.error('上传失败:', error)
    }
  }

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      {status === 'uploading' && (
        <div>
          <progress value={progress} max={100} />
          <span>{progress.toFixed(2)}%</span>
        </div>
      )}
      {status === 'completed' && (
        <div>
          <p>上传成功！</p>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            查看文件
          </a>
        </div>
      )}
      {status === 'failed' && <div>上传失败，请重试</div>}
    </div>
  )
}

export default FileUploadComponent
```

### Vue 集成示例

```vue
<template>
  <div>
    <input type="file" @change="handleFileChange" />
    <div v-if="status === 'uploading'">
      <progress :value="progress" max="100"></progress>
      <span>{{ progress.toFixed(2) }}%</span>
    </div>
    <div v-if="status === 'completed'">
      <p>上传成功！</p>
      <a :href="fileUrl" target="_blank">查看文件</a>
    </div>
    <div v-if="status === 'failed'">上传失败，请重试</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FileUploader } from 'wl-upload'

const progress = ref(0)
const status = ref<'idle' | 'uploading' | 'completed' | 'failed'>('idle')
const fileUrl = ref('')

const handleFileChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const uploader = new FileUploader({
    config: {
      chunkSize: 2 * 1024 * 1024,
      concurrency: 3,
      baseUrl: 'https://api.example.com',
    },
    onProgress: (progressData) => {
      progress.value =
        (progressData.chunksUploaded / progressData.totalChunks) * 100
    },
    onStatusChange: (newStatus) => {
      status.value = newStatus
    },
  })

  try {
    const result = await uploader.upload(file)
    fileUrl.value = result.url
  } catch (error) {
    console.error('上传失败:', error)
  }
}
</script>
```

## 最佳实践

### 1. 文件大小限制

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024 // 10GB

const handleFileSelect = (file: File) => {
  if (file.size > MAX_FILE_SIZE) {
    alert('文件大小超过限制（10GB）')
    return
  }

  // 继续上传
  uploader.upload(file)
}
```

### 2. 文件类型限制

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

const handleFileSelect = (file: File) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    alert('不支持的文件类型')
    return
  }

  // 继续上传
  uploader.upload(file)
}
```

### 3. 上传前验证

```typescript
const validateFile = (file: File): string | null => {
  if (file.size === 0) {
    return '文件不能为空'
  }

  if (file.size > 10 * 1024 * 1024 * 1024) {
    return '文件大小超过限制'
  }

  return null // 验证通过
}

const handleFileSelect = async (file: File) => {
  const error = validateFile(file)
  if (error) {
    alert(error)
    return
  }

  try {
    await uploader.upload(file)
  } catch (error) {
    console.error('上传失败:', error)
  }
}
```
