# 测试

项目使用 **Vitest** 进行单元测试和集成测试，确保功能的稳定性和可靠性。

## 测试框架

### Vitest

Vitest 是一个基于 Vite 的快速单元测试框架，与 Vite 共享配置，提供极速的测试体验。

**特性**：

- 与 Vite 配置共享：使用相同的配置文件，无需重复配置
- 极速执行：基于 ESM，利用 Vite 的转换管道，测试速度极快
- 兼容 Jest API：熟悉的 API，易于迁移
- TypeScript 支持：开箱即用的 TypeScript 支持
- 内置代码覆盖率：使用 `@vitest/coverage-v8` 或 `@vitest/coverage-istanbul`

**安装**：

```bash
pnpm add -D vitest @vitest/ui @vitest/coverage-v8
```

**常用命令**：

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

更多信息请参考 [工程化工具文档](./engineering-tools.md)。
