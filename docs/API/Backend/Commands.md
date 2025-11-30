# HOI4 Code Studio - 后端命令API文档

本文档详细记录了HOI4 Code Studio后端的所有Tauri命令API，包括项目管理、文件操作、设置管理等功能。

## 目录

- [项目管理API](#项目管理api)
- [文件操作API](#文件操作api)
- [设置管理API](#设置管理api)
- [搜索功能API](#搜索功能api)
- [文件树构建API](#文件树构建api)
- [JSON处理API](#json处理api)
- [括号匹配API](#括号匹配api)
- [国家标签API](#国家标签api)
- [Idea注册API](#idea注册api)
- [标签验证API](#标签验证api)
- [依赖项管理API](#依赖项管理api)
- [项目打包API](#项目打包api)
- [图片处理API](#图片处理api)
- [系统API](#系统api)

## 项目管理API

### create_new_project

创建新的HOI4 Code Studio项目。

```rust
#[tauri::command]
fn create_new_project(
    project_name: String,
    version: String,
    project_path: String,
    replace_path: Vec<String>,
) -> CreateProjectResult
```

**参数：**
- `project_name` (String): 项目名称
- `version` (String): 项目版本
- `project_path` (String): 项目创建路径
- `replace_path` (Vec<String>): 替换路径列表

**返回值：**
- `CreateProjectResult`: 包含操作结果和项目路径

**示例：**
```javascript
const result = await invoke('create_new_project', {
  projectName: 'My Mod',
  version: '1.0.0',
  projectPath: '/path/to/projects',
  replacePath: ['gfx/interface', 'common']
});
```

**错误处理：**
- 项目名称为空时返回错误
- 项目目录已存在时返回错误
- 创建目录失败时返回错误

**性能考虑：**
- 创建多个子目录可能需要较长时间
- 大量replace_path会增加创建时间

### initialize_project

为非HOICS项目创建配置文件。

```rust
#[tauri::command]
fn initialize_project(project_path: String) -> OpenProjectResult
```

**参数：**
- `project_path` (String): 项目路径

**返回值：**
- `OpenProjectResult`: 包含操作结果和项目数据

**示例：**
```javascript
const result = await invoke('initialize_project', {
  projectPath: '/path/to/existing/mod'
});
```

**错误处理：**
- 项目目录不存在时返回错误
- 项目已存在配置文件时返回错误

### open_project

打开现有的HOI4 Code Studio项目。

```rust
#[tauri::command]
fn open_project(project_path: String) -> OpenProjectResult
```

**参数：**
- `project_path` (String): 项目路径

**返回值：**
- `OpenProjectResult`: 包含操作结果和项目数据

**示例：**
```javascript
const result = await invoke('open_project', {
  projectPath: '/path/to/project'
});
```

**错误处理：**
- 项目目录不存在时返回错误
- 配置文件不存在时提示初始化
- 解析配置文件失败时返回错误

### get_recent_projects

获取最近打开的项目列表。

```rust
#[tauri::command]
fn get_recent_projects() -> RecentProjectsResult
```

**返回值：**
- `RecentProjectsResult`: 包含最近项目列表

**示例：**
```javascript
const result = await invoke('get_recent_projects');
console.log(result.projects); // 最近项目列表
```

**性能考虑：**
- 自动限制为最近10个项目
- 按最后打开时间排序

## 文件操作API

### read_directory

读取目录内容。

```rust
#[tauri::command]
fn read_directory(dir_path: String) -> serde_json::Value
```

**参数：**
- `dir_path` (String): 目录路径

**返回值：**
- JSON对象，包含success、message和files字段

**示例：**
```javascript
const result = await invoke('read_directory', {
  dirPath: '/path/to/directory'
});
```

**错误处理：**
- 目录不存在时返回错误
- 权限不足时返回错误

### read_file_content

读取文件内容（支持多种编码）。

```rust
#[tauri::command]
fn read_file_content(file_path: String) -> serde_json::Value
```

**参数：**
- `file_path` (String): 文件路径

**返回值：**
- JSON对象，包含success、message、content和encoding字段

**示例：**
```javascript
const result = await invoke('read_file_content', {
  filePath: '/path/to/file.txt'
});
```

**特性：**
- 自动检测文件编码
- 支持UTF-8、GBK、BIG5等多种编码
- 图片文件返回特殊标识

### write_file_content

写入文件内容。

```rust
#[tauri::command]
fn write_file_content(file_path: String, content: String) -> serde_json::Value
```

**参数：**
- `file_path` (String): 文件路径
- `content` (String): 文件内容

**返回值：**
- JSON对象，包含success和message字段

**示例：**
```javascript
const result = await invoke('write_file_content', {
  filePath: '/path/to/file.txt',
  content: 'Hello, World!'
});
```

### create_file

创建新文件。

```rust
#[tauri::command]
fn create_file(file_path: String, content: String, use_bom: bool) -> serde_json::Value
```

**参数：**
- `file_path` (String): 文件路径
- `content` (String): 文件内容
- `use_bom` (bool): 是否使用UTF-8 BOM

**返回值：**
- JSON对象，包含操作结果

**示例：**
```javascript
const result = await invoke('create_file', {
  filePath: '/path/to/new_file.txt',
  content: 'Initial content',
  useBom: true
});
```

### create_folder

创建新文件夹。

```rust
#[tauri::command]
fn create_folder(folder_path: String) -> serde_json::Value
```

**参数：**
- `folder_path` (String): 文件夹路径

**返回值：**
- JSON对象，包含操作结果

**示例：**
```javascript
const result = await invoke('create_folder', {
  folderPath: '/path/to/new_folder'
});
```

### rename_path

重命名文件或文件夹。

```rust
#[tauri::command]
fn rename_path(old_path: String, new_path: String) -> serde_json::Value
```

**参数：**
- `old_path` (String): 原路径
- `new_path` (String): 新路径

**返回值：**
- JSON对象，包含操作结果

**示例：**
```javascript
const result = await invoke('rename_path', {
  oldPath: '/path/to/old_name',
  newPath: '/path/to/new_name'
});
```

## 设置管理API

### load_settings

加载应用程序设置。

```rust
#[tauri::command]
fn load_settings() -> JsonResult
```

**返回值：**
- `JsonResult`: 包含设置数据

**示例：**
```javascript
const result = await invoke('load_settings');
console.log(result.data); // 设置对象
```

**默认设置：**
```json
{
  "gameDirectory": "",
  "autoSave": true,
  "showGrid": false,
  "syntaxHighlight": true
}
```

### save_settings

保存应用程序设置。

```rust
#[tauri::command]
fn save_settings(settings: serde_json::Value) -> JsonResult
```

**参数：**
- `settings` (serde_json::Value): 设置对象

**返回值：**
- `JsonResult`: 包含操作结果

**示例：**
```javascript
const result = await invoke('save_settings', {
  gameDirectory: '/path/to/hoi4',
  autoSave: true,
  showGrid: true
});
```

### validate_game_directory

验证游戏目录有效性。

```rust
#[tauri::command]
fn validate_game_directory(path: String) -> serde_json::Value
```

**参数：**
- `path` (String): 游戏目录路径

**返回值：**
- JSON对象，包含valid和message字段

**验证条件：**
- 目录必须存在
- 必须包含特定子目录（common、history、events、interface中的至少2个）

**示例：**
```javascript
const result = await invoke('validate_game_directory', {
  path: '/path/to/hoi4'
});
```

## 搜索功能API

### search_files

在目录中搜索文件内容。

```rust
#[tauri::command]
fn search_files(
    directory_path: String,
    query: String,
    case_sensitive: bool,
    use_regex: bool,
    include_all_files: bool,
) -> serde_json::Value
```

**参数：**
- `directory_path` (String): 搜索目录路径
- `query` (String): 搜索关键词
- `case_sensitive` (bool): 是否区分大小写
- `use_regex` (bool): 是否使用正则表达式
- `include_all_files` (bool): 是否包含所有文件类型

**返回值：**
- JSON对象，包含搜索结果列表

**示例：**
```javascript
const result = await invoke('search_files', {
  directoryPath: '/path/to/project',
  query: 'GER',
  caseSensitive: false,
  useRegex: false,
  includeAllFiles: true
});
```

**性能考虑：**
- 使用多线程并行搜索
- 大型项目可能需要较长时间
- 默认只搜索.txt、.gfx、.mod文件

## 文件树构建API

### build_directory_tree

构建文件树（单线程版本）。

```rust
#[tauri::command]
fn build_directory_tree(path: String, max_depth: usize) -> FileTreeResult
```

**参数：**
- `path` (String): 目录路径
- `max_depth` (usize): 最大递归深度（0表示无限制）

**返回值：**
- `FileTreeResult`: 包含文件树结构

**示例：**
```javascript
const result = await invoke('build_directory_tree', {
  path: '/path/to/directory',
  maxDepth: 3
});
```

### build_directory_tree_fast

构建文件树（多线程版本）。

```rust
#[tauri::command]
fn build_directory_tree_fast(path: String, max_depth: usize) -> FileTreeResult
```

**参数：**
- `path` (String): 目录路径
- `max_depth` (usize): 最大递归深度

**返回值：**
- `FileTreeResult`: 包含文件树结构

**性能考虑：**
- 使用Rayon并行处理
- 适合大型目录结构
- 比单线程版本更快

## JSON处理API

### parse_json

解析JSON字符串。

```rust
#[tauri::command]
pub fn parse_json(json_str: String) -> JsonResult
```

**参数：**
- `json_str` (String): JSON字符串

**返回值：**
- `JsonResult`: 包含解析结果

**示例：**
```javascript
const result = await invoke('parse_json', {
  jsonStr: '{"name": "test", "value": 123}'
});
```

### stringify_json

序列化JSON对象。

```rust
#[tauri::command]
pub fn stringify_json(value: Value, pretty: bool) -> JsonResult
```

**参数：**
- `value` (Value): JSON值
- `pretty` (bool): 是否格式化输出

**返回值：**
- `JsonResult`: 包含序列化结果

**示例：**
```javascript
const result = await invoke('stringify_json', {
  value: { name: "test", value: 123 },
  pretty: true
});
```

### validate_json

验证JSON格式。

```rust
#[tauri::command]
pub fn validate_json(json_str: String) -> JsonValidationResult
```

**参数：**
- `json_str` (String): JSON字符串

**返回值：**
- `JsonValidationResult`: 包含验证结果

**示例：**
```javascript
const result = await invoke('validate_json', {
  jsonStr: '{"name": "test", "value": 123}'
});
```

### merge_json

合并JSON对象。

```rust
#[tauri::command]
pub fn merge_json(base: Value, overlay: Value, deep: bool) -> JsonResult
```

**参数：**
- `base` (Value): 基础JSON对象
- `overlay` (Value): 覆盖JSON对象
- `deep` (bool): 是否深度合并

**返回值：**
- `JsonResult`: 包含合并结果

**示例：**
```javascript
const result = await invoke('merge_json', {
  base: { a: 1, b: 2 },
  overlay: { b: 3, c: 4 },
  deep: true
});
```

### get_json_path

获取JSON路径值。

```rust
#[tauri::command]
pub fn get_json_path(value: Value, path: String) -> JsonResult
```

**参数：**
- `value` (Value): JSON值
- `path` (String): 路径（点号分隔）

**返回值：**
- `JsonResult`: 包含路径值

**示例：**
```javascript
const result = await invoke('get_json_path', {
  value: { user: { name: "Alice", age: 30 } },
  path: "user.name"
});
```

### set_json_path

设置JSON路径值。

```rust
#[tauri::command]
pub fn set_json_path(mut value: Value, path: String, new_value: Value) -> JsonResult
```

**参数：**
- `value` (Value): JSON值
- `path` (String): 路径（点号分隔）
- `new_value` (Value): 新值

**返回值：**
- `JsonResult`: 包含更新后的JSON

**示例：**
```javascript
const result = await invoke('set_json_path', {
  value: { user: { name: "Alice", age: 30 } },
  path: "user.age",
  newValue: 31
});
```

### read_json_file

读取JSON文件。

```rust
#[tauri::command]
pub async fn read_json_file(file_path: String) -> JsonResult
```

**参数：**
- `file_path` (String): 文件路径

**返回值：**
- `JsonResult`: 包含文件内容

**示例：**
```javascript
const result = await invoke('read_json_file', {
  filePath: '/path/to/file.json'
});
```

### write_json_file

写入JSON文件。

```rust
#[tauri::command]
pub async fn write_json_file(file_path: String, value: Value, pretty: bool) -> JsonResult
```

**参数：**
- `file_path` (String): 文件路径
- `value` (Value): JSON值
- `pretty` (bool): 是否格式化输出

**返回值：**
- `JsonResult`: 包含操作结果

**示例：**
```javascript
const result = await invoke('write_json_file', {
  filePath: '/path/to/file.json',
  value: { name: "test" },
  pretty: true
});
```

## 括号匹配API

### match_brackets

查找所有括号匹配。

```rust
#[tauri::command]
fn match_brackets(content: String) -> BracketMatchResult
```

**参数：**
- `content` (String): 文本内容

**返回值：**
- `BracketMatchResult`: 包含括号匹配信息

**示例：**
```javascript
const result = await invoke('match_brackets', {
  content: 'function test() { return [1, 2, 3]; }'
});
```

### find_bracket_pair

查找光标位置的匹配括号。

```rust
#[tauri::command]
fn find_bracket_pair(content: String, cursor_pos: usize) -> Option<usize>
```

**参数：**
- `content` (String): 文本内容
- `cursor_pos` (usize): 光标位置

**返回值：**
- `Option<usize>`: 匹配括号位置

**示例：**
```javascript
const result = await invoke('find_bracket_pair', {
  content: 'function test() { }',
  cursorPos: 13 // '(' 的位置
});
```

### get_bracket_depths

获取括号深度映射。

```rust
#[tauri::command]
fn get_bracket_depths(content: String) -> Vec<usize>
```

**参数：**
- `content` (String): 文本内容

**返回值：**
- `Vec<usize>`: 每个位置的括号深度

**示例：**
```javascript
const result = await invoke('get_bracket_depths', {
  content: '{ [ ( ) ] }'
});
```

## 国家标签API

### load_country_tags

加载国家标签列表。

```rust
#[tauri::command]
pub fn load_country_tags(
    project_root: Option<String>,
    game_root: Option<String>,
    dependency_roots: Option<Vec<String>>,
) -> TagLoadResponse
```

**参数：**
- `project_root` (Option<String>): 项目根目录
- `game_root` (Option<String>): 游戏根目录
- `dependency_roots` (Option<Vec<String>>): 依赖项根目录列表

**返回值：**
- `TagLoadResponse`: 包含标签列表

**示例：**
```javascript
const result = await invoke('load_country_tags', {
  projectRoot: '/path/to/project',
  gameRoot: '/path/to/game',
  dependencyRoots: ['/path/to/dep1', '/path/to/dep2']
});
```

**性能考虑：**
- 使用缓存机制提高性能
- 按优先级合并标签（游戏 > 依赖 > 项目）
- 大型项目可能需要较长时间首次加载

## Idea注册API

### load_ideas

加载Idea列表。

```rust
#[tauri::command]
pub fn load_ideas(
    project_root: Option<String>,
    game_root: Option<String>,
    dependency_roots: Option<Vec<String>>,
) -> IdeaLoadResponse
```

**参数：**
- `project_root` (Option<String>): 项目根目录
- `game_root` (Option<String>): 游戏根目录
- `dependency_roots` (Option<Vec<String>>): 依赖项根目录列表

**返回值：**
- `IdeaLoadResponse`: 包含Idea列表

**示例：**
```javascript
const result = await invoke('load_ideas', {
  projectRoot: '/path/to/project',
  gameRoot: '/path/to/game',
  dependencyRoots: ['/path/to/dep1', '/path/to/dep2']
});
```

### reset_idea_cache

重置Idea缓存。

```rust
#[tauri::command]
pub fn reset_idea_cache() -> bool
```

**返回值：**
- `bool`: 是否成功重置

**示例：**
```javascript
const result = await invoke('reset_idea_cache');
```

## 标签验证API

### validate_tags

验证标签引用。

```rust
#[tauri::command]
pub fn validate_tags(
    content: String,
    project_root: Option<String>,
    game_root: Option<String>,
    dependency_roots: Option<Vec<String>>,
) -> TagValidationResponse
```

**参数：**
- `content` (String): 文本内容
- `project_root` (Option<String>): 项目根目录
- `game_root` (Option<String>): 游戏根目录
- `dependency_roots` (Option<Vec<String>>): 依赖项根目录列表

**返回值：**
- `TagValidationResponse`: 包含验证结果

**示例：**
```javascript
const result = await invoke('validate_tags', {
  content: 'target = GER',
  projectRoot: '/path/to/project',
  gameRoot: '/path/to/game',
  dependencyRoots: ['/path/to/dep1']
});
```

**验证模式：**
- 直接赋值：`tag = GER`
- 作用域块：`ROOT/GER = { }`
- 目标块：`target = GER`

## 依赖项管理API

### load_dependencies

加载项目的依赖项列表。

```rust
#[tauri::command]
pub fn load_dependencies(project_path: String) -> DependencyLoadResult
```

**参数：**
- `project_path` (String): 项目路径

**返回值：**
- `DependencyLoadResult`: 包含依赖项列表

**示例：**
```javascript
const result = await invoke('load_dependencies', {
  projectPath: '/path/to/project'
});
```

### save_dependencies

保存项目的依赖项列表。

```rust
#[tauri::command]
pub fn save_dependencies(
    project_path: String,
    dependencies: Vec<Dependency>,
) -> DependencySaveResult
```

**参数：**
- `project_path` (String): 项目路径
- `dependencies` (Vec<Dependency>): 依赖项列表

**返回值：**
- `DependencySaveResult`: 包含操作结果

**示例：**
```javascript
const result = await invoke('save_dependencies', {
  projectPath: '/path/to/project',
  dependencies: [
    {
      id: 'dep1',
      name: 'Dependency 1',
      path: '/path/to/dep1',
      type: 'hoics',
      addedAt: '2023-01-01T00:00:00Z',
      enabled: true
    }
  ]
});
```

### validate_dependency_path

验证依赖项路径。

```rust
#[tauri::command]
pub fn validate_dependency_path(path: String) -> DependencyValidation
```

**参数：**
- `path` (String): 依赖项路径

**返回值：**
- `DependencyValidation`: 包含验证结果

**示例：**
```javascript
const result = await invoke('validate_dependency_path', {
  path: '/path/to/dependency'
});
```

**验证类型：**
- HOICS项目（存在project.json）
- HOI4 Mod（存在descriptor.mod）

### index_dependency

索引依赖项的Idea和Tag数据。

```rust
#[tauri::command]
pub fn index_dependency(_dependency_path: String) -> DependencyIndexResult
```

**参数：**
- `_dependency_path` (String): 依赖项路径

**返回值：**
- `DependencyIndexResult`: 包含索引结果

**注意：**
- 此功能将在第二阶段实现

## 项目打包API

### pack_project

打包项目到ZIP文件。

```rust
#[tauri::command]
fn pack_project(opts: PackageOptions) -> PackageResult
```

**参数：**
- `opts` (PackageOptions): 打包选项

**返回值：**
- `PackageResult`: 包含打包结果

**示例：**
```javascript
const result = await invoke('pack_project', {
  projectPath: '/path/to/project',
  outputName: 'my_mod.zip',
  excludeDependencies: true
});
```

**排除项：**
- node_modules
- target
- .git
- .idea
- .vscode
- .windsurf
- package目录

## 图片处理API

### read_image_as_base64

读取图片文件为base64。

```rust
#[tauri::command]
fn read_image_as_base64(file_path: String) -> ImageReadResult
```

**参数：**
- `file_path` (String): 图片文件路径

**返回值：**
- `ImageReadResult`: 包含base64数据和MIME类型

**支持格式：**
- PNG
- JPG/JPEG
- GIF
- BMP
- WebP
- SVG
- DDS（转换为PNG）
- TGA（转换为PNG）

**示例：**
```javascript
const result = await invoke('read_image_as_base64', {
  filePath: '/path/to/image.png'
});
```

### load_focus_icon

加载国策图标。

```rust
#[tauri::command]
fn load_focus_icon(
    icon_name: String,
    project_root: Option<String>,
    game_root: Option<String>,
) -> ImageReadResult
```

**参数：**
- `icon_name` (String): 图标名称
- `project_root` (Option<String>): 项目根目录
- `game_root` (Option<String>): 游戏根目录

**返回值：**
- `ImageReadResult`: 包含图标数据

**搜索路径：**
- 项目/interface/*.gfx
- 依赖项/interface/*.gfx
- 游戏/interface/*.gfx

**示例：**
```javascript
const result = await invoke('load_focus_icon', {
  iconName: 'GER_focus_1',
  projectRoot: '/path/to/project',
  gameRoot: '/path/to/game'
});
```

### read_icon_cache

读取图标缓存。

```rust
#[tauri::command]
fn read_icon_cache(icon_name: String) -> serde_json::Value
```

**参数：**
- `icon_name` (String): 图标名称

**返回值：**
- JSON对象，包含缓存数据

**示例：**
```javascript
const result = await invoke('read_icon_cache', {
  iconName: 'GER_focus_1'
});
```

### write_icon_cache

写入图标缓存。

```rust
#[tauri::command]
fn write_icon_cache(icon_name: String, base64: String, mime_type: String) -> serde_json::Value
```

**参数：**
- `icon_name` (String): 图标名称
- `base64` (String): base64数据
- `mime_type` (String): MIME类型

**返回值：**
- JSON对象，包含操作结果

**注意：**
- 只支持PNG格式缓存

**示例：**
```javascript
const result = await invoke('write_icon_cache', {
  iconName: 'GER_focus_1',
  base64: 'iVBORw0KGgoAAAANSUhEUgAA...',
  mimeType: 'image/png'
});
```

### clear_icon_cache

清理图标缓存。

```rust
#[tauri::command]
fn clear_icon_cache() -> serde_json::Value
```

**返回值：**
- JSON对象，包含操作结果

**示例：**
```javascript
const result = await invoke('clear_icon_cache');
```

## 系统API

### open_file_dialog

打开文件选择对话框。

```rust
#[tauri::command]
async fn open_file_dialog(mode: String) -> FileDialogResult
```

**参数：**
- `mode` (String): 对话框模式（"directory"或"file"）

**返回值：**
- `FileDialogResult`: 包含选择的路径

**示例：**
```javascript
// 选择目录
const dirResult = await invoke('open_file_dialog', {
  mode: 'directory'
});

// 选择文件
const fileResult = await invoke('open_file_dialog', {
  mode: 'file'
});
```

### launch_game

启动游戏。

```rust
#[tauri::command]
fn launch_game() -> LaunchGameResult
```

**返回值：**
- `LaunchGameResult`: 包含启动结果

**启动方式：**
- Steam版本
- 学习版（仅Windows）

**示例：**
```javascript
const result = await invoke('launch_game');
```

### open_folder

打开文件夹。

```rust
#[tauri::command]
fn open_folder(path: String) -> serde_json::Value
```

**参数：**
- `path` (String): 文件夹路径

**返回值：**
- JSON对象，包含操作结果

**示例：**
```javascript
const result = await invoke('open_folder', {
  path: '/path/to/folder'
});
```

### exit_application

退出应用程序。

```rust
#[tauri::command]
fn exit_application()
```

**示例：**
```javascript
await invoke('exit_application');
```

### open_settings

打开设置页面。

```rust
#[tauri::command]
fn open_settings() -> serde_json::Value
```

**返回值：**
- JSON对象，包含操作结果

**示例：**
```javascript
const result = await invoke('open_settings');
```

## 错误处理

所有API都遵循统一的错误处理模式：

1. **返回结构**：每个API都返回包含`success`字段的对象
2. **错误信息**：失败时提供详细的错误消息
3. **错误类型**：根据不同的错误类型返回相应的错误代码

## 性能优化建议

1. **缓存机制**：国家标签和Idea加载使用缓存提高性能
2. **并行处理**：文件树构建和搜索使用多线程
3. **增量更新**：避免重复加载相同数据
4. **内存管理**：及时释放不需要的资源

## 安全考虑

1. **路径验证**：所有文件操作都进行路径验证
2. **权限检查**：确保有足够的权限执行操作
3. **输入验证**：验证所有输入参数的有效性
4. **资源限制**：限制资源使用防止滥用