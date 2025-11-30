# API 快速参考

本文档提供了 HOI4 Code Studio 常用 API 的快速参考，帮助开发者快速找到所需的功能接口。

## 🚀 快速导航

### 项目管理
| 功能 | 前端 API | 后端命令 | 描述 |
|------|----------|----------|------|
| 创建项目 | [`createNewProject()`](./Frontend/TauriAPI.md#createnewproject) | [`create_new_project`](./Backend/Commands.md#create_new_project) | 创建新的 HOI4 项目 |
| 打开项目 | [`openProject()`](./Frontend/TauriAPI.md#openproject) | [`open_project`](./Backend/Commands.md#open_project) | 打开现有项目 |
| 初始化项目 | [`initializeProject()`](./Frontend/TauriAPI.md#initializeproject) | [`initialize_project`](./Backend/Commands.md#initialize_project) | 为非HOICS项目创建配置文件 |
| 最近项目 | [`getRecentProjects()`](./Frontend/TauriAPI.md#getrecentprojects) | [`get_recent_projects`](./Backend/Commands.md#get_recent_projects) | 获取最近打开的项目列表 |

### 文件操作
| 功能 | 前端 API | 后端命令 | 描述 |
|------|----------|----------|------|
| 读取目录 | [`readDirectory()`](./Frontend/TauriAPI.md#readdirectory) | [`read_directory`](./Backend/Commands.md#read_directory) | 读取目录内容 |
| 读取文件 | [`readFileContent()`](./Frontend/TauriAPI.md#readfilecontent) | [`read_file_content`](./Backend/Commands.md#read_file_content) | 读取文件内容 |
| 写入文件 | [`writeFileContent()`](./Frontend/TauriAPI.md#writefilecontent) | [`write_file_content`](./Backend/Commands.md#write_file_content) | 写入文件内容 |
| 创建文件 | [`createFile()`](./Frontend/TauriAPI.md#createfile) | [`create_file`](./Backend/Commands.md#create_file) | 创建新文件 |
| 创建文件夹 | [`createFolder()`](./Frontend/TauriAPI.md#createfolder) | [`create_folder`](./Backend/Commands.md#create_folder) | 创建新文件夹 |
| 重命名 | [`renamePath()`](./Frontend/TauriAPI.md#renamepath) | [`rename_path`](./Backend/Commands.md#rename_path) | 重命名文件或文件夹 |

### 搜索功能
| 功能 | 前端 API | 后端命令 | 描述 |
|------|----------|----------|------|
| 文件搜索 | [`searchFiles()`](./Frontend/TauriAPI.md#searchfiles) | [`search_files`](./Backend/Commands.md#search_files) | 在目录中搜索文件内容 |
| 搜索状态管理 | [`useSearch()`](./Frontend/Composables.md#usesearch) | - | 管理搜索状态和结果 |

### 编辑器功能
| 功能 | 前端 Composable | 描述 |
|------|------------------|------|
| 文件管理 | [`useFileManager()`](./Frontend/Composables.md#usefilemanager) | 管理文件的打开、关闭、保存等操作 |
| 编辑器状态 | [`useEditorState()`](./Frontend/Composables.md#useeditorstate) | 管理编辑器的内容、光标位置、保存状态等 |
| 语法高亮 | [`useSyntaxHighlight()`](./Frontend/Composables.md#usesyntaxhighlight) | 管理代码的语法高亮和括号分级高亮 |
| 自动补全 | [`useGrammarCompletion()`](./Frontend/Composables.md#usegrammarcompletion) | 提供 HOI4 脚本语言的自动补全功能 |
| 错误提示 | [`useErrorTip()`](./Frontend/Composables.md#useerrortip) | 提供代码错误检测和提示功能 |
| 历史记录 | [`useHistory()`](./Frontend/Composables.md#usehistory) | 管理编辑器的撤销和重做功能 |

### 游戏内容处理
| 功能 | 前端 API | 后端命令 | 描述 |
|------|----------|----------|------|
| 国家标签 | [`loadCountryTags()`](./Frontend/TauriAPI.md#loadcountrytags) | [`load_country_tags`](./Backend/Commands.md#load_country_tags) | 加载国家标签数据 |
| 标签验证 | [`validateTags()`](./Frontend/TauriAPI.md#validatetags) | [`validate_tags`](./Backend/Commands.md#validate_tags) | 验证标签内容 |
| Idea 管理 | [`loadIdeas()`](./Frontend/TauriAPI.md#loadideas) | [`load_ideas`](./Backend/Commands.md#load_ideas) | 加载 Idea 数据 |
| 标签注册表 | [`useTagRegistry()`](./Frontend/Composables.md#usetagregistry) | - | 管理国家标签数据 |
| Idea 注册表 | [`useIdeaRegistry()`](./Frontend/Composables.md#useidearegistry) | - | 管理 Idea 数据 |

### 依赖项管理
| 功能 | 前端 API | 后端命令 | 描述 |
|------|----------|----------|------|
| 加载依赖项 | [`loadDependencies()`](./Frontend/TauriAPI.md#loaddependencies) | [`load_dependencies`](./Backend/Commands.md#load_dependencies) | 加载项目的依赖项列表 |
| 保存依赖项 | [`saveDependencies()`](./Frontend/TauriAPI.md#savedependencies) | [`save_dependencies`](./Backend/Commands.md#save_dependencies) | 保存项目的依赖项列表 |
| 验证路径 | [`validateDependencyPath()`](./Frontend/TauriAPI.md#validatedependencypath) | [`validate_dependency_path`](./Backend/Commands.md#validate_dependency_path) | 验证依赖项路径 |
| 依赖项管理 | [`useDependencyManager()`](./Frontend/Composables.md#usedependencymanager) | - | 管理项目的依赖项 |

### 设置管理
| 功能 | 前端 API | 后端命令 | 描述 |
|------|----------|----------|------|
| 加载设置 | [`loadSettings()`](./Frontend/TauriAPI.md#loadsettings) | [`load_settings`](./Backend/Commands.md#load_settings) | 加载应用程序设置 |
| 保存设置 | [`saveSettings()`](./Frontend/TauriAPI.md#savesettings) | [`save_settings`](./Backend/Commands.md#save_settings) | 保存应用程序设置 |
| 验证游戏目录 | [`validateGameDirectory()`](./Frontend/TauriAPI.md#validategamedirectory) | [`validate_game_directory`](./Backend/Commands.md#validate_game_directory) | 验证游戏目录是否有效 |

### 系统功能
| 功能 | 前端 API | 后端命令 | 描述 |
|------|----------|----------|------|
| 文件对话框 | [`openFileDialog()`](./Frontend/TauriAPI.md#openfiledialog) | [`open_file_dialog`](./Backend/Commands.md#open_file_dialog) | 打开文件选择对话框 |
| 打开文件夹 | [`openFolder()`](./Frontend/TauriAPI.md#openfolder) | [`open_folder`](./Backend/Commands.md#open_folder) | 在系统文件管理器中打开文件夹 |
| 启动游戏 | [`launchGame()`](./Frontend/TauriAPI.md#launchgame) | [`launch_game`](./Backend/Commands.md#launch_game) | 启动 HOI4 游戏 |
| 退出应用 | [`exitApplication()`](./Frontend/TauriAPI.md#exitapplication) | [`exit_application`](./Backend/Commands.md#exit_application) | 退出应用程序 |

## 📋 常用代码示例

### 创建新项目
```typescript
import { createNewProject } from '@/api/tauri';

const result = await createNewProject(
  "My Mod",
  "1.0.0",
  "/path/to/project",
  ["common/", "events/", "gfx/"]
);

if (result.success) {
  console.log(`项目创建成功: ${result.project_path}`);
}
```

### 文件操作
```typescript
import { readFileContent, writeFileContent } from '@/api/tauri';

// 读取文件
const readResult = await readFileContent("/path/to/file.txt");
if (readResult.success) {
  console.log(readResult.content);
  
  // 修改并写入文件
  const newContent = readResult.content + "\n// 新增内容";
  await writeFileContent("/path/to/file.txt", newContent);
}
```

### 使用 Composables
```typescript
import { useFileManager, useSyntaxHighlight } from '@/composables';

// 文件管理
const { openFile, saveFile, currentFile } = useFileManager();

// 语法高亮
const { highlightCode, highlightedCode } = useSyntaxHighlight();

// 打开文件
await openFile(fileNode);

// 高亮代码
highlightCode(currentFile.value.content, fileName);
```

### 搜索功能
```typescript
import { searchFiles } from '@/api/tauri';
import { useSearch } from '@/composables';

const { searchQuery, performSearch } = useSearch();

// 设置搜索条件
searchQuery.value = "country_event";

// 执行搜索
await performSearch("/path/to/project");
```

## 🔗 相关文档

- [API 主页](./README.md)
- [前端 API](./Frontend/README.md)
- [后端 API](./Backend/README.md)
- [集成 API](./Integration/README.md)

---

**提示**: 使用 Ctrl+F (或 Cmd+F) 在此页面中快速搜索所需功能。