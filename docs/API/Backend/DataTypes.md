# HOI4 Code Studio - 后端数据类型文档

本文档详细记录了HOI4 Code Studio后端的所有数据类型定义，包括结构体、枚举、联合类型等，以及它们的序列化/反序列化规则。

## 目录

- [项目管理相关类型](#项目管理相关类型)
- [文件操作相关类型](#文件操作相关类型)
- [设置管理相关类型](#设置管理相关类型)
- [搜索功能相关类型](#搜索功能相关类型)
- [文件树相关类型](#文件树相关类型)
- [JSON处理相关类型](#json处理相关类型)
- [括号匹配相关类型](#括号匹配相关类型)
- [国家标签相关类型](#国家标签相关类型)
- [Idea注册相关类型](#idea注册相关类型)
- [标签验证相关类型](#标签验证相关类型)
- [依赖项管理相关类型](#依赖项管理相关类型)
- [项目打包相关类型](#项目打包相关类型)
- [图片处理相关类型](#图片处理相关类型)
- [系统相关类型](#系统相关类型)

## 项目管理相关类型

### CreateProjectResult

创建新项目的返回结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProjectResult {
    success: bool,
    message: String,
    project_path: Option<String>,
}
```

**字段说明：**
- `success`: 操作是否成功
- `message`: 操作结果消息
- `project_path`: 创建的项目路径（成功时有效）

**JSON示例：**
```json
{
  "success": true,
  "message": "项目 'My Mod' 创建成功",
  "project_path": "/path/to/projects/My Mod"
}
```

### OpenProjectResult

打开或初始化项目的返回结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct OpenProjectResult {
    success: bool,
    message: String,
    project_data: Option<serde_json::Value>,
}
```

**字段说明：**
- `success`: 操作是否成功
- `message`: 操作结果消息
- `project_data`: 项目配置数据（成功时有效）

**JSON示例：**
```json
{
  "success": true,
  "message": "项目打开成功",
  "project_data": {
    "name": "My Mod",
    "version": "1.0.0",
    "replace_path": ["gfx/interface"],
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

### RecentProject

最近项目条目。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct RecentProject {
    name: String,
    path: String,
    last_opened: String,
}
```

**字段说明：**
- `name`: 项目名称
- `path`: 项目路径
- `last_opened`: 最后打开时间（RFC3339格式）

**JSON示例：**
```json
{
  "name": "My Mod",
  "path": "/path/to/projects/My Mod",
  "last_opened": "2023-01-01T12:00:00Z"
}
```

### RecentProjectsResult

最近项目列表的返回结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct RecentProjectsResult {
    success: bool,
    projects: Vec<RecentProject>,
}
```

**字段说明：**
- `success`: 操作是否成功
- `projects`: 最近项目列表（最多10个）

**JSON示例：**
```json
{
  "success": true,
  "projects": [
    {
      "name": "My Mod",
      "path": "/path/to/projects/My Mod",
      "last_opened": "2023-01-01T12:00:00Z"
    }
  ]
}
```

## 文件操作相关类型

### FileDialogResult

文件对话框的返回结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct FileDialogResult {
    success: bool,
    path: Option<String>,
}
```

**字段说明：**
- `success`: 操作是否成功（用户是否选择了文件/目录）
- `path`: 选择的路径（成功时有效）

**JSON示例：**
```json
{
  "success": true,
  "path": "/path/to/selected/file"
}
```

### SearchResult

搜索结果条目。

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    file_path: String,
    file_name: String,
    line: usize,
    content: String,
    match_start: usize,
    match_end: usize,
}
```

**字段说明：**
- `file_path`: 文件完整路径
- `file_name`: 文件名
- `line`: 行号（从1开始）
- `content`: 匹配的行内容
- `match_start`: 匹配开始位置
- `match_end`: 匹配结束位置

**JSON示例：**
```json
{
  "file_path": "/path/to/file.txt",
  "file_name": "file.txt",
  "line": 10,
  "content": "target = GER",
  "match_start": 9,
  "match_end": 12
}
```

## 设置管理相关类型

### JsonResult

通用JSON操作结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct JsonResult {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}
```

**字段说明：**
- `success`: 操作是否成功
- `message`: 操作结果消息
- `data`: JSON数据（可选）

**JSON示例：**
```json
{
  "success": true,
  "message": "设置加载成功",
  "data": {
    "gameDirectory": "/path/to/hoi4",
    "autoSave": true,
    "showGrid": false,
    "syntaxHighlight": true
  }
}
```

### LaunchGameResult

启动游戏的返回结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct LaunchGameResult {
    success: bool,
    message: String,
}
```

**字段说明：**
- `success`: 启动是否成功
- `message`: 启动结果消息

**JSON示例：**
```json
{
  "success": true,
  "message": "正在通过 Steam 启动游戏..."
}
```

## 文件树相关类型

### FileNode

文件树节点。

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    #[serde(default)]
    pub expanded: bool,
}
```

**字段说明：**
- `name`: 文件/文件夹名称
- `path`: 完整路径
- `is_directory`: 是否为目录
- `children`: 子节点（仅目录有）
- `size`: 文件大小（字节，仅文件有）
- `expanded`: 是否展开（前端状态）

**JSON示例：**
```json
{
  "name": "common",
  "path": "/path/to/project/common",
  "is_directory": true,
  "children": [
    {
      "name": "country_tags",
      "path": "/path/to/project/common/country_tags",
      "is_directory": true,
      "children": [
        {
          "name": "00_countries.txt",
          "path": "/path/to/project/common/country_tags/00_countries.txt",
          "is_directory": false,
          "size": 1024,
          "expanded": false
        }
      ],
      "expanded": false
    }
  ],
  "expanded": true
}
```

### FileTreeResult

文件树构建结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct FileTreeResult {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tree: Option<Vec<FileNode>>,
}
```

**字段说明：**
- `success`: 构建是否成功
- `message`: 构建结果消息
- `tree`: 文件树结构（成功时有效）

**JSON示例：**
```json
{
  "success": true,
  "message": "文件树构建成功",
  "tree": [
    {
      "name": "common",
      "path": "/path/to/project/common",
      "is_directory": true,
      "expanded": false
    }
  ]
}
```

## JSON处理相关类型

### JsonValidationResult

JSON验证结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct JsonValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
}
```

**字段说明：**
- `valid`: JSON是否有效
- `errors`: 错误信息列表

**JSON示例：**
```json
{
  "valid": false,
  "errors": [
    "JSON 格式错误: expected value at line 1 column 1"
  ]
}
```

## 括号匹配相关类型

### BracketType

括号类型枚举。

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BracketType {
    Round,   // ()
    Square,  // []
    Curly,   // {}
}
```

**JSON表示：**
- `Round`: `"Round"`
- `Square`: `"Square"`
- `Curly`: `"Curly"`

### BracketInfo

括号信息。

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BracketInfo {
    pub bracket_type: BracketType,
    pub start: usize,
    pub end: usize,
    pub depth: usize,
    pub matched: bool,
}
```

**字段说明：**
- `bracket_type`: 括号类型
- `start`: 起始位置
- `end`: 结束位置
- `depth`: 嵌套深度
- `matched`: 是否匹配

**JSON示例：**
```json
{
  "bracketType": "Round",
  "start": 10,
  "end": 15,
  "depth": 1,
  "matched": true
}
```

### BracketMatchResult

括号匹配结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct BracketMatchResult {
    pub success: bool,
    pub message: String,
    pub brackets: Vec<BracketInfo>,
    pub unmatched: Vec<usize>,
}
```

**字段说明：**
- `success`: 是否所有括号都匹配
- `message`: 匹配结果消息
- `brackets`: 所有括号对信息
- `unmatched`: 未匹配的括号位置

**JSON示例：**
```json
{
  "success": true,
  "message": "找到 3 对匹配的括号",
  "brackets": [
    {
      "bracketType": "Round",
      "start": 10,
      "end": 15,
      "depth": 1,
      "matched": true
    }
  ],
  "unmatched": []
}
```

## 国家标签相关类型

### TagSource

标签来源枚举。

```rust
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TagSource {
    Project,
    Game,
    Dependency,
}
```

**JSON表示：**
- `Project`: `"project"`
- `Game`: `"game"`
- `Dependency`: `"dependency"`

### TagEntry

单个国家标签条目。

```rust
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagEntry {
    pub code: String,
    pub name: Option<String>,
    pub source: TagSource,
}
```

**字段说明：**
- `code`: 国家标签代码（如"GER"）
- `name`: 国家名称（可选）
- `source`: 标签来源

**JSON示例：**
```json
{
  "code": "GER",
  "name": "德国",
  "source": "game"
}
```

### TagLoadResponse

标签加载响应。

```rust
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagLoadResponse {
    pub success: bool,
    pub message: String,
    pub tags: Option<Vec<TagEntry>>,
}
```

**字段说明：**
- `success`: 加载是否成功
- `message`: 加载结果消息
- `tags`: 标签列表（成功时有效）

**JSON示例：**
```json
{
  "success": true,
  "message": "重新解析完成，共获取 250 个标签",
  "tags": [
    {
      "code": "GER",
      "name": "德国",
      "source": "game"
    },
    {
      "code": "ENG",
      "name": "英国",
      "source": "game"
    }
  ]
}
```

## Idea注册相关类型

### IdeaSource

Idea来源枚举。

```rust
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum IdeaSource {
    Project,
    Game,
    Dependency,
}
```

**JSON表示：**
- `Project`: `"project"`
- `Game`: `"game"`
- `Dependency`: `"dependency"`

### IdeaEntry

单个Idea条目。

```rust
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaEntry {
    pub id: String,
    pub source: IdeaSource,
}
```

**字段说明：**
- `id`: Idea标识符
- `source`: Idea来源

**JSON示例：**
```json
{
  "id": "GER_infantry_weapons",
  "source": "game"
}
```

### IdeaLoadResponse

Idea加载响应。

```rust
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaLoadResponse {
    pub success: bool,
    pub message: String,
    pub ideas: Option<Vec<IdeaEntry>>,
}
```

**字段说明：**
- `success`: 加载是否成功
- `message`: 加载结果消息
- `ideas`: Idea列表（成功时有效）

**JSON示例：**
```json
{
  "success": true,
  "message": "重新解析完成，共 1500 个idea",
  "ideas": [
    {
      "id": "GER_infantry_weapons",
      "source": "game"
    },
    {
      "id": "GER_armor",
      "source": "game"
    }
  ]
}
```

## 标签验证相关类型

### TagValidationError

单个标签验证错误。

```rust
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagValidationError {
    pub line: usize,
    pub message: String,
}
```

**字段说明：**
- `line`: 错误行号
- `message`: 错误消息

**JSON示例：**
```json
{
  "line": 10,
  "message": "未定义的国家标签: XYZ"
}
```

### TagValidationResponse

标签验证响应。

```rust
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagValidationResponse {
    pub success: bool,
    pub message: String,
    pub errors: Vec<TagValidationError>,
}
```

**字段说明：**
- `success`: 验证是否通过
- `message`: 验证结果消息
- `errors`: 错误列表

**JSON示例：**
```json
{
  "success": false,
  "message": "发现 2 处未定义标签",
  "errors": [
    {
      "line": 10,
      "message": "未定义的国家标签: XYZ"
    },
    {
      "line": 15,
      "message": "未定义的国家标签: ABC"
    }
  ]
}
```

## 依赖项管理相关类型

### DependencyType

依赖项类型枚举。

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DependencyType {
    Hoics,
    Hoi4mod,
}
```

**JSON表示：**
- `Hoics`: `"hoics"`
- `Hoi4mod`: `"hoi4mod"`

### Dependency

依赖项结构。

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dependency {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub dependency_type: DependencyType,
    #[serde(rename = "addedAt")]
    pub added_at: String,
    pub enabled: bool,
}
```

**字段说明：**
- `id`: 依赖项唯一标识
- `name`: 依赖项名称
- `path`: 依赖项路径
- `dependency_type`: 依赖项类型
- `added_at`: 添加时间（RFC3339格式）
- `enabled`: 是否启用

**JSON示例：**
```json
{
  "id": "dep1",
  "name": "Awesome Mod",
  "path": "/path/to/awesome_mod",
  "type": "hoi4mod",
  "addedAt": "2023-01-01T00:00:00Z",
  "enabled": true
}
```

### DependencyValidation

依赖项验证结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct DependencyValidation {
    pub valid: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "type")]
    pub dependency_type: Option<DependencyType>,
}
```

**字段说明：**
- `valid`: 是否有效
- `message`: 验证消息
- `name`: 检测到的名称（有效时）
- `dependency_type`: 检测到的类型（有效时）

**JSON示例：**
```json
{
  "valid": true,
  "message": "有效的 HOI4 Mod",
  "name": "Awesome Mod",
  "type": "hoi4mod"
}
```

### DependencyLoadResult

依赖项加载结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct DependencyLoadResult {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dependencies: Option<Vec<Dependency>>,
}
```

**字段说明：**
- `success`: 加载是否成功
- `message`: 加载结果消息
- `dependencies`: 依赖项列表（成功时有效）

**JSON示例：**
```json
{
  "success": true,
  "message": "成功加载 2 个依赖项",
  "dependencies": [
    {
      "id": "dep1",
      "name": "Awesome Mod",
      "path": "/path/to/awesome_mod",
      "type": "hoi4mod",
      "addedAt": "2023-01-01T00:00:00Z",
      "enabled": true
    }
  ]
}
```

### DependencySaveResult

依赖项保存结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct DependencySaveResult {
    pub success: bool,
    pub message: String,
}
```

**字段说明：**
- `success`: 保存是否成功
- `message`: 保存结果消息

**JSON示例：**
```json
{
  "success": true,
  "message": "依赖项保存成功"
}
```

### DependencyIndexResult

依赖项索引结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct DependencyIndexResult {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "ideaCount")]
    pub idea_count: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "tagCount")]
    pub tag_count: Option<usize>,
}
```

**字段说明：**
- `success`: 索引是否成功
- `message`: 索引结果消息
- `idea_count`: Idea数量（成功时）
- `tag_count`: 标签数量（成功时）

**JSON示例：**
```json
{
  "success": true,
  "message": "依赖项索引功能将在第二阶段实现",
  "ideaCount": 0,
  "tagCount": 0
}
```

## 项目打包相关类型

### PackageOptions

打包选项。

```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageOptions {
    pub project_path: String,
    pub output_name: String,
    pub exclude_dependencies: bool,
}
```

**字段说明：**
- `project_path`: 项目路径
- `output_name`: 输出文件名
- `exclude_dependencies`: 是否排除依赖项

**JSON示例：**
```json
{
  "projectPath": "/path/to/project",
  "outputName": "my_mod.zip",
  "excludeDependencies": true
}
```

### PackageResult

打包结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct PackageResult {
    success: bool,
    message: String,
    output_path: Option<String>,
    file_size: Option<u64>,
}
```

**字段说明：**
- `success`: 打包是否成功
- `message`: 打包结果消息
- `output_path`: 输出文件路径（成功时）
- `file_size`: 文件大小（字节，成功时）

**JSON示例：**
```json
{
  "success": true,
  "message": "打包成功！已打包 150 个文件",
  "outputPath": "/path/to/project/package/my_mod.zip",
  "fileSize": 1048576
}
```

## 图片处理相关类型

### ImageReadResult

图片读取结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageReadResult {
    success: bool,
    message: Option<String>,
    base64: Option<String>,
    mime_type: Option<String>,
}
```

**字段说明：**
- `success`: 读取是否成功
- `message`: 错误消息（失败时）
- `base64`: 图片的base64编码（成功时）
- `mime_type`: MIME类型（成功时）

**JSON示例：**
```json
{
  "success": true,
  "base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "mimeType": "image/png"
}
```

## 系统相关类型

### FileDialogMode

文件对话框模式枚举（内部使用）。

```rust
pub enum FileDialogMode {
    Directory,
    File,
}
```

**字符串表示：**
- `Directory`: `"directory"`
- `File`: `"file"`

## 序列化/反序列化规则

### 通用规则

1. **命名约定**：
   - Rust使用snake_case
   - JSON使用camelCase（通过`#[serde(rename_all = "camelCase")]`）转换

2. **可选字段**：
   - 使用`Option<T>`表示可选字段
   - 使用`#[serde(skip_serializing_if = "Option::is_none")]`跳过None值

3. **默认值**：
   - 使用`#[serde(default)]`设置默认值
   - 布尔值默认为false

4. **重命名字段**：
   - 使用`#[serde(rename = "...")]`重命名字段

### 枚举序列化

1. **外部标记**：
   ```rust
   #[serde(rename_all = "lowercase")]
   pub enum MyEnum {
       Variant1,
       Variant2,
   }
   ```

2. **内部标记**（复杂枚举）：
   ```rust
   #[serde(tag = "type", content = "data")]
   pub enum MyEnum {
       Type1(Data1),
       Type2(Data2),
   }
   ```

### 时间格式

1. **RFC3339格式**：
   ```rust
   pub created_at: String, // "2023-01-01T00:00:00Z"
   ```

2. **时间戳**：
   ```rust
   pub modified: Option<SystemTime>, // 内部使用，不直接序列化
   ```

### 版本兼容性

1. **向后兼容**：
   - 新增字段使用`Option<T>`
   - 使用默认值避免破坏性变更

2. **向前兼容**：
   - 忽略未知字段
   - 提供合理的默认值

## 类型转换

### Rust到JavaScript

1. **基本类型**：
   - `String` → `string`
   - `i32/u32/i64/u64` → `number`
   - `bool` → `boolean`
   - `f32/f64` → `number`

2. **复合类型**：
   - `Vec<T>` → `Array`
   - `HashMap<K, V>` → `Object`
   - `Option<T>` → `T | null`
   - `Result<T, E>` → `{ success: boolean, data?: T, error?: string }`

3. **枚举**：
   - 简单枚举 → `string`
   - 复杂枚举 → 带类型字段的对象

### JavaScript到Rust

1. **类型检查**：
   - 在Tauri命令中进行运行时类型检查
   - 提供清晰的错误消息

2. **转换规则**：
   - `null/undefined` → `None`
   - `number` → 根据目标类型转换
   - `string` → `String`
   - `Array` → `Vec<T>`
   - `Object` → 结构体或`HashMap`

## 错误处理

### 错误类型

1. **系统错误**：
   ```rust
   std::io::Error
   ```

2. **JSON错误**：
   ```rust
   serde_json::Error
   ```

3. **自定义错误**：
   ```rust
   #[derive(Debug, thiserror::Error)]
   pub enum MyError {
       #[error("Invalid input: {0}")]
       InvalidInput(String),
       
       #[error("IO error: {0}")]
       Io(#[from] std::io::Error),
   }
   ```

### 错误传播

1. **使用Result**：
   ```rust
   fn my_function() -> Result<MyType, MyError>
   ```

2. **错误转换**：
   ```rust
   #[from] std::io::Error
   ```

3. **用户友好消息**：
   - 将技术错误转换为用户可理解的消息
   - 提供解决建议

## 性能考虑

### 序列化优化

1. **跳过默认值**：
   ```rust
   #[serde(skip_serializing_if = "is_default")]
   ```

2. **延迟序列化**：
   - 大型数据结构使用`serde_json::Value`
   - 按需序列化子结构

3. **压缩**：
   - 大型JSON数据考虑压缩
   - 使用二进制格式（如bincode）替代JSON

### 内存优化

1. **引用**：
   - 使用`&str`替代`String`（在可能的情况下）
   - 使用`Cow<str>`处理借用数据

2. **零拷贝**：
   - 避免不必要的克隆
   - 使用引用传递

## 扩展指南

### 添加新类型

1. **定义结构体**：
   ```rust
   #[derive(Debug, Serialize, Deserialize)]
   #[serde(rename_all = "camelCase")]
   pub struct MyType {
       pub field1: String,
       #[serde(skip_serializing_if = "Option::is_none")]
       pub field2: Option<i32>,
   }
   ```

2. **实现转换**：
   ```rust
   impl From<InternalType> for MyType {
       fn from(internal: InternalType) -> Self {
           // 转换逻辑
       }
   }
   ```

3. **添加文档**：
   - 为每个字段添加文档注释
   - 提供JSON示例

### 版本控制

1. **语义化版本**：
   - 遵循SemVer规范
   - 破坏性变更增加主版本号

2. **变更日志**：
   - 记录所有API变更
   - 标注破坏性变更

3. **兼容性**：
   - 保持向后兼容性
   - 提供迁移指南