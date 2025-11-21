# 依赖项管理 (Dependency Management)

## 概述
管理 Mod 之间的依赖关系以及与游戏本体文件的关联。支持启用/禁用依赖项，并建立索引以供自动补全使用。

## 核心状态定义
位于 `src/composables/useDependencyManager.ts`:

```typescript
interface DependencyManagerState {
  /** 依赖项列表 */
  dependencies: Dependency[]
  /** 是否正在加载 */
  loading: boolean
  /** 索引状态映射 (用于显示索引进度) */
  indexStatuses: Map<string, DependencyIndexStatus>
  /** 当前项目路径 */
  projectPath: string
}
```

## 核心功能 (`useDependencyManager`)

### 1. 依赖项操作
- `addDependency(path: string)`: 添加新的依赖 Mod，会自动验证路径有效性。
- `toggleDependency(id: string)`: 启用或禁用某个依赖。
- `removeDependency(id: string)`: 移除依赖项。

### 2. 索引系统
依赖项被添加后，可以对其进行索引以提取 Idea 和 Tag：
- `indexDependency(id: string)`: 触发后端索引流程。
- `indexAllDependencies()`: 批量索引所有已启用的依赖。

### 3. 持久化
依赖项列表会自动保存到项目配置中（通过 `saveDependencies` Tauri 命令）。

