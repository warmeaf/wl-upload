# 工程化工具

项目采用现代化的工程化工具链，确保代码质量和开发规范。

## 构建工具

项目基于 **Vite** 进行构建，Vite 是一个快速的、现代化的前端构建工具，提供极速的开发体验和优化的生产构建。

**常用命令：**

```bash
# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

## 包管理工具

项目强制使用 **pnpm** 作为包管理工具，通过 `only-allow` 确保团队成员使用统一的包管理器。

**安装依赖：**

```bash
pnpm install
```

**package.json 配置：**

```json
{
  "scripts": {
    "preinstall": "npx only-allow pnpm"
  }
}
```

## Biome

使用 **Biome** 进行代码格式化和 lint 检查，Biome 是一个快速的、零配置的代码格式化工具和 linter。

**常用命令：**

```bash
# 格式化代码
pnpm biome format --write .

# 检查代码
pnpm biome check .

# 自动修复问题
pnpm biome check --write .
```

## Commitlint

使用 **Commitlint** 规范 Git commit 消息格式，确保提交信息的一致性和可读性。

**Commit 消息格式：**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**示例：**

```
feat(core): 添加请求重试功能

实现了请求失败后的自动重试机制，支持自定义重试次数和延迟时间

Closes #123
```

## Husky

使用 **Husky** 管理 Git hooks，在提交代码前自动执行代码检查和格式化。

**安装和初始化：**

```bash
pnpm add -D husky
pnpm exec husky init
```

**package.json 配置：**

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

**Git hooks 配置：**

`.husky/pre-commit`：

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

`.husky/commit-msg`：

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm commitlint --edit "$1"
```

## Lint-staged

使用 **lint-staged** 只对 Git 暂存区（staged）的文件运行 lint 和格式化，提高提交效率。

**安装：**

```bash
pnpm add -D lint-staged
```

**.lintstagedrc.js 配置：**

```javascript
export default {
  '*.{js,ts,tsx}': ['biome check --write'],
  '*.json': ['biome format --write'],
}
```

## 测试框架

项目使用 **Vitest** 作为测试框架，Vitest 是一个基于 Vite 的快速单元测试框架，与 Vite 共享配置，提供极速的测试体验。

**特性：**

- 与 Vite 配置共享：使用相同的配置文件，无需重复配置
- 极速执行：基于 ESM，利用 Vite 的转换管道，测试速度极快
- 兼容 Jest API：熟悉的 API，易于迁移
- TypeScript 支持：开箱即用的 TypeScript 支持
- 内置代码覆盖率：使用 `@vitest/coverage-v8` 或 `@vitest/coverage-istanbul`

**安装：**

```bash
pnpm add -D vitest @vitest/ui
```

**常用命令：**

```bash
# 运行测试
pnpm test

# 监听模式运行测试
pnpm test:watch

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 打开测试 UI
pnpm test:ui
```

更多测试相关内容，请参考 [测试文档](./testing.md)。

## 工作流程

1. **提交代码前**：`pre-commit` hook 自动运行 `lint-staged`，对暂存文件进行格式化和检查
2. **提交消息时**：`commit-msg` hook 自动运行 `commitlint`，验证 commit 消息格式
3. **CI/CD**：在 CI 流程中运行完整的代码检查和测试

## 开发规范

- 使用 `pnpm` 安装和管理依赖
- 提交前代码会自动格式化和检查
- Commit 消息必须符合 Conventional Commits 规范
- 所有代码必须通过 lint 检查才能提交
