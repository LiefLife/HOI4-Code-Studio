# 测试指南

本项目使用全面的测试体系来确保代码质量和功能稳定性。

## 📋 测试架构

### 测试类型
- **单元测试** - 测试单个函数、组件或模块
- **集成测试** - 测试多个模块之间的交互
- **E2E测试** - 端到端用户流程测试
- **性能测试** - 验证性能指标

### 测试框架
- **前端**: Vitest + Vue Test Utils + Playwright
- **后端**: Rust 内置测试框架 + Cargo
- **覆盖率**: c8 (前端) + Tarpaulin (后端)

## 🚀 快速开始

### 安装测试依赖
```bash
npm install
```

### 运行所有测试
```bash
# 前端测试
npm run test

# 后端测试
cd src-tauri && cargo test

# E2E测试
npm run test:e2e

# 带覆盖率的测试
npm run test:coverage
```

## 📁 测试目录结构

```
src/
├── test/
│   ├── setup.ts              # 全局测试设置
│   ├── utils/
│   │   └── mockApi.ts        # API Mock工具
│   ├── unit/                 # 单元测试
│   │   ├── version.test.ts
│   │   └── useFileManager.test.ts
│   ├── integration/          # 集成测试
│   │   └── file-manager.test.ts
│   ├── components/           # 组件测试
│   │   └── FileTreeNode.test.ts
│   └── e2e/                  # E2E测试
│       └── home.spec.ts
src-tauri/src/tests/           # 后端测试
│   ├── mod.rs
│   ├── file_tree_tests.rs
│   └── tag_validator_tests.rs
.github/workflows/test.yml     # CI/CD配置
vitest.config.ts              # Vitest配置
playwright.config.ts          # Playwright配置
```

## 📝 测试编写规范

### 单元测试 (Unit Tests)

#### 工具函数测试
```typescript
// src/test/unit/version.test.ts
import { describe, it, expect } from 'vitest'
import { parseVersionToTag } from '@/utils/version'

describe('版本管理工具', () => {
  it('应该正确转换开发版本', () => {
    expect(parseVersionToTag('v0.1.1-dev')).toBe('Dev_0_1_1')
  })
})
```

#### Composables测试
```typescript
// src/test/unit/useFileManager.test.ts
import { describe, it, expect, vi } from 'vitest'
import { useFileManager } from '@/composables/useFileManager'

describe('useFileManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该正确初始化状态', () => {
    const { openFiles, activeFileIndex } = useFileManager()
    expect(openFiles.value).toEqual([])
    expect(activeFileIndex.value).toBe(-1)
  })
})
```

#### 组件测试
```typescript
// src/test/components/FileTreeNode.test.ts
import { mount } from '@vue/test-utils'
import FileTreeNode from '@/components/FileTreeNode.vue'

describe('FileTreeNode', () => {
  it('应该正确渲染文件节点', () => {
    const wrapper = mount(FileTreeNode, {
      props: {
        node: createMockFileNode()
      }
    })
    expect(wrapper.find('[data-testid="file-name"]').text()).toBe('test.txt')
  })
})
```

### 集成测试 (Integration Tests)

```typescript
// src/test/integration/file-manager.test.ts
describe('文件管理器集成测试', () => {
  it('应该正确处理文件打开和保存的完整流程', async () => {
    const fileManager = useFileManager()
    
    // Mock API调用
    mockApi.readFileContent.mockResolvedValue({
      success: true,
      content: 'initial content'
    })

    // 执行操作
    await fileManager.openFile(mockFileNode)
    
    // 断言结果
    expect(fileManager.openFiles.value).toHaveLength(1)
  })
})
```

### E2E测试 (End-to-End Tests)

```typescript
// src/test/e2e/home.spec.ts
import { test, expect } from '@playwright/test'

test.describe('主页功能', () => {
  test('应该能够创建新项目', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("创建")')
    await expect(page).toHaveURL(/.*create/)
  })
})
```

## 🔧 Mock和测试工具

### API Mock
```typescript
// src/test/utils/mockApi.ts
export function setupCommonMocks() {
  const api = require('../../api/tauri')
  vi.mocked(api.buildDirectoryTreeFast).mockResolvedValue(mockFileTree)
  vi.mocked(api.readFileContent).mockResolvedValue(mockFileContent)
}
```

### 文件系统Mock
```typescript
// 后端测试中的临时文件系统
use tempfile::{tempdir, TempDir};

#[test]
fn test_file_operations() {
    let temp_dir = tempdir().unwrap();
    // 使用临时目录进行测试
}
```

## 📊 测试覆盖率

### 查看覆盖率报告
```bash
# 前端覆盖率
npm run test:coverage
open coverage/index.html

# 后端覆盖率
cd src-tauri
cargo tarpaulin --out Html
open tarpaulin-report.html
```

### 覆盖率目标
- **语句覆盖率**: > 80%
- **分支覆盖率**: > 70%
- **函数覆盖率**: > 85%
- **行覆盖率**: > 80%

## 🚀 CI/CD集成

### GitHub Actions工作流
测试在以下情况下自动运行：
- 推送到 `main` 或 `dev` 分支
- 创建Pull Request

### 工作流步骤
1. **前端测试** - 单元测试 + 覆盖率
2. **后端测试** - 单元测试 + 覆盖率
3. **E2E测试** - 跨浏览器测试
4. **集成测试** - 全栈功能测试
5. **代码质量** - Lint + 格式检查
6. **安全扫描** - 依赖安全检查
7. **构建测试** - 验证构建流程

## 📈 测试最佳实践

### 1. 测试命名
- 使用描述性的测试名称
- 遵循 "应该..." 的命名模式
- 明确测试的预期行为

### 2. 测试结构 (AAA模式)
```typescript
it('应该正确处理文件打开', () => {
  // Arrange - 准备测试数据
  const mockFile = createMockFileNode()
  
  // Act - 执行被测操作
  const result = fileManager.openFile(mockFile)
  
  // Assert - 验证结果
  expect(result).toBe(true)
  expect(fileManager.openFiles.value).toHaveLength(1)
})
```

### 3. 避免测试中的魔法数字
```typescript
// ❌ 不好
expect(response.status).toBe(200)

// ✅ 好
const SUCCESS_STATUS = 200
expect(response.status).toBe(SUCCESS_STATUS)
```

### 4. 合理使用Mock
- Mock外部依赖（API、文件系统等）
- 不要Mock业务逻辑
- 使用真实的测试数据

### 5. 测试隔离
- 每个测试应该是独立的
- 在`beforeEach`/`afterEach`中清理状态
- 避免测试间的依赖

## 🔍 测试调试

### 运行特定测试
```bash
# 运行特定测试文件
npm run test -- version.test.ts

# 运行特定测试
npm run test -- --grep "应该正确转换"

# 后端特定测试
cd src-tauri
cargo test test_file_operations
```

### 调试测试
```typescript
// 添加调试输出
it('应该...', () => {
  console.log('调试信息:', someValue)
  expect(someValue).toBe(expectedValue)
})

// 或者使用Vitest的调试模式
npm run test -- --inspect-brk
```

### 查看测试报告
```bash
# 生成详细报告
npm run test:run -- --reporter=verbose

# 生成HTML报告
npm run test:coverage -- --reporter=html
```

## 🤝 贡献指南

### 添加新测试
1. 确定测试类型（单元/集成/E2E）
2. 遵循现有测试模式
3. 确保测试覆盖率目标
4. 运行完整测试套件
5. 更新相关文档

### 测试审查清单
- [ ] 测试名称清晰描述意图
- [ ] 使用适当的断言
- [ ] 合理Mock外部依赖
- [ ] 测试独立且可重复
- [ ] 覆盖正常和异常情况
- [ ] 性能测试合理
- [ ] 文档已更新

---

## 📞 支持

如有问题，请：
1. 查看现有测试示例
2. 运行 `npm run test:run` 验证环境
3. 提交 Issue 描述问题