# Tauri API 文档

本文档详细描述了 HOI4 Code Studio 前端与 Rust 后端通信的 Tauri API 接口。这些 API 提供了文件系统操作、项目管理、系统级功能调用等核心功能。

## 📋 目录

- [项目管理](#项目管理)
- [文件操作](#文件操作)
- [设置管理](#设置管理)
- [JSON 操作](#json-操作)
- [搜索功能](#搜索功能)
- [文件树构建](#文件树构建)
- [括号匹配](#括号匹配)
- [国家标签](#国家标签)
- [Idea 管理](#idea-管理)
- [依赖项管理](#依赖项管理)
- [项目打包](#项目打包)
- [图片处理](#图片处理)
- [图标缓存](#图标缓存)
- [其他功能](#其他功能)

## 🏗️ 类型定义

### 基础类型

```typescript
// 项目创建结果
export interface CreateProjectResult {
  success: boolean
  message: string
  project_path?: string
}

// 项目数据接口
export interface ProjectData {
  name: string
  version: string
  path: string
  [key: string]: unknown
}

// 项目打开结果
export interface OpenProjectResult {
  success: boolean
  message: string
  project_data?: ProjectData
}

// 最近项目
export interface RecentProject {
  name: string
  path: string
  last_opened: string
}

// 最近项目列表结果
export interface RecentProjectsResult {
  success: boolean
  projects: RecentProject[]
}

// 文件对话框结果
export interface FileDialogResult {
  success: boolean
  path?: string
}

// JSON 操作结果
export interface JsonResult<T = unknown> {
  success: boolean
  message: string
  data?: T
}

// JSON 验证结果
export interface JsonValidationResult {
  valid: boolean
  errors: string[]
}

// 文件操作结果
export interface FileOperationResult {
  success: boolean
  message: string
}

// 目录条目
export interface DirectoryEntry {
  name: string
  path: string
  is_directory: boolean
  size?: number
}

// 目录读取结果
export interface DirectoryResult {
  success: boolean
  message: string
  entries?: DirectoryEntry[]
}

// 文件内容结果
export interface FileContentResult {
  success: boolean
  message: string
  content: string
  encoding?: string
  is_binary?: boolean
  is_image?: boolean
}
```

## 📁 项目管理

### createNewProject

创建新的 HOI4 项目。

```typescript
async function createNewProject(
  projectName: string,
  version: string,
  projectPath: string,
  replacePath: string[]
): Promise<CreateProjectResult>
```

**参数：**
- `projectName`: 项目名称
- `version`: 项目版本
- `projectPath`: 项目路径
- `replacePath`: 替换路径数组

**返回值：**
- `CreateProjectResult`: 创建结果，包含成功状态和项目路径

**示例：**
```typescript
const result = await createNewProject(
  "My Mod",
  "1.0.0",
  "/path/to/project",
  ["common/", "events/"]
);

if (result.success) {
  console.log(`项目创建成功: ${result.project_path}`);
} else {
  console.error(`创建失败: ${result.message}`);
}
```

### openProject

打开现有项目。

```typescript
async function openProject(projectPath: string): Promise<OpenProjectResult>
```

**参数：**
- `projectPath`: 项目路径

**返回值：**
- `OpenProjectResult`: 打开结果，包含项目数据

**示例：**
```typescript
const result = await openProject("/path/to/existing/project");

if (result.success && result.project_data) {
  console.log(`项目 "${result.project_data.name}" 已打开`);
}
```

### initializeProject

初始化项目结构。

```typescript
async function initializeProject(projectPath: string): Promise<OpenProjectResult>
```

**参数：**
- `projectPath`: 项目路径

**返回值：**
- `OpenProjectResult`: 初始化结果

### getRecentProjects

获取最近打开的项目列表。

```typescript
async function getRecentProjects(): Promise<RecentProjectsResult>
```

**返回值：**
- `RecentProjectsResult`: 包含最近项目列表的结果

**示例：**
```typescript
const result = await getRecentProjects();

if (result.success) {
  result.projects.forEach(project => {
    console.log(`${project.name} - ${project.path} (${project.last_opened})`);
  });
}
```

### openFileDialog

打开文件选择对话框。

```typescript
async function openFileDialog(mode: 'directory' | 'file'): Promise<FileDialogResult>
```

**参数：**
- `mode`: 对话框模式，'directory' 或 'file'

**返回值：**
- `FileDialogResult`: 包含选中路径的结果

**示例：**
```typescript
// 选择目录
const dirResult = await openFileDialog('directory');
if (dirResult.success) {
  console.log(`选择的目录: ${dirResult.path}`);
}

// 选择文件
const fileResult = await openFileDialog('file');
if (fileResult.success) {
  console.log(`选择的文件: ${fileResult.path}`);
}
```

## 📂 文件操作

### readDirectory

读取目录内容。

```typescript
async function readDirectory(dirPath: string): Promise<DirectoryResult>
```

**参数：**
- `dirPath`: 目录路径

**返回值：**
- `DirectoryResult`: 包含目录条目的结果

**示例：**
```typescript
const result = await readDirectory("/path/to/directory");

if (result.success && result.entries) {
  result.entries.forEach(entry => {
    if (entry.is_directory) {
      console.log(`[目录] ${entry.name}`);
    } else {
      console.log(`[文件] ${entry.name} (${entry.size} 字节)`);
    }
  });
}
```

### createFile

创建新文件。

```typescript
async function createFile(
  filePath: string, 
  content: string, 
  useBom: boolean = false
): Promise<FileOperationResult>
```

**参数：**
- `filePath`: 文件路径
- `content`: 文件内容
- `useBom`: 是否使用 BOM（默认 false）

**返回值：**
- `FileOperationResult`: 操作结果

**示例：**
```typescript
const result = await createFile(
  "/path/to/file.txt",
  "Hello, HOI4!",
  false
);

if (result.success) {
  console.log("文件创建成功");
}
```

### createFolder

创建新文件夹。

```typescript
async function createFolder(folderPath: string): Promise<FileOperationResult>
```

**参数：**
- `folderPath`: 文件夹路径

**返回值：**
- `FileOperationResult`: 操作结果

### renamePath

重命名文件或文件夹。

```typescript
async function renamePath(oldPath: string, newPath: string): Promise<FileOperationResult>
```

**参数：**
- `oldPath`: 原路径
- `newPath`: 新路径

**返回值：**
- `FileOperationResult`: 操作结果

### openFolder

在系统文件管理器中打开文件夹。

```typescript
async function openFolder(path: string): Promise<FileOperationResult>
```

**参数：**
- `path`: 文件夹路径

**返回值：**
- `FileOperationResult`: 操作结果

### readFileContent

读取文件内容。

```typescript
async function readFileContent(filePath: string): Promise<FileContentResult>
```

**参数：**
- `filePath`: 文件路径

**返回值：**
- `FileContentResult`: 包含文件内容的结果

**示例：**
```typescript
const result = await readFileContent("/path/to/file.txt");

if (result.success) {
  console.log(`文件内容: ${result.content}`);
  console.log(`编码: ${result.encoding}`);
  
  if (result.is_binary) {
    console.warn("警告: 文件包含二进制数据");
  }
}
```

### writeFileContent

写入文件内容。

```typescript
async function writeFileContent(filePath: string, content: string): Promise<FileOperationResult>
```

**参数：**
- `filePath`: 文件路径
- `content`: 文件内容

**返回值：**
- `FileOperationResult`: 操作结果

## ⚙️ 设置管理

### loadSettings

加载应用程序设置。

```typescript
async function loadSettings(): Promise<JsonResult>
```

**返回值：**
- `JsonResult`: 包含设置数据的结果

**示例：**
```typescript
const result = await loadSettings();

if (result.success && result.data) {
  const settings = result.data as Record<string, unknown>;
  console.log(`游戏目录: ${settings.gameDirectory}`);
  console.log(`主题: ${settings.theme}`);
}
```

### saveSettings

保存应用程序设置。

```typescript
async function saveSettings(settings: Settings): Promise<JsonResult>
```

**参数：**
- `settings`: 设置对象

**返回值：**
- `JsonResult`: 保存结果

**示例：**
```typescript
const result = await saveSettings({
  gameDirectory: "/path/to/hoi4",
  theme: "onedark",
  autoSave: true
});

if (result.success) {
  console.log("设置保存成功");
}
```

### validateGameDirectory

验证游戏目录是否有效。

```typescript
async function validateGameDirectory(path: string): Promise<{ valid: boolean; message: string }>
```

**参数：**
- `path`: 游戏目录路径

**返回值：**
- 包含验证状态和消息的对象

**示例：**
```typescript
const result = await validateGameDirectory("/path/to/hoi4");

if (result.valid) {
  console.log("游戏目录有效");
} else {
  console.error(`游戏目录无效: ${result.message}`);
}
```

## 📄 JSON 操作

### parseJson

解析 JSON 字符串。

```typescript
async function parseJson(jsonStr: string): Promise<JsonResult>
```

**参数：**
- `jsonStr`: JSON 字符串

**返回值：**
- `JsonResult`: 解析结果，包含解析后的对象

### stringifyJson

序列化 JSON 对象。

```typescript
async function stringifyJson(value: unknown, pretty: boolean = true): Promise<JsonResult<string>>
```

**参数：**
- `value`: 要序列化的值
- `pretty`: 是否格式化输出（默认 true）

**返回值：**
- `JsonResult<string>`: 序列化结果，包含 JSON 字符串

### validateJson

验证 JSON 格式。

```typescript
async function validateJson(jsonStr: string): Promise<JsonValidationResult>
```

**参数：**
- `jsonStr`: JSON 字符串

**返回值：**
- `JsonValidationResult`: 验证结果，包含错误列表

**示例：**
```typescript
const result = await validateJson('{"name": "test", "value": 123}');

if (result.valid) {
  console.log("JSON 格式有效");
} else {
  console.error("JSON 格式错误:");
  result.errors.forEach(error => console.error(`- ${error}`));
}
```

### mergeJson

合并 JSON 对象。

```typescript
async function mergeJson(base: unknown, overlay: unknown, deep: boolean = false): Promise<JsonResult>
```

**参数：**
- `base`: 基础对象
- `overlay`: 覆盖对象
- `deep`: 是否深度合并（默认 false）

**返回值：**
- `JsonResult`: 合并结果

### getJsonPath

获取 JSON 对象中指定路径的值。

```typescript
async function getJsonPath(value: unknown, path: string): Promise<JsonResult>
```

**参数：**
- `value`: JSON 对象
- `path`: 路径表达式（如 "data.items[0].name"）

**返回值：**
- `JsonResult`: 获取结果

### setJsonPath

设置 JSON 对象中指定路径的值。

```typescript
async function setJsonPath(value: unknown, path: string, newValue: unknown): Promise<JsonResult>
```

**参数：**
- `value`: JSON 对象
- `path`: 路径表达式
- `newValue`: 新值

**返回值：**
- `JsonResult`: 设置结果

### readJsonFile

读取 JSON 文件。

```typescript
async function readJsonFile(filePath: string): Promise<JsonResult>
```

**参数：**
- `filePath`: 文件路径

**返回值：**
- `JsonResult`: 读取结果

### writeJsonFile

写入 JSON 文件。

```typescript
async function writeJsonFile(filePath: string, value: unknown, pretty: boolean = true): Promise<JsonResult>
```

**参数：**
- `filePath`: 文件路径
- `value`: 要写入的值
- `pretty`: 是否格式化输出（默认 true）

**返回值：**
- `JsonResult`: 写入结果

## 🔍 搜索功能

### searchFiles

在指定目录中搜索文件内容。

```typescript
async function searchFiles(
  directory: string,
  query: string,
  case_sensitive: boolean,
  use_regex: boolean,
  include_all_files: boolean = false
): Promise<SearchResponse>
```

**参数：**
- `directory`: 搜索目录
- `query`: 搜索查询
- `case_sensitive`: 是否区分大小写
- `use_regex`: 是否使用正则表达式
- `include_all_files`: 是否包含所有文件类型（默认 false）

**返回值：**
- `SearchResponse`: 搜索结果

**示例：**
```typescript
const result = await searchFiles(
  "/path/to/project",
  "event_target",
  false,
  false,
  true
);

if (result.success) {
  console.log(`找到 ${result.results.length} 个匹配项`);
  result.results.forEach(item => {
    console.log(`${item.file_path}:${item.line} - ${item.content}`);
  });
}
```

## 🌳 文件树构建

### buildDirectoryTree

构建目录树结构。

```typescript
async function buildDirectoryTree(
  path: string,
  maxDepth: number = 0
): Promise<FileTreeResult>
```

**参数：**
- `path`: 目录路径
- `maxDepth`: 最大深度（0 表示无限制）

**返回值：**
- `FileTreeResult`: 包含文件树的结果

### buildDirectoryTreeFast

快速构建目录树结构（性能优化版本）。

```typescript
async function buildDirectoryTreeFast(
  path: string,
  maxDepth: number = 0
): Promise<FileTreeResult>
```

**参数：**
- `path`: 目录路径
- `maxDepth`: 最大深度（0 表示无限制）

**返回值：**
- `FileTreeResult`: 包含文件树的结果

## 🏷️ 国家标签

### loadCountryTags

加载国家标签数据。

```typescript
async function loadCountryTags(
  projectRoot?: string,
  gameRoot?: string,
  dependencyRoots?: string[]
): Promise<TagLoadResponse>
```

**参数：**
- `projectRoot`: 项目根目录（可选）
- `gameRoot`: 游戏根目录（可选）
- `dependencyRoots`: 依赖项根目录数组（可选）

**返回值：**
- `TagLoadResponse`: 包含标签列表的结果

**示例：**
```typescript
const result = await loadCountryTags(
  "/path/to/project",
  "/path/to/game",
  ["/path/to/dependency1", "/path/to/dependency2"]
);

if (result.success && result.tags) {
  result.tags.forEach(tag => {
    console.log(`${tag.code} - ${tag.name} (${tag.source})`);
  });
}
```

### validateTags

验证标签内容。

```typescript
async function validateTags(
  content: string,
  projectRoot?: string,
  gameRoot?: string,
  dependencyRoots?: string[]
): Promise<TagValidationResponse>
```

**参数：**
- `content`: 要验证的内容
- `projectRoot`: 项目根目录（可选）
- `gameRoot`: 游戏根目录（可选）
- `dependencyRoots`: 依赖项根目录数组（可选）

**返回值：**
- `TagValidationResponse`: 验证结果，包含错误列表

## 💡 Idea 管理

### loadIdeas

加载 Idea 数据。

```typescript
async function loadIdeas(
  projectRoot?: string,
  gameRoot?: string,
  dependencyRoots?: string[]
): Promise<IdeaLoadResponse>
```

**参数：**
- `projectRoot`: 项目根目录（可选）
- `gameRoot`: 游戏根目录（可选）
- `dependencyRoots`: 依赖项根目录数组（可选）

**返回值：**
- `IdeaLoadResponse`: 包含 Idea 列表的结果

### resetIdeaCache

重置 Idea 缓存。

```typescript
async function resetIdeaCache(): Promise<boolean>
```

**返回值：**
- `boolean`: 重置是否成功

## 🔗 括号匹配

### matchBrackets

匹配文本中的括号。

```typescript
async function matchBrackets(content: string): Promise<BracketMatchResult>
```

**参数：**
- `content`: 要分析的文本内容

**返回值：**
- `BracketMatchResult`: 包含括号信息的结果

**示例：**
```typescript
const result = await matchBrackets("if (condition) { do_something(); }");

if (result.success) {
  console.log(`找到 ${result.brackets.length} 个括号`);
  result.brackets.forEach(bracket => {
    console.log(`${bracket.bracket_type}: ${bracket.start}-${bracket.end} (深度: ${bracket.depth})`);
  });
}
```

### findBracketPair

查找光标位置的匹配括号。

```typescript
async function findBracketPair(
  content: string,
  cursorPos: number
): Promise<number | null>
```

**参数：**
- `content`: 文本内容
- `cursorPos`: 光标位置

**返回值：**
- `number | null`: 匹配括号的位置，如果没有匹配则返回 null

### getBracketDepths

获取文本中每个字符的括号深度。

```typescript
async function getBracketDepths(content: string): Promise<number[]>
```

**参数：**
- `content`: 文本内容

**返回值：**
- `number[]`: 每个字符的括号深度数组

## 🔗 外部链接

### openUrl

在默认浏览器中打开 URL。

```typescript
async function openUrl(url: string): Promise<void>
```

**参数：**
- `url`: 要打开的 URL

**示例：**
```typescript
await openUrl("https://github.com/hoi4-mod-studio");
```

## 🎮 游戏启动

### launchGame

启动 HOI4 游戏。

```typescript
async function launchGame(): Promise<LaunchGameResult>
```

**返回值：**
- `LaunchGameResult`: 启动结果

## 📦 依赖项管理

### loadDependencies

加载项目的依赖项列表。

```typescript
async function loadDependencies(projectPath: string): Promise<DependencyLoadResult>
```

**参数：**
- `projectPath`: 项目路径

**返回值：**
- `DependencyLoadResult`: 包含依赖项列表的结果

### saveDependencies

保存项目的依赖项列表。

```typescript
async function saveDependencies(
  projectPath: string,
  dependencies: Dependency[]
): Promise<DependencySaveResult>
```

**参数：**
- `projectPath`: 项目路径
- `dependencies`: 依赖项数组

**返回值：**
- `DependencySaveResult`: 保存结果

### validateDependencyPath

验证依赖项路径是否有效。

```typescript
async function validateDependencyPath(path: string): Promise<DependencyValidation>
```

**参数：**
- `path`: 依赖项路径

**返回值：**
- `DependencyValidation`: 验证结果

### indexDependency

索引依赖项的 Idea 和 Tag 数据。

```typescript
async function indexDependency(dependencyPath: string): Promise<DependencyIndexResult>
```

**参数：**
- `dependencyPath`: 依赖项路径

**返回值：**
- `DependencyIndexResult`: 索引结果，包含 Idea 和 Tag 数量

## 📦 项目打包

### packProject

打包项目为可分发的格式。

```typescript
async function packProject(options: PackageOptions): Promise<PackageResult>
```

**参数：**
- `options`: 打包选项
  - `projectPath`: 项目路径
  - `outputName`: 输出名称
  - `excludeDependencies`: 是否排除依赖项

**返回值：**
- `PackageResult`: 打包结果，包含输出路径和文件大小

**示例：**
```typescript
const result = await packProject({
  projectPath: "/path/to/project",
  outputName: "my-mod",
  excludeDependencies: false
});

if (result.success) {
  console.log(`打包成功: ${result.outputPath}`);
  console.log(`文件大小: ${result.fileSize} 字节`);
}
```

## 🖼️ 图片处理

### readImageAsBase64

读取图片文件并转换为 Base64 格式。

```typescript
async function readImageAsBase64(filePath: string): Promise<ImageReadResult>
```

**参数：**
- `filePath`: 图片文件路径

**返回值：**
- `ImageReadResult`: 包含 Base64 数据和 MIME 类型的结果

**示例：**
```typescript
const result = await readImageAsBase64("/path/to/image.png");

if (result.success && result.base64 && result.mimeType) {
  const dataUrl = `data:${result.mimeType};base64,${result.base64}`;
  console.log(`图片数据 URL: ${dataUrl}`);
}
```

### loadFocusIcon

根据国策 icon 名称加载图标。

```typescript
async function loadFocusIcon(
  iconName: string,
  projectRoot?: string,
  gameRoot?: string
): Promise<ImageReadResult>
```

**参数：**
- `iconName`: 图标名称
- `projectRoot`: 项目根目录（可选）
- `gameRoot`: 游戏根目录（可选）

**返回值：**
- `ImageReadResult`: 包含图标数据的结果

## 💾 图标缓存

### readIconCache

读取图标缓存。

```typescript
async function readIconCache(iconName: string): Promise<ImageReadResult>
```

**参数：**
- `iconName`: 图标名称

**返回值：**
- `ImageReadResult`: 包含缓存图标数据的结果

### writeIconCache

写入图标缓存。

```typescript
async function writeIconCache(
  iconName: string,
  base64: string,
  mimeType: string
): Promise<ImageReadResult>
```

**参数：**
- `iconName`: 图标名称
- `base64`: Base64 数据
- `mimeType`: MIME 类型

**返回值：**
- `ImageReadResult`: 写入结果

### clearIconCache

清理图标缓存。

```typescript
async function clearIconCache(): Promise<ImageReadResult>
```

**返回值：**
- `ImageReadResult`: 清理结果

## 🔧 其他功能

### exitApplication

退出应用程序。

```typescript
async function exitApplication(): Promise<void>
```

### openSettings

打开设置页面。

```typescript
async function openSettings(): Promise<FileOperationResult>
```

**返回值：**
- `FileOperationResult`: 操作结果

## 📝 使用示例

### 完整的项目创建和文件操作流程

```typescript
import { 
  createNewProject, 
  createFile, 
  readFileContent, 
  writeFileContent,
  loadSettings,
  saveSettings 
} from '../api/tauri';

// 1. 创建新项目
const projectResult = await createNewProject(
  "My HOI4 Mod",
  "1.0.0",
  "/path/to/my-mod",
  ["common/", "events/", "gfx/"]
);

if (!projectResult.success) {
  console.error(`项目创建失败: ${projectResult.message}`);
  return;
}

console.log(`项目创建成功: ${projectResult.project_path}`);

// 2. 创建描述文件
const descResult = await createFile(
  `${projectResult.project_path}/descriptor.mod`,
  `name="My HOI4 Mod"
version="1.0.0"
supported_version="1.12.*"
tags="Gameplay, Historical"`
);

if (descResult.success) {
  console.log("描述文件创建成功");
}

// 3. 读取并修改文件
const readResult = await readFileContent(
  `${projectResult.project_path}/descriptor.mod`
);

if (readResult.success) {
  let content = readResult.content;
  content += '\npicture="logo.png"\n';
  
  const writeResult = await writeFileContent(
    `${projectResult.project_path}/descriptor.mod`,
    content
  );
  
  if (writeResult.success) {
    console.log("文件更新成功");
  }
}

// 4. 更新设置
const settingsResult = await loadSettings();
if (settingsResult.success && settingsResult.data) {
  const settings = settingsResult.data as Record<string, unknown>;
  settings.lastProject = projectResult.project_path;
  
  await saveSettings(settings);
  console.log("设置已更新");
}
```

### 搜索和验证示例

```typescript
import { 
  searchFiles, 
  validateTags, 
  loadCountryTags,
  matchBrackets 
} from '../api/tauri';

// 1. 搜索项目中的事件
const searchResult = await searchFiles(
  "/path/to/project",
  "country_event",
  false,
  false,
  true
);

if (searchResult.success) {
  console.log(`找到 ${searchResult.results.length} 个事件`);
  
  // 2. 验证第一个结果的标签
  if (searchResult.results.length > 0) {
    const firstResult = searchResult.results[0];
    const fileContent = await readFileContent(firstResult.file_path);
    
    if (fileContent.success) {
      const tagResult = await validateTags(
        fileContent.content,
        "/path/to/project",
        "/path/to/game"
      );
      
      if (tagResult.success) {
        if (tagResult.errors.length === 0) {
          console.log("标签验证通过");
        } else {
          console.log("标签验证错误:");
          tagResult.errors.forEach(error => {
            console.log(`行 ${error.line}: ${error.message}`);
          });
        }
      }
    }
  }
}

// 3. 加载国家标签
const tagResult = await loadCountryTags(
  "/path/to/project",
  "/path/to/game"
);

if (tagResult.success && tagResult.tags) {
  console.log(`加载了 ${tagResult.tags.length} 个国家标签`);
}

// 4. 检查括号匹配
const bracketResult = await matchBrackets(
  "if (condition) { \n  do_something(); \n}"
);

if (bracketResult.success) {
  console.log(`括号匹配检查完成，未匹配: ${bracketResult.unmatched.length}`);
}
```

## 🔗 相关链接

- [前端 API 概览](./README.md)
- [组件 API](./Components.md)
- [组合式函数 API](./Composables.md)
- [后端 API](../Backend/README.md)
- [集成 API](../Integration/README.md)

---

**注意**: 所有 Tauri API 调用都是异步的，应使用 `await` 或 `.then()` 处理返回的 Promise。错误处理应该检查返回对象中的 `success` 字段。