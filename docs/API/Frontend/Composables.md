# Vue Composables API 文档

本文档详细描述了 HOI4 Code Studio 前端部分的 Vue Composables 接口，这些组合式函数提供了状态管理、业务逻辑封装和响应式数据处理等功能。

## 📋 目录

- [文件管理](#文件管理)
  - [useFileManager](#usefilemanager)
- [编辑器状态](#编辑器状态)
  - [useEditorState](#useeditorstate)
- [编辑器分组](#编辑器分组)
  - [useEditorGroups](#useeditorgroups)
- [依赖项管理](#依赖项管理)
  - [useDependencyManager](#usedependencymanager)
- [编辑器主题](#编辑器主题)
  - [useEditorTheme](#useeditortheme)
- [搜索功能](#搜索功能)
  - [useSearch](#usesearch)
- [语法高亮](#语法高亮)
  - [useSyntaxHighlight](#usesyntaxhighlight)
- [键盘快捷键](#键盘快捷键)
  - [useKeyboardShortcuts](#usekeyboardshortcuts)
- [主题管理](#主题管理)
  - [useTheme](#usetheme)
- [历史记录](#历史记录)
  - [useHistory](#usehistory)
- [面板调整](#面板调整)
  - [usePanelResize](#usepanelresize)
- [滚动同步](#滚动同步)
  - [useScrollSync](#usescrollsync)
- [RGB颜色显示](#rgb颜色显示)
  - [useRGBColorDisplay](#usergbcoldisplay)
- [事件图](#事件图)
  - [useEventGraph](#useeventgraph)
- [Idea注册表](#idea注册表)
  - [useIdeaRegistry](#useidearegistry)
- [标签注册表](#标签注册表)
  - [useTagRegistry](#usetagregistry)
- [语法补全](#语法补全)
  - [useGrammarCompletion](#usegrammarcompletion)
- [编辑器字体](#编辑器字体)
  - [useEditorFont](#useeditorfont)

## 📁 文件管理

### useFileManager

文件管理 Composable，管理文件的打开、关闭、保存等操作。

#### 参数

| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `gameDirectory` | `string` | `''` | 游戏目录路径 |

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `openFiles` | `Ref<OpenFile[]>` | 打开的文件列表 |
| `activeFileIndex` | `Ref<number>` | 活动文件索引 |
| `currentFile` | `Ref<FileNode \| null>` | 当前文件 |
| `isLoadingFile` | `Ref<boolean>` | 是否正在加载文件 |
| `openFile` | `(node: FileNode, onContentLoaded?: (content: string) => void) => Promise<boolean>` | 打开文件 |
| `switchToFile` | `(index: number, currentContent?: string) => void` | 切换到指定文件 |
| `closeFile` | `(index?: number) => boolean` | 关闭文件 |
| `closeAllFiles` | `() => boolean` | 关闭所有文件 |
| `closeOtherFiles` | `(keepIndex: number) => boolean` | 关闭其他文件 |
| `saveFile` | `(content: string) => Promise<boolean>` | 保存文件 |
| `updateCurrentFile` | `() => OpenFile \| null` | 更新当前文件状态 |
| `updateFileState` | `(content: string, hasChanges: boolean) => void` | 更新文件内容和状态 |
| `isFileReadOnly` | `(filePath: string) => boolean` | 检查文件是否为只读 |

#### 类型定义

```typescript
export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
  expanded?: boolean
}

export interface OpenFile {
  node: FileNode
  content: string
  hasUnsavedChanges: boolean
  cursorLine: number
  cursorColumn: number
  isImage?: boolean
  mimeType?: string
  isEventGraph?: boolean
  isFocusTree?: boolean
  isPreview?: boolean
  sourceFilePath?: string
}
```

#### 示例

```typescript
import { useFileManager } from '@/composables/useFileManager'

const {
  openFiles,
  activeFileIndex,
  currentFile,
  isLoadingFile,
  openFile,
  switchToFile,
  closeFile,
  saveFile,
  isFileReadOnly
} = useFileManager('/path/to/game/directory')

// 打开文件
const success = await openFile(fileNode, (content) => {
  console.log('文件内容已加载:', content)
})

// 保存文件
const saved = await saveFile(fileContent)

// 检查文件是否只读
const readOnly = isFileReadOnly(filePath)
```

## 📝 编辑器状态

### useEditorState

编辑器状态 Composable，管理编辑器的内容、光标位置、保存状态等。

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `fileContent` | `Ref<string>` | 文件内容 |
| `hasUnsavedChanges` | `Ref<boolean>` | 是否有未保存的更改 |
| `currentLine` | `Ref<number>` | 当前行号 |
| `currentColumn` | `Ref<number>` | 当前列号 |
| `isReadOnly` | `Ref<boolean>` | 是否为只读模式 |
| `updateCursorPosition` | `(textarea: HTMLTextAreaElement) => void` | 更新光标位置 |
| `onContentChange` | `(content: string) => void` | 内容变化处理 |
| `resetUnsavedChanges` | `() => void` | 重置未保存标记 |
| `setReadOnly` | `(readonly: boolean) => void` | 设置只读状态 |

#### 示例

```typescript
import { useEditorState } from '@/composables/useEditorState'

const {
  fileContent,
  hasUnsavedChanges,
  currentLine,
  currentColumn,
  updateCursorPosition,
  onContentChange,
  resetUnsavedChanges
} = useEditorState()

// 处理内容变化
function handleTextareaInput(event) {
  onContentChange(event.target.value)
}

// 更新光标位置
function handleTextareaClick(event) {
  updateCursorPosition(event.target)
}

// 保存文件后重置状态
function handleSaveSuccess() {
  resetUnsavedChanges()
}
```

## 🗂️ 编辑器分组

### useEditorGroups

编辑器分组管理 Composable，管理编辑器的分页功能，最多支持3个窗格。

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `panes` | `Ref<EditorPane[]>` | 所有窗格列表 |
| `activePaneId` | `Ref<string>` | 活动窗格ID |
| `activePane` | `Computed<EditorPane>` | 活动窗格 |
| `activePaneIndex` | `Computed<number>` | 活动窗格索引 |
| `splitPane` | `(sourcePaneId: string, fileIndex?: number) => boolean` | 分割窗格 |
| `closePane` | `(paneId: string) => boolean` | 关闭窗格 |
| `resizePaneWidth` | `(paneId: string, newWidth: number) => boolean` | 调整窗格宽度 |
| `setActivePane` | `(paneId: string) => void` | 设置活动窗格 |
| `getPane` | `(paneId: string) => EditorPane \| undefined` | 获取指定窗格 |
| `resetToSinglePane` | `() => boolean` | 重置为单个窗格 |

#### 类型定义

```typescript
export interface EditorPane {
  id: string
  openFiles: OpenFile[]
  activeFileIndex: number
  width: number // 百分比宽度 (0-100)
}
```

#### 示例

```typescript
import { useEditorGroups } from '@/composables/useEditorGroups'

const {
  panes,
  activePaneId,
  activePane,
  splitPane,
  closePane,
  setActivePane
} = useEditorGroups()

// 分割当前窗格
const success = splitPane(activePaneId.value, 0)

// 关闭指定窗格
closePane('pane-2')

// 设置活动窗格
setActivePane('pane-1')
```

## 🔗 依赖项管理

### useDependencyManager

依赖项管理 Composable，管理项目的依赖项添加、删除、索引等操作。

#### 参数

| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `projectPath` | `string` | `undefined` | 项目路径 |

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `dependencies` | `Computed<Dependency[]>` | 依赖项列表 |
| `enabledDependencies` | `Computed<Dependency[]>` | 已启用的依赖项 |
| `isLoading` | `Computed<boolean>` | 是否正在加载 |
| `dependencyCount` | `Computed<number>` | 依赖项数量 |
| `loadDependencies` | `() => Promise<DependencyLoadResult>` | 加载依赖项列表 |
| `saveDependencies` | `() => Promise<DependencySaveResult>` | 保存依赖项列表 |
| `addDependency` | `(path: string) => Promise<{ success: boolean; message: string }>` | 添加依赖项 |
| `removeDependency` | `(id: string) => Promise<{ success: boolean; message: string }>` | 删除依赖项 |
| `toggleDependency` | `(id: string) => Promise<{ success: boolean; message: string }>` | 切换依赖项启用状态 |
| `validatePath` | `(path: string) => Promise<DependencyValidation>` | 验证依赖项路径 |
| `indexDependency` | `(id: string) => Promise<void>` | 索引依赖项 |
| `indexAllDependencies` | `() => Promise<void>` | 索引所有已启用的依赖项 |
| `getIndexStatus` | `(id: string) => DependencyIndexStatus \| undefined` | 获取依赖项索引状态 |
| `setProjectPath` | `(path: string) => void` | 设置项目路径 |

#### 示例

```typescript
import { useDependencyManager } from '@/composables/useDependencyManager'

const {
  dependencies,
  enabledDependencies,
  addDependency,
  removeDependency,
  indexAllDependencies
} = useDependencyManager('/path/to/project')

// 添加依赖项
const result = await addDependency('/path/to/dependency')

// 删除依赖项
const removeResult = await removeDependency('dep-id')

// 索引所有依赖项
await indexAllDependencies()
```

## 🎨 编辑器主题

### useEditorTheme

编辑器主题 Composable，管理 CodeMirror 编辑器的主题配置。

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `editorThemeVersion` | `Ref<number>` | 编辑器主题版本号 |
| `getCurrentEditorTheme` | `() => Extension` | 获取当前编辑器主题扩展 |
| `notifyEditorThemeChange` | `() => void` | 通知编辑器主题已更新 |
| `createEditorTheme` | `(config: EditorThemeConfig) => Extension` | 创建编辑器主题扩展 |
| `themeToEditorConfig` | `(theme: Theme) => EditorThemeConfig` | 将 UI 主题转换为编辑器主题配置 |

#### 示例

```typescript
import { useEditorTheme } from '@/composables/useEditorTheme'

const {
  editorThemeVersion,
  getCurrentEditorTheme,
  notifyEditorThemeChange
} = useEditorTheme()

// 获取当前编辑器主题
const themeExtension = getCurrentEditorTheme()

// 通知主题变化
notifyEditorThemeChange()
```

## 🔍 搜索功能

### useSearch

搜索功能 Composable，管理项目和游戏目录的搜索功能。

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `searchQuery` | `Ref<string>` | 搜索查询 |
| `searchResults` | `Ref<SearchResult[]>` | 搜索结果 |
| `isSearching` | `Ref<boolean>` | 是否正在搜索 |
| `searchCaseSensitive` | `Ref<boolean>` | 是否区分大小写 |
| `searchRegex` | `Ref<boolean>` | 是否使用正则表达式 |
| `searchScope` | `Ref<SearchScope>` | 搜索范围 |
| `includeAllFiles` | `Ref<boolean>` | 是否包含所有文件类型 |
| `performSearch` | `(searchPath: string, append?: boolean) => Promise<void>` | 执行搜索 |
| `jumpToResult` | `(result: SearchResult, editorView: any) => void` | 跳转到搜索结果 |
| `clearResults` | `() => void` | 清空搜索结果 |

#### 类型定义

```typescript
export interface SearchResult {
  file: {
    name: string
    path: string
    isDirectory: boolean
  }
  line: number
  content: string
  matchStart: number
  matchEnd: number
}

export type SearchScope = 'project' | 'game' | 'dependencies'
```

#### 示例

```typescript
import { useSearch } from '@/composables/useSearch'

const {
  searchQuery,
  searchResults,
  isSearching,
  searchCaseSensitive,
  searchRegex,
  searchScope,
  performSearch,
  jumpToResult
} = useSearch()

// 执行搜索
await performSearch('/path/to/search')

// 跳转到搜索结果
jumpToResult(searchResults.value[0], editorView)
```

## 🌈 语法高亮

### useSyntaxHighlight

语法高亮 Composable，管理代码的语法高亮和括号分级高亮。

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `highlightedCode` | `Ref<string>` | 高亮后的代码 |
| `showHighlight` | `Ref<boolean>` | 是否显示高亮 |
| `highlightRef` | `Ref<HTMLPreElement \| null>` | 高亮元素引用 |
| `highlightCode` | `(fileContent: string, fileName: string, txtErrors?: Array<{line: number, msg: string, type: string}>) => void` | 高亮代码 |
| `applyBraceHighlight` | `(fileContent: string) => Promise<void>` | 应用括号高亮 |
| `getLanguage` | `(fileName: string) => string` | 获取文件语言类型 |

#### 示例

```typescript
import { useSyntaxHighlight } from '@/composables/useSyntaxHighlight'

const {
  highlightedCode,
  showHighlight,
  highlightRef,
  highlightCode,
  getLanguage
} = useSyntaxHighlight()

// 高亮代码
highlightCode(fileContent, fileName, errors)

// 获取语言类型
const language = getLanguage('script.txt')
```

## ⌨️ 键盘快捷键

### useKeyboardShortcuts

键盘快捷键 Composable，处理全局快捷键事件。

#### 参数

| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `handlers` | `object` | - | 快捷键处理器 |

#### handlers 参数

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `save` | `() => void` | 保存处理函数 |
| `undo` | `() => void` | 撤销处理函数 |
| `redo` | `() => void` | 重做处理函数 |
| `search` | `() => void` | 搜索处理函数 |
| `nextError` | `() => void` | 下一个错误处理函数 |
| `previousError` | `() => void` | 上一个错误处理函数 |
| `toggleTheme` | `() => void` | 切换主题处理函数 |

#### 示例

```typescript
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

useKeyboardShortcuts({
  save: () => {
    console.log('保存文件')
  },
  undo: () => {
    console.log('撤销')
  },
  search: () => {
    console.log('打开搜索')
  }
})
```

## 🎨 主题管理

### useTheme

主题系统 Composable，管理应用程序的主题配置。支持50+主题，包括通用编辑器主题、HOI4特定主题和无障碍友好主题。

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `themes` | `Theme[]` | 预定义主题列表（包含50+主题） |
| `currentThemeId` | `Ref<string>` | 当前主题ID |
| `currentTheme` | `Computed<Theme>` | 当前主题 |
| `themePanelVisible` | `Ref<boolean>` | 主题面板可见性 |
| `setTheme` | `(themeId: string, saveToSettings?: boolean) => Promise<void>` | 设置主题 |
| `loadThemeFromSettings` | `() => Promise<void>` | 从设置加载主题 |
| `toggleThemePanel` | `() => void` | 切换主题面板可见性 |
| `closeThemePanel` | `() => void` | 关闭主题面板 |
| `applyTheme` | `(theme: Theme) => void` | 应用主题到CSS变量 |

#### 主题分类

**通用编辑器主题**（30+）：
- One Dark/Light, VS Code Dark, GitHub Dark/Light
- Catppuccin系列（Latte, Frappé, Macchiato, Mocha）
- Dracula, Monokai, Solarized, Nord, Gruvbox
- Material, Tokyo Night, Palenight, Arc等

**HOI4国家主题**（15个）：
- 盟军：英国、美国、法国（明暗版本）
- 轴心国：德国、意大利、日本（明暗版本）
- 共产国际：Comintern、中国（明暗版本）

**流行编辑器主题**（3个）：
- JetBrains Darcula, JetBrains IntelliJ Light, Doom One

**无障碍主题**（2个）：
- High Contrast（高对比度）, Colorblind Friendly（色盲友好）

#### 快捷键

- `Ctrl+Shift+T` - 打开/关闭主题面板
- `Esc` - 关闭主题面板

#### 类型定义

```typescript
export interface Theme {
  id: string
  name: string
  colors: {
    bg: string
    bgSecondary: string
    fg: string
    comment: string
    border: string
    selection: string
    accent: string
    success: string
    warning: string
    error: string
    keyword: string
  }
}
```

#### 示例

```typescript
import { useTheme } from '@/composables/useTheme'

const {
  currentTheme,
  setTheme,
  toggleThemePanel
} = useTheme()

// 设置主题
await setTheme('onedark')

// 切换主题面板
toggleThemePanel()
```

## 📜 历史记录

### useHistory

撤销/重做 Composable，管理编辑器的撤销和重做功能。

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `undoStack` | `Ref<HistoryState[]>` | 撤销栈 |
| `redoStack` | `Ref<HistoryState[]>` | 重做栈 |
| `isApplyingHistory` | `Ref<boolean>` | 是否正在应用历史记录 |
| `saveHistory` | `(state: HistoryState) => void` | 保存当前状态到撤销栈 |
| `undo` | `(textarea: HTMLTextAreaElement, currentContent: string, onContentChange: (content: string) => void, onHighlight?: () => void) => void` | 撤销操作 |
| `redo` | `(textarea: HTMLTextAreaElement, currentContent: string, onContentChange: (content: string) => void, onHighlight?: () => void) => void` | 重做操作 |
| `clearHistory` | `() => void` | 清空历史记录 |

#### 类型定义

```typescript
export interface HistoryState {
  content: string
  cursorStart: number
  cursorEnd: number
}
```

#### 示例

```typescript
import { useHistory } from '@/composables/useHistory'

const {
  undoStack,
  redoStack,
  saveHistory,
  undo,
  redo
} = useHistory()

// 保存当前状态
saveHistory({
  content: textarea.value,
  cursorStart: textarea.selectionStart,
  cursorEnd: textarea.selectionEnd
})

// 撤销
undo(textarea, currentContent, handleContentChange)

// 重做
redo(textarea, currentContent, handleContentChange)
```

## 📏 面板调整

### usePanelResize

面板拖动调整 Composable，管理左右面板的宽度调整。

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `leftPanelWidth` | `Ref<number>` | 左侧面板宽度 |
| `rightPanelWidth` | `Ref<number>` | 右侧面板宽度 |
| `isResizingLeft` | `Ref<boolean>` | 是否正在调整左侧面板 |
| `isResizingRight` | `Ref<boolean>` | 是否正在调整右侧面板 |
| `startResizeLeft` | `(e: MouseEvent) => void` | 开始拖动左侧面板 |
| `startResizeRight` | `(e: MouseEvent) => void` | 开始拖动右侧面板 |
| `onMouseMove` | `(e: MouseEvent) => void` | 鼠标移动事件处理 |
| `stopResize` | `() => void` | 停止拖动 |

#### 示例

```typescript
import { usePanelResize } from '@/composables/usePanelResize'

const {
  leftPanelWidth,
  rightPanelWidth,
  startResizeLeft,
  startResizeRight
} = usePanelResize()

// 在模板中使用
<div @mousedown="startResizeLeft">左侧面板</div>
<div @mousedown="startResizeRight">右侧面板</div>
```

## 📜 滚动同步

### useScrollSync

滚动同步 Composable，管理多个编辑器之间的滚动同步。

#### 参数

| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `sources` | `Ref<HTMLElement[]>` | - | 需要同步滚动的元素列表 |

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `syncScroll` | `(sourceIndex: number, scrollTop: number) => void` | 同步滚动 |
| `enableSync` | `() => void` | 启用滚动同步 |
| `disableSync` | `() => void` | 禁用滚动同步 |

#### 示例

```typescript
import { useScrollSync } from '@/composables/useScrollSync'

const elements = ref([editor1, editor2, editor3])
const { syncScroll, enableSync } = useScrollSync(elements)

// 启用同步
enableSync()

// 同步滚动
syncScroll(0, 100)
```

## 🌈 RGB颜色显示

### useRGBColorDisplay

RGB颜色识别和显示 Composable，在编辑器中识别并显示RGB/RGBA颜色。

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `enabled` | `Ref<boolean>` | 是否启用 |
| `rgbColors` | `Ref<RGBColor[]>` | 解析到的RGB颜色列表 |
| `parseRGBColors` | `(text: string) => RGBColor[]` | 解析文本中的RGB/RGBA颜色代码 |
| `createRGBColorField` | `() => StateField<DecorationSet>` | 创建装饰器字段 |
| `setEnabled` | `(value: boolean) => void` | 设置启用状态 |
| `getEnabled` | `() => boolean` | 获取启用状态 |
| `loadSettingsFromStorage` | `() => Promise<void>` | 从设置加载配置 |

#### 类型定义

```typescript
export interface RGBColor {
  r: number
  g: number
  b: number
  a: number
  start: number
  end: number
  text: string
}
```

#### 示例

```typescript
import { useRGBColorDisplay } from '@/composables/useRGBColorDisplay'

const {
  enabled,
  rgbColors,
  createRGBColorField,
  setEnabled,
  loadSettingsFromStorage
} = useRGBColorDisplay()

// 加载设置
await loadSettingsFromStorage()

// 创建装饰器字段
const rgbField = createRGBColorField()

// 启用/禁用
setEnabled(true)
```

## 📊 事件图

### useEventGraph

事件图 Composable，管理事件关系图的显示和交互。

#### 参数

| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `content` | `string` | - | 事件文件内容 |
| `filePath` | `string` | - | 文件路径 |

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `events` | `Ref<EventNode[]>` | 事件节点列表 |
| `connections` | `Ref<EventConnection[]>` | 事件连接列表 |
| `selectedEvent` | `Ref<EventNode \| null>` | 选中的事件 |
| `parseEvents` | `() => void` | 解析事件 |
| `selectEvent` | `(event: EventNode) => void` | 选择事件 |
| `jumpToEvent` | `(eventId: string, line: number) => void` | 跳转到事件 |

#### 示例

```typescript
import { useEventGraph } from '@/composables/useEventGraph'

const {
  events,
  connections,
  selectedEvent,
  parseEvents,
  selectEvent
} = useEventGraph(fileContent, filePath)

// 解析事件
parseEvents()

// 选择事件
selectEvent(events.value[0])
```

## 💡 Idea注册表

### useIdeaRegistry

Idea注册表 Composable，管理HOI4游戏中的Idea数据。

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `isLoading` | `Computed<boolean>` | 是否正在加载 |
| `ideas` | `Computed<IdeaEntry[]>` | Idea列表 |
| `statusMessage` | `Computed<string>` | 状态消息 |
| `refresh` | `() => Promise<IdeaLoadResponse>` | 刷新Idea数据 |
| `clear` | `() => Promise<void>` | 清空缓存 |

#### 示例

```typescript
import { useIdeaRegistry, setIdeaRoots } from '@/composables/useIdeaRegistry'

// 设置根目录
setIdeaRoots('/path/to/project', '/path/to/game')

const {
  isLoading,
  ideas,
  statusMessage,
  refresh
} = useIdeaRegistry()

// 刷新数据
await refresh()
```

## 🏷️ 标签注册表

### useTagRegistry

标签注册表 Composable，管理HOI4游戏中的国家标签数据。

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `isLoading` | `Computed<boolean>` | 是否正在加载 |
| `tags` | `Computed<TagEntry[]>` | 标签列表 |
| `statusMessage` | `Computed<string>` | 状态消息 |
| `refresh` | `() => Promise<TagLoadResponse>` | 刷新标签数据 |
| `validate` | `(content: string) => Promise<TagValidationResponse>` | 验证标签 |
| `tagSet` | `() => Set<string>` | 获取标签集合 |

#### 示例

```typescript
import { useTagRegistry, setTagRoots } from '@/composables/useTagRegistry'

// 设置根目录
setTagRoots('/path/to/project', '/path/to/game')

const {
  isLoading,
  tags,
  statusMessage,
  refresh,
  validate
} = useTagRegistry()

// 刷新数据
await refresh()

// 验证标签
const result = await validate(fileContent)
```

## 🔤 语法补全

### useGrammarCompletion

语法补全 Composable，提供HOI4脚本语言的自动补全功能。

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `staticItems` | `Computed<GrammarCompletionItem[]>` | 静态补全项 |
| `ideaItems` | `Computed<GrammarCompletionItem[]>` | Idea补全项 |
| `tagItems` | `Computed<GrammarCompletionItem[]>` | 标签补全项 |
| `allItems` | `Computed<GrammarCompletionItem[]>` | 所有补全项 |

#### 类型定义

```typescript
export interface GrammarCompletionItem extends Completion {
  source: 'keyword' | 'idea' | 'tag'
}
```

#### 示例

```typescript
import { useGrammarCompletion } from '@/composables/useGrammarCompletion'

const {
  staticItems,
  ideaItems,
  tagItems,
  allItems
} = useGrammarCompletion()

// 使用所有补全项
console.log('可用补全项:', allItems.value)
```

## 🔤 编辑器字体

### useEditorFont

编辑器字体管理 Composable，管理CodeMirror编辑器的字体配置。

#### 返回值

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `fontConfig` | `Computed<EditorFontConfig>` | 字体配置 |
| `fontConfigVersion` | `Computed<number>` | 字体配置版本号 |
| `availableFonts` | `Array<{value: string, label: string}>` | 可用字体列表 |
| `fontWeights` | `Array<{value: string, label: string}>` | 字体粗细选项 |
| `fontSizes` | `Array<{value: number, label: string}>` | 字体大小选项 |
| `defaultFontConfig` | `EditorFontConfig` | 默认字体配置 |
| `getCompatibleFontFamily` | `(fontFamily: string) => string` | 获取跨平台兼容的字体族 |
| `createEditorFontTheme` | `(config: EditorFontConfig) => Extension` | 创建编辑器字体主题扩展 |
| `getCurrentFontConfig` | `() => EditorFontConfig` | 获取当前字体配置 |
| `setFontConfig` | `(config: Partial<EditorFontConfig>) => void` | 设置字体配置 |
| `resetFontConfig` | `() => void` | 重置为默认字体配置 |
| `loadFontConfigFromSettings` | `(settings: any) => void` | 从设置加载字体配置 |
| `getFontConfigForSettings` | `() => any` | 获取字体配置用于保存到设置 |
| `notifyFontConfigChange` | `() => void` | 通知字体配置已更新 |

#### 类型定义

```typescript
export interface EditorFontConfig {
  family: string
  size: number
  weight: string
  lineHeight: number
}
```

#### 示例

```typescript
import { useEditorFont } from '@/composables/useEditorFont'

const {
  fontConfig,
  availableFonts,
  createEditorFontTheme,
  setFontConfig
} = useEditorFont()

// 设置字体配置
setFontConfig({
  family: 'Fira Code',
  size: 16,
  weight: '400',
  lineHeight: 1.6
})

// 创建字体主题
const fontTheme = createEditorFontTheme(fontConfig.value)
```

## 🔗 相关链接

- [前端 API 概览](./README.md)
- [Tauri API](./TauriAPI.md)
- [组件 API](./Components.md)
- [后端 API](../Backend/README.md)
- [集成 API](../Integration/README.md)

---

**注意**: 所有 Composables 都遵循 Vue 3 Composition API 规范，建议使用 TypeScript 进行开发。在使用时，请确保正确处理响应式数据和生命周期钩子。