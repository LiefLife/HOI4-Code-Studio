# JSON 解析与工具 (JSON Decoder)

## 概述
后端提供了高性能的 JSON 处理能力，目前主要通过封装 `serde_json` 并提供扩展功能实现。
虽然 HOI4 脚本格式特殊，但在某些场景（如标准配置文件读取）下，我们需要强壮的 JSON 处理能力。

## 实现位置
- `src-tauri/src/json_decoder.rs`: 核心实现文件。

## 核心功能
该模块不仅提供基础的 Parse/Stringify，还提供了深层操作能力：

### 1. 路径访问 (Path Access)
支持通过点号 (`.`) 分隔的字符串路径访问深层嵌套属性：
```rust
pub fn get_path(&self, value: &Value, path: &str) -> Option<Value>
// 示例 path: "user.profile.name"
```

### 2. 深度合并 (Deep Merge)
支持递归合并两个 JSON 对象，常用于覆盖默认配置：
```rust
pub fn deep_merge(&self, base: &Value, overlay: &Value) -> Value
```

### 3. Tauri 命令暴露
所有功能均已通过 `#[tauri::command]` 暴露给前端：
- `parse_json`
- `stringify_json`
- `merge_json`
- `get_json_path`
- `set_json_path`

