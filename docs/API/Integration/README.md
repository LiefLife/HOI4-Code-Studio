# 集成 API 文档

本文档描述了 HOI4 Code Studio 前后端集成的接口规范、通信协议和数据交换格式。

## 📋 集成概览

### 通信架构
```
前端 (Vue/TypeScript) ←→ Tauri IPC ←→ 后端 (Rust)
        ↓                           ↓
    状态管理                    核心逻辑
        ↓                           ↓
    UI 渲染                    文件系统
```

### 核心组件
- **IPC 通信**: 前后端进程间通信
- **数据序列化**: JSON 格式数据交换
- **错误处理**: 统一的错误处理机制
- **事件系统**: 异步事件通知
- **状态同步**: 前后端状态一致性

## 🔌 IPC 通信协议

### 请求-响应模式

```typescript
// 前端请求格式
interface Request<T> {
  command: string;        // 命令名称
  args: T;               // 参数对象
  id?: string;           // 请求ID（用于追踪）
}

// 后端响应格式
interface Response<T> {
  success: boolean;      // 操作是否成功
  data?: T;             // 响应数据
  error?: string;       // 错误信息
  id?: string;          // 对应的请求ID
}
```

### 事件通知模式

```typescript
// 事件通知格式
interface Event<T> {
  event: string;         // 事件名称
  data: T;              // 事件数据
  timestamp: number;    // 时间戳
}
```

## 📦 数据序列化规范

### JSON 格式标准

所有前后端数据交换都使用 JSON 格式，遵循以下规范：

1. **命名约定**: 使用 camelCase（前端）和 snake_case（后端）
2. **日期格式**: ISO 8601 字符串格式
3. **空值处理**: 使用 `null` 表示空值
4. **布尔值**: 明确使用 `true`/`false`
5. **数值**: 不使用科学计数法

### 类型映射

| TypeScript | Rust | JSON |
|-----------|------|------|
| `string` | `String` | string |
| `number` | `f64`/`i64` | number |
| `boolean` | `bool` | boolean |
| `Array<T>` | `Vec<T>` | array |
| `{ [key: string]: T }` | `HashMap<String, T>` | object |
| `Date` | `SystemTime` | string (ISO 8601) |
| `enum` | `enum` | string/number |

## 🛡️ 错误处理机制

### 错误分类

```typescript
// 错误类型枚举
enum ErrorType {
  ValidationError,    // 验证错误
  FileSystemError,    // 文件系统错误
  NetworkError,       // 网络错误
  PermissionError,    // 权限错误
  ParseError,         // 解析错误
  RuntimeError,       // 运行时错误
  UnknownError        // 未知错误
}

// 标准错误格式
interface StandardError {
  type: ErrorType;     // 错误类型
  code: string;        // 错误代码
  message: string;     // 错误消息
  details?: any;       // 错误详情
  stack?: string;      // 堆栈信息（仅开发环境）
  timestamp: number;   // 错误时间戳
}
```

### 错误传播

```typescript
// 前端错误处理
try {
  const result = await invoke('command_name', { arg1: 'value1' });
  // 处理成功结果
} catch (error) {
  const standardError = parseError(error);
  handleError(standardError);
}

// 后端错误处理
#[tauri::command]
pub async fn command_name(arg1: String) -> Result<ResponseData, String> {
  match perform_operation(&arg1) {
    Ok(data) => Ok(ResponseData::new(data)),
    Err(e) => Err(format_error(e)),
  }
}
```

## 🔄 状态同步机制

### 状态管理模式

```typescript
// 前端状态管理
interface StateManager {
  // 获取状态
  getState<T>(key: string): T;
  
  // 更新状态
  setState<T>(key: string, value: T): void;
  
  // 订阅状态变化
  subscribe<T>(key: string, callback: (value: T) => void): () => void;
  
  // 同步后端状态
  syncState(key: string): Promise<void>;
}
```

### 状态同步策略

1. **主动同步**: 前端主动请求状态更新
2. **被动通知**: 后端推送状态变更事件
3. **定期同步**: 定期检查状态一致性
4. **冲突解决**: 使用时间戳或版本号解决冲突

## 📡 事件系统

### 事件类型

```typescript
// 文件系统事件
enum FileSystemEvent {
  FileCreated = 'fs:file_created',
  FileModified = 'fs:file_modified',
  FileDeleted = 'fs:file_deleted',
  DirectoryChanged = 'fs:directory_changed',
}

// 项目事件
enum ProjectEvent {
  ProjectOpened = 'project:opened',
  ProjectClosed = 'project:closed',
  ProjectSaved = 'project:saved',
  ConfigurationChanged = 'project:config_changed',
}

// 编辑器事件
enum EditorEvent {
  ContentChanged = 'editor:content_changed',
  CursorMoved = 'editor:cursor_moved',
  SelectionChanged = 'editor:selection_changed',
  SyntaxErrorDetected = 'editor:syntax_error',
}
```

### 事件处理

```typescript
// 前端事件监听
import { listen } from '@tauri-apps/api/event';

// 监听文件变更
const unlisten = await listen<FileChangeEvent>(
  'fs:file_modified',
  (event) => {
    handleFileChange(event.payload);
  }
);

// 后端事件发送
use tauri::Manager;

app.emit_all("fs:file_modified", FileChangeEvent {
  path: "/path/to/file".to_string(),
  timestamp: SystemTime::now(),
})?;
```

## 🔐 安全机制

### 权限控制

```typescript
// 权限定义
interface Permission {
  name: string;           // 权限名称
  description: string;    // 权限描述
  dangerous: boolean;     // 是否为危险权限
}

// 权限检查
async function checkPermission(permission: string): Promise<boolean> {
  return await invoke('check_permission', { permission });
}

// 权限请求
async function requestPermission(permission: string): Promise<boolean> {
  return await invoke('request_permission', { permission });
}
```

### 数据验证

```typescript
// 输入验证
interface ValidationRule {
  field: string;          // 字段名
  required: boolean;      // 是否必需
  type: string;           // 数据类型
  pattern?: string;       // 正则表达式
  min?: number;           // 最小值/长度
  max?: number;           // 最大值/长度
}

// 验证函数
function validateInput<T>(data: T, rules: ValidationRule[]): ValidationResult {
  // 实现验证逻辑
}
```

## 🚀 性能优化

### 通信优化

1. **批量操作**: 合并多个小请求为单个大请求
2. **数据压缩**: 对大数据进行压缩传输
3. **缓存机制**: 缓存频繁访问的数据
4. **懒加载**: 按需加载数据
5. **连接复用**: 复用 IPC 连接

### 内存管理

```typescript
// 资源清理
interface ResourceManager {
  // 注册资源
  registerResource(id: string, resource: any): void;
  
  // 释放资源
  releaseResource(id: string): void;
  
  // 清理所有资源
  cleanup(): void;
}

// 使用示例
const resourceManager = new ResourceManager();

// 组件挂载时注册资源
onMounted(() => {
  resourceManager.registerResource('file-watcher', fileWatcher);
});

// 组件卸载时清理资源
onUnmounted(() => {
  resourceManager.cleanup();
});
```

## 📝 集成示例

### 完整的文件操作流程

```typescript
// 1. 前端发起请求
async function openFile(path: string): Promise<string> {
  try {
    // 检查权限
    const hasPermission = await checkPermission('fs:read');
    if (!hasPermission) {
      throw new Error('没有文件读取权限');
    }
    
    // 发起请求
    const content = await invoke('read_file', { path });
    
    // 更新状态
    stateManager.setState('currentFile', { path, content });
    
    // 触发事件
    eventBus.emit('file:opened', { path, content });
    
    return content;
  } catch (error) {
    handleError(error);
    throw error;
  }
}

// 2. 后端处理请求
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
  // 验证输入
  if path.is_empty() {
    return Err("文件路径不能为空".to_string());
  }
  
  // 检查权限
  if !check_file_permission(&path) {
    return Err("没有文件读取权限".to_string());
  }
  
  // 读取文件
  match std::fs::read_to_string(&path) {
    Ok(content) => {
      // 发送事件
      let _ = app.emit_all("fs:file_read", FileReadEvent {
        path: path.clone(),
        size: content.len(),
        timestamp: SystemTime::now(),
      });
      
      Ok(content)
    }
    Err(e) => Err(format!("读取文件失败: {}", e)),
  }
}
```

## 🔗 相关链接

- [API 主页](../README.md)
- [前端 API](../Frontend/README.md)
- [后端 API](../Backend/README.md)
- [Tauri 集成指南](https://tauri.app/v1/guides/)

---

**注意**: 集成 API 的设计遵循安全、高效、可维护的原则，确保前后端通信的稳定性和可靠性。