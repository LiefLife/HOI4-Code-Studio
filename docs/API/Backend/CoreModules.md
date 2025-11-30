# HOI4 Code Studio - 后端核心模块文档

本文档详细记录了HOI4 Code Studio后端的所有Rust核心模块，包括文件树构建、JSON处理、括号匹配等功能模块的实现细节。

## 目录

- [file_tree模块](#file_tree模块)
- [json_decoder模块](#json_decoder模块)
- [bracket_matcher模块](#bracket_matcher模块)
- [country_tags模块](#country_tags模块)
- [idea_registry模块](#idea_registry模块)
- [tag_validator模块](#tag_validator模块)
- [dependency模块](#dependency模块)

## file_tree模块

### 概述

`file_tree`模块负责构建和管理文件系统树结构，提供单线程和多线程两种实现方式，支持大型目录结构的高效遍历。

### 核心结构体

#### FileNode

表示文件树中的单个节点。

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    /// 文件/文件夹名称
    pub name: String,
    /// 完整路径
    pub path: String,
    /// 是否为目录
    pub is_directory: bool,
    /// 子节点（仅目录有）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
    /// 文件大小（字节）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    /// 是否展开（前端状态）
    #[serde(default)]
    pub expanded: bool,
}
```

#### FileTreeResult

文件树构建操作的返回结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct FileTreeResult {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tree: Option<Vec<FileNode>>,
}
```

### 核心函数

#### build_file_tree

单线程版本的文件树构建函数，适合小型目录。

```rust
pub fn build_file_tree(path: &str, max_depth: usize) -> FileTreeResult
```

**实现细节：**
- 使用递归方式遍历目录
- 支持最大深度限制
- 自动排序：目录在前，文件在后
- 按名称不区分大小写排序

**性能特点：**
- 内存占用低
- 适合小型目录（<1000个文件）
- 递归深度受系统栈限制

#### build_file_tree_parallel

多线程版本的文件树构建函数，适合大型目录。

```rust
pub fn build_file_tree_parallel(path: &str, max_depth: usize) -> FileTreeResult
```

**实现细节：**
- 使用Rayon并行处理库
- 采用Arc<Mutex<>>实现线程安全的结果收集
- 每个子目录独立处理
- 最后合并并排序结果

**性能特点：**
- 充分利用多核CPU
- 适合大型目录（>1000个文件）
- 内存占用较高但处理速度快

#### build_tree_recursive

递归构建文件树的内部实现。

```rust
fn build_tree_recursive(
    path: &Path,
    current_depth: usize,
    max_depth: usize,
) -> Result<Vec<FileNode>, std::io::Error>
```

**算法流程：**
1. 检查深度限制
2. 读取目录内容
3. 遍历每个条目
4. 递归处理子目录
5. 创建文件节点
6. 排序并返回结果

#### build_tree_parallel_recursive

并行递归构建文件树的内部实现。

```rust
fn build_tree_parallel_recursive(
    path: &Path,
    current_depth: usize,
    max_depth: usize,
    result: Arc<Mutex<Vec<FileNode>>>,
) -> Result<(), std::io::Error>
```

**算法流程：**
1. 检查深度限制
2. 收集所有目录条目
3. 使用par_iter并行处理
4. 每个线程处理独立子树
5. 合并结果到共享容器

#### filter_by_extensions

根据文件扩展名过滤文件树。

```rust
pub fn filter_by_extensions(nodes: &mut Vec<FileNode>, extensions: &[String])
```

**实现特点：**
- 保留所有目录
- 递归过滤子节点
- 不区分大小写匹配扩展名

### 宏定义

#### error_result!

创建错误结果的宏。

```rust
macro_rules! error_result {
    ($msg:expr) => {
        FileTreeResult {
            success: false,
            message: $msg.to_string(),
            tree: None,
        }
    };
}
```

#### success_result!

创建成功结果的宏。

```rust
macro_rules! success_result {
    ($tree:expr) => {
        FileTreeResult {
            success: true,
            message: "文件树构建成功".to_string(),
            tree: Some($tree),
        }
    };
}
```

### 使用示例

```rust
// 单线程构建
let result = file_tree::build_file_tree("/path/to/directory", 3);

// 多线程构建
let result = file_tree::build_file_tree_parallel("/path/to/directory", 3);

// 过滤特定扩展名
if let Some(ref mut tree) = result.tree {
    file_tree::filter_by_extensions(tree, &["txt".to_string(), "gfx".to_string()]);
}
```

## json_decoder模块

### 概述

`json_decoder`模块提供高性能的JSON解析、序列化和操作功能，支持缓存机制和路径操作。

### 核心结构体

#### JsonDecoder

JSON解码器主结构体，提供缓存功能。

```rust
pub struct JsonDecoder {
    cache: HashMap<String, Value>,
}
```

#### JsonResult

JSON操作结果结构体。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct JsonResult {
    pub success: bool,
    pub message: String,
    pub data: Option<Value>,
}
```

#### JsonValidationResult

JSON验证结果结构体。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct JsonValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
}
```

### 核心方法

#### parse

解析JSON字符串。

```rust
pub fn parse(&mut self, json_str: &str) -> Result<Value, String>
```

**实现细节：**
- 使用serde_json进行解析
- 返回详细的错误信息
- 支持标准JSON格式

#### parse_with_cache

带缓存的JSON解析。

```rust
pub fn parse_with_cache(&mut self, key: String, json_str: &str) -> Result<Value, String>
```

**缓存策略：**
- 使用字符串键值对缓存
- 解析成功后自动缓存
- 后续相同内容直接返回缓存

#### stringify & stringify_pretty

序列化JSON对象。

```rust
pub fn stringify(&self, value: &Value) -> Result<String, String>
pub fn stringify_pretty(&self, value: &Value) -> Result<String, String>
```

**区别：**
- `stringify`: 紧凑格式
- `stringify_pretty`: 格式化输出，带缩进

#### validate

验证JSON格式。

```rust
pub fn validate(&self, json_str: &str) -> JsonValidationResult
```

**验证内容：**
- 语法正确性
- 结构完整性
- 返回详细错误位置

#### merge & deep_merge

合并JSON对象。

```rust
pub fn merge(&self, base: &Value, overlay: &Value) -> Value
pub fn deep_merge(&self, base: &Value, overlay: &Value) -> Value
```

**合并策略：**
- `merge`: 浅合并，直接覆盖同名键
- `deep_merge`: 深度合并，递归合并嵌套对象

#### get_path

获取JSON路径值。

```rust
pub fn get_path(&self, value: &Value, path: &str) -> Option<Value>
```

**路径格式：**
- 点号分隔：`user.profile.name`
- 数组索引：`items.0.name`
- 混合使用：`users.0.profile.age`

#### set_path

设置JSON路径值。

```rust
pub fn set_path(&self, value: &mut Value, path: &str, new_value: Value) -> bool
```

**实现特点：**
- 自动创建中间路径
- 支持数组和对象
- 返回操作是否成功

### Tauri命令实现

#### parse_json

```rust
#[tauri::command]
pub fn parse_json(json_str: String) -> JsonResult
```

#### stringify_json

```rust
#[tauri::command]
pub fn stringify_json(value: Value, pretty: bool) -> JsonResult
```

#### validate_json

```rust
#[tauri::command]
pub fn validate_json(json_str: String) -> JsonValidationResult
```

#### merge_json

```rust
#[tauri::command]
pub fn merge_json(base: Value, overlay: Value, deep: bool) -> JsonResult
```

#### get_json_path

```rust
#[tauri::command]
pub fn get_json_path(value: Value, path: String) -> JsonResult
```

#### set_json_path

```rust
#[tauri::command]
pub fn set_json_path(mut value: Value, path: String, new_value: Value) -> JsonResult
```

#### read_json_file

```rust
#[tauri::command]
pub async fn read_json_file(file_path: String) -> JsonResult
```

#### write_json_file

```rust
#[tauri::command]
pub async fn write_json_file(file_path: String, value: Value, pretty: bool) -> JsonResult
```

### 使用示例

```rust
let mut decoder = JsonDecoder::new();

// 解析JSON
let json_str = r#"{"name": "test", "value": 123}"#;
let value = decoder.parse(json_str)?;

// 获取路径值
let name = decoder.get_path(&value, "name");

// 设置路径值
let mut new_value = value.clone();
decoder.set_path(&mut new_value, "value", json!(456));

// 合并JSON
let base = json!({"a": 1, "b": 2});
let overlay = json!({"b": 3, "c": 4});
let merged = decoder.deep_merge(&base, &overlay);
```

## bracket_matcher模块

### 概述

`bracket_matcher`模块提供高效的括号匹配算法，支持多种括号类型和嵌套结构分析。

### 核心结构体

#### BracketType

括号类型枚举。

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BracketType {
    Round,   // ()
    Square,  // []
    Curly,   // {}
}
```

#### BracketInfo

括号信息结构体。

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BracketInfo {
    /// 括号类型
    pub bracket_type: BracketType,
    /// 起始位置
    pub start: usize,
    /// 结束位置
    pub end: usize,
    /// 嵌套深度
    pub depth: usize,
    /// 是否匹配
    pub matched: bool,
}
```

#### BracketMatchResult

括号匹配结果。

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct BracketMatchResult {
    pub success: bool,
    pub message: String,
    /// 所有括号对
    pub brackets: Vec<BracketInfo>,
    /// 未匹配的括号位置
    pub unmatched: Vec<usize>,
}
```

### 核心函数

#### find_bracket_matches

查找所有括号匹配的主函数。

```rust
pub fn find_bracket_matches(content: &str) -> BracketMatchResult
```

**算法实现：**
1. 使用栈结构跟踪开括号
2. 遇到闭括号时尝试匹配
3. 记录匹配和未匹配的括号
4. 计算嵌套深度
5. 返回完整匹配信息

**时间复杂度：** O(n)，其中n是字符串长度
**空间复杂度：** O(n)，最坏情况下所有字符都是括号

#### find_matching_bracket

查找光标位置的匹配括号。

```rust
pub fn find_matching_bracket(content: &str, cursor_pos: usize) -> Option<usize>
```

**算法流程：**
1. 检查光标位置是否为括号
2. 如果是开括号，向后查找匹配的闭括号
3. 如果是闭括号，向前查找匹配的开括号
4. 考虑嵌套深度

#### find_closing_bracket

向后查找匹配的闭括号。

```rust
fn find_closing_bracket(chars: &[char], start: usize) -> Option<usize>
```

**实现细节：**
- 维护深度计数器
- 遇到相同类型开括号时增加深度
- 遇到匹配闭括号时减少深度
- 深度为0时找到匹配

#### find_opening_bracket

向前查找匹配的开括号。

```rust
fn find_opening_bracket(chars: &[char], start: usize) -> Option<usize>
```

**实现细节：**
- 反向遍历字符数组
- 维护深度计数器
- 遇到相同类型闭括号时增加深度
- 遇到匹配开括号时减少深度

#### get_bracket_depth_map

获取每个字符位置的括号深度。

```rust
pub fn get_bracket_depth_map(content: &str) -> Vec<usize>
```

**应用场景：**
- 代码编辑器的彩虹括号显示
- 语法高亮的深度计算
- 代码折叠的层级判断

### 宏定义

#### is_open_bracket!

判断是否为开括号的宏。

```rust
macro_rules! is_open_bracket {
    ($ch:expr) => {
        matches!($ch, '(' | '[' | '{')
    };
}
```

#### is_close_bracket!

判断是否为闭括号的宏。

```rust
macro_rules! is_close_bracket {
    ($ch:expr) => {
        matches!($ch, ')' | ']' | '}')
    };
}
```

#### brackets_match!

判断括号是否匹配的宏。

```rust
macro_rules! brackets_match {
    ($open:expr, $close:expr) => {
        match ($open, $close) {
            ('(', ')') => true,
            ('[', ']') => true,
            ('{', '}') => true,
            _ => false,
        }
    };
}
```

### 使用示例

```rust
// 查找所有括号匹配
let content = "function test() { return [1, 2, 3]; }";
let result = bracket_matcher::find_bracket_matches(content);

// 查找光标位置的匹配括号
let cursor_pos = 13; // '(' 的位置
let match_pos = bracket_matcher::find_matching_bracket(content, cursor_pos);

// 获取括号深度映射
let depth_map = bracket_matcher::get_bracket_depth_map(content);
```

## country_tags模块

### 概述

`country_tags模块`负责加载、解析和缓存HOI4游戏中的国家标签数据，支持从多个来源（项目、游戏目录、依赖项）合并标签。

### 核心结构体

#### TagSource

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

#### TagEntry

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

#### TagLoadResponse

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

#### TagCacheEntry

缓存条目结构。

```rust
#[derive(Debug, Clone)]
struct TagCacheEntry {
    tags: Vec<TagEntry>,
    timestamps: HashMap<String, Option<SystemTime>>,
}
```

### 全局缓存

#### TAG_CACHE

全局标签缓存，使用RwLock实现线程安全。

```rust
static TAG_CACHE: Lazy<RwLock<HashMap<String, TagCacheEntry>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));
```

### 正则表达式

#### TAG_LINE_REGEX

解析标签行的正则表达式。

```rust
static TAG_LINE_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"^\s*([A-Za-z0-9]{2,4})\s*=\s*"([^"]*)""#)
        .expect("failed to compile tag parser regex")
});
```

**匹配格式：**
- `GER = "德国"`
- `ENG = "英国"`
- `SOV = "苏联"`

### 核心函数

#### load_country_tags

加载国家标签的主函数。

```rust
#[tauri::command]
pub fn load_country_tags(
    project_root: Option<String>,
    game_root: Option<String>,
    dependency_roots: Option<Vec<String>>,
) -> TagLoadResponse
```

**执行流程：**
1. 规范化输入路径
2. 生成缓存键
3. 收集所有标签文件
4. 尝试使用缓存
5. 缓存失效时重新解析
6. 更新缓存并返回结果

#### normalize_root

规范化根路径。

```rust
fn normalize_root(path: Option<&str>) -> Option<String>
```

**处理步骤：**
1. 去除首尾空白
2. 统一分隔符为"/"
3. 去除尾部分隔符
4. 返回None如果路径为空

#### collect_file_infos

收集所有标签文件信息。

```rust
fn collect_file_infos(
    project_root: Option<&str>,
    game_root: Option<&str>,
    dependency_roots: &[String],
) -> io::Result<Vec<TagFileInfo>>
```

**搜索路径：**
- `{root}/common/country_tags/*.txt`
- 递归搜索子目录
- 只包含.txt文件

#### try_use_cache

尝试使用缓存数据。

```rust
fn try_use_cache(cache_key: &str, files: &[TagFileInfo]) -> Option<Vec<TagEntry>>
```

**缓存验证：**
1. 检查缓存是否存在
2. 验证文件数量是否匹配
3. 验证每个文件的时间戳
4. 返回缓存的标签列表

#### is_cache_valid

验证缓存是否仍然有效。

```rust
fn is_cache_valid(entry: &TagCacheEntry, files: &[TagFileInfo]) -> bool
```

**验证条件：**
- 文件数量相同
- 每个文件的修改时间相同
- 文件路径完全匹配

#### parse_tags

解析所有标签文件。

```rust
fn parse_tags(files: &[TagFileInfo]) -> io::Result<Vec<TagEntry>>
```

**解析优先级：**
1. 游戏目录标签（最低优先级）
2. 依赖项标签（中等优先级）
3. 项目标签（最高优先级）

**去重策略：**
- 使用HashMap按代码去重
- 高优先级覆盖低优先级
- 最后按代码排序

#### extract_tags

从单个文件内容中提取标签。

```rust
fn extract_tags(content: &str, source: TagSource) -> Vec<TagEntry>
```

**解析规则：**
1. 跳过注释行（以#开头）
2. 使用正则表达式匹配标签行
3. 提取标签代码和名称
4. 转换为大写代码

#### store_cache

存储标签到缓存。

```rust
fn store_cache(key: &str, tags: &[TagEntry], files: &[TagFileInfo])
```

**存储内容：**
- 标签列表
- 每个文件的修改时间
- 使用缓存键索引

### 使用示例

```rust
// 加载国家标签
let result = country_tags::load_country_tags(
    Some("/path/to/project".to_string()),
    Some("/path/to/game".to_string()),
    Some(vec!["/path/to/dep1".to_string()])
);

if result.success {
    if let Some(tags) = result.tags {
        for tag in tags {
            println!("{}: {} ({})", tag.code, tag.name.unwrap_or_default(), tag.source);
        }
    }
}
```

## idea_registry模块

### 概述

`idea_registry`模块负责加载、解析和缓存HOI4游戏中的Idea数据，支持从多个来源合并Idea定义。

### 核心结构体

#### IdeaSource

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

#### IdeaEntry

单个Idea条目。

```rust
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaEntry {
    pub id: String,
    pub source: IdeaSource,
}
```

#### IdeaLoadResponse

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

#### IdeaCacheEntry

Idea缓存条目。

```rust
#[derive(Debug, Clone)]
struct IdeaCacheEntry {
    ideas: Vec<IdeaEntry>,
    timestamps: HashMap<String, Option<SystemTime>>,
}
```

### 全局缓存

#### IDEA_CACHE

全局Idea缓存。

```rust
static IDEA_CACHE: Lazy<RwLock<HashMap<String, IdeaCacheEntry>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));
```

### 核心函数

#### load_ideas

加载Idea列表的主函数。

```rust
#[tauri::command]
pub fn load_ideas(
    project_root: Option<String>,
    game_root: Option<String>,
    dependency_roots: Option<Vec<String>>,
) -> IdeaLoadResponse
```

**执行流程：**
1. 规范化输入路径
2. 生成缓存键
3. 收集所有Idea文件
4. 尝试使用缓存
5. 缓存失效时重新解析
6. 更新缓存并返回结果

#### reset_idea_cache

重置Idea缓存。

```rust
#[tauri::command]
pub fn reset_idea_cache() -> bool
```

**使用场景：**
- 调试时强制刷新
- 缓存出现问题时的修复

#### collect_file_infos

收集所有Idea文件信息。

```rust
fn collect_file_infos(
    project_root: Option<&str>,
    game_root: Option<&str>,
    dependency_roots: &[String],
) -> io::Result<Vec<IdeaFileInfo>>
```

**搜索路径：**
- `{root}/common/ideas/*.txt`
- 递归搜索子目录
- 只包含.txt文件

#### parse_ideas

并行解析所有Idea文件。

```rust
fn parse_ideas(files: &[IdeaFileInfo]) -> io::Result<Vec<IdeaEntry>>
```

**并行处理：**
- 使用Rayon并行处理每个文件
- 每个文件独立解析
- 最后合并结果并去重

#### extract_ideas

从单个文件内容中提取Idea。

```rust
fn extract_ideas(content: &str) -> Vec<String>
```

**解析算法：**
1. 使用状态机解析
2. 跟踪嵌套层级
3. 识别`ideas`块中的Idea名称
4. 跳过注释和无效内容

**解析规则：**
- 查找`ideas = {`块
- 识别第三层级的Idea名称
- 支持字母、数字、下划线、点、减号

#### is_ident_char

判断字符是否属于Idea标识符。

```rust
fn is_ident_char(ch: char) -> bool
```

**有效字符：**
- 字母（a-z, A-Z）
- 数字（0-9）
- 下划线（_）
- 点（.）
- 减号（-）

### 使用示例

```rust
// 加载Idea列表
let result = idea_registry::load_ideas(
    Some("/path/to/project".to_string()),
    Some("/path/to/game".to_string()),
    Some(vec!["/path/to/dep1".to_string()])
);

if result.success {
    if let Some(ideas) = result.ideas {
        for idea in ideas {
            println!("{} ({})", idea.id, idea.source);
        }
    }
}

// 重置缓存
idea_registry::reset_idea_cache();
```

## tag_validator模块

### 概述

`tag_validator`模块提供标签引用验证功能，检查脚本文件中的国家标签引用是否有效。

### 核心结构体

#### TagValidationError

单个标签验证错误。

```rust
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagValidationError {
    pub line: usize,
    pub message: String,
}
```

#### TagValidationResponse

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

#### TagCache

标签缓存结构。

```rust
#[derive(Debug, Clone)]
struct TagCache {
    tags: HashSet<String>,
    version: u64,
}
```

### 全局缓存

#### TAG_CACHE

全局标签验证缓存。

```rust
static TAG_CACHE: Lazy<RwLock<Option<TagCache>>> = Lazy::new(|| RwLock::new(None));
```

### 正则表达式

#### TARGET_BLOCK_REGEX

匹配目标块中的标签引用。

```rust
static TARGET_BLOCK_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?is)\b[a-zA-Z0-9_\.]+\s*=\s*\{[^{}]*?target\s*=\s*([A-Za-z0-9]{2,4})").unwrap()
});
```

**匹配模式：**
- `target = GER`
- `some_block = { target = ENG }`

#### DIRECT_ASSIGN_REGEX

匹配直接赋值的标签引用。

```rust
static DIRECT_ASSIGN_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)\b(original_tag|tag|add_core_of|owner|ROOT/[A-Za-z0-9_]+|FROM/[A-Za-z0-9_]+)\s*=\s*([A-Za-z0-9]{2,4})",
    )
    .unwrap()
});
```

**匹配模式：**
- `tag = GER`
- `original_tag = ENG`
- `owner = SOV`
- `ROOT/GER = { }`
- `FROM/USA = { }`

#### SCOPE_BLOCK_REGEX

匹配作用域块中的标签引用。

```rust
static SCOPE_BLOCK_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(ROOT|FROM)/([A-Za-z0-9]{2,4})\s*=\s*\{").unwrap()
});
```

### 核心函数

#### validate_tags

标签验证的主函数。

```rust
#[tauri::command]
pub fn validate_tags(
    content: String,
    project_root: Option<String>,
    game_root: Option<String>,
    dependency_roots: Option<Vec<String>>,
) -> TagValidationResponse
```

**执行流程：**
1. 确保标签缓存是最新的
2. 验证输入内容中的标签引用
3. 收集所有验证错误
4. 返回验证结果

#### validate_tags_content

内部验证函数。

```rust
pub fn validate_tags_content(
    content: &str,
    project_root: Option<String>,
    game_root: Option<String>,
    dependency_roots: Option<Vec<String>>,
) -> TagValidationResponse
```

#### ensure_tag_cache

确保标签缓存是最新的。

```rust
fn ensure_tag_cache(
    project_root: Option<String>,
    game_root: Option<String>,
    dependency_roots: Option<Vec<String>>,
) -> HashSet<String>
```

**缓存策略：**
- 每次请求都重新加载标签
- 保持与country_tags模块的缓存一致
- 使用版本号跟踪缓存更新

#### collect_direct_assignments

收集直接赋值的标签引用。

```rust
fn collect_direct_assignments(content: &str) -> Vec<(usize, String)>
```

#### collect_scope_blocks

收集作用域块中的标签引用。

```rust
fn collect_scope_blocks(content: &str) -> Vec<(usize, String)>
```

#### collect_target_blocks

收集目标块中的标签引用。

```rust
fn collect_target_blocks(content: &str) -> Vec<(usize, String)>
```

#### validate_tags_internal

内部验证逻辑。

```rust
fn validate_tags_internal(content: &str, tags: &HashSet<String>) -> Vec<TagValidationError>
```

**验证步骤：**
1. 收集所有类型的标签引用
2. 检查每个引用是否在标签集合中
3. 生成验证错误信息
4. 返回错误列表

### 使用示例

```rust
// 验证标签引用
let content = r#"
target = GER
tag = ENG
ROOT/USA = { }
"#;

let result = tag_validator::validate_tags(
    content.to_string(),
    Some("/path/to/project".to_string()),
    Some("/path/to/game".to_string()),
    Some(vec!["/path/to/dep1".to_string()])
);

if !result.success {
    for error in result.errors {
        println!("行 {}: {}", error.line, error.message);
    }
}
```

## dependency模块

### 概述

`dependency`模块管理项目的依赖项，支持HOICS项目和HOI4 Mod两种类型的依赖项。

### 核心结构体

#### DependencyType

依赖项类型枚举。

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DependencyType {
    Hoics,
    Hoi4mod,
}
```

#### Dependency

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

#### DependencyValidation

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

#### DependencyLoadResult

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

### 核心函数

#### load_dependencies

加载项目的依赖项列表。

```rust
#[tauri::command]
pub fn load_dependencies(project_path: String) -> DependencyLoadResult
```

**执行流程：**
1. 检查project.json是否存在
2. 读取并解析project.json
3. 提取dependencies字段
4. 反序列化为Dependency对象
5. 返回依赖项列表

#### save_dependencies

保存项目的依赖项列表。

```rust
#[tauri::command]
pub fn save_dependencies(
    project_path: String,
    dependencies: Vec<Dependency>,
) -> DependencySaveResult
```

**执行流程：**
1. 读取现有的project.json
2. 更新dependencies字段
3. 序列化并写回文件
4. 返回操作结果

#### validate_dependency_path

验证依赖项路径。

```rust
#[tauri::command]
pub fn validate_dependency_path(path: String) -> DependencyValidation
```

**验证步骤：**
1. 检查路径是否存在
2. 检查是否为目录
3. 检查是否为HOICS项目（project.json存在）
4. 检查是否为HOI4 Mod（descriptor.mod存在）
5. 返回验证结果

**HOICS项目验证：**
- 读取project.json
- 提取项目名称
- 返回Hoics类型

**HOI4 Mod验证：**
- 读取descriptor.mod
- 解析name字段
- 返回Hoi4mod类型

#### index_dependency

索引依赖项的Idea和Tag数据。

```rust
#[tauri::command]
pub fn index_dependency(_dependency_path: String) -> DependencyIndexResult
```

**注意：**
- 此功能将在第二阶段实现
- 当前返回占位结果

### 使用示例

```rust
// 加载依赖项
let result = dependency::load_dependencies("/path/to/project".to_string());

if result.success {
    if let Some(deps) = result.dependencies {
        for dep in deps {
            println!("{}: {} ({})", dep.id, dep.name, dep.dependency_type);
        }
    }
}

// 验证依赖项路径
let validation = dependency::validate_dependency_path("/path/to/dependency".to_string());
if validation.valid {
    println!("有效依赖项: {} ({})", validation.name.unwrap_or_default(), validation.dependency_type.unwrap_or(DependencyType::Hoics));
}

// 保存依赖项
let new_deps = vec![
    Dependency {
        id: "dep1".to_string(),
        name: "Dependency 1".to_string(),
        path: "/path/to/dep1".to_string(),
        dependency_type: DependencyType::Hoics,
        added_at: "2023-01-01T00:00:00Z".to_string(),
        enabled: true,
    }
];

let save_result = dependency::save_dependencies("/path/to/project".to_string(), new_deps);
```

## 模块间协作

### 数据流

1. **country_tags** → **tag_validator**：提供标签数据用于验证
2. **idea_registry** → **dependency**：为依赖项索引提供Idea数据
3. **file_tree** → 所有模块：提供文件系统访问能力
4. **json_decoder** → 所有模块：提供JSON处理能力

### 缓存策略

1. **country_tags**：基于文件修改时间的缓存
2. **idea_registry**：基于文件修改时间的缓存
3. **tag_validator**：依赖country_tags的缓存

### 错误处理

所有模块都遵循统一的错误处理模式：
- 使用Result类型传播错误
- 提供详细的错误信息
- 在适当的地方进行错误恢复

### 性能优化

1. **并行处理**：使用Rayon进行CPU密集型任务的并行化
2. **缓存机制**：避免重复计算和文件读取
3. **惰性加载**：按需加载数据
4. **内存管理**：及时释放不需要的资源

## 扩展指南

### 添加新模块

1. 在`src-tauri/src`目录下创建新模块文件
2. 在`lib.rs`中添加模块声明
3. 实现必要的结构体和函数
4. 添加Tauri命令（如果需要）
5. 编写单元测试

### 模块最佳实践

1. **单一职责**：每个模块只负责一个特定功能
2. **接口清晰**：提供明确的公共接口
3. **错误处理**：妥善处理所有可能的错误情况
4. **文档完整**：为所有公共函数提供文档
5. **测试覆盖**：编写全面的单元测试