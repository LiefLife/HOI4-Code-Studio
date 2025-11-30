# Vue 组件 API 文档

本文档详细描述了 HOI4 Code Studio 前端部分的 Vue 组件接口，包括编辑器组件、对话框组件、面板组件、工具栏组件等。

## 📋 目录

- [编辑器组件](#编辑器组件)
  - [CodeMirrorEditor](#codemirroreditor)
  - [EditorGroup](#editorgroup)
  - [EditorPane](#editorpane)
  - [EditorTabs](#editortabs)
  - [EditorToolbar](#editortoolbar)
- [对话框组件](#对话框组件)
  - [ConfirmDialog](#confirmdialog)
  - [CreateDialog](#createdialog)
  - [PackageDialog](#packagedialog)
- [面板组件](#面板组件)
  - [LeftPanelTabs](#leftpaneltabs)
  - [RightPanel](#rightpanel)
  - [SearchPanel](#searchpanel)
- [树形组件](#树形组件)
  - [FileTreeNode](#filetreenode)
- [其他组件](#其他组件)
  - [ChangelogPanel](#changelogpanel)
  - [ThemePanel](#themepanel)

## 📝 编辑器组件

### CodeMirrorEditor

基于 CodeMirror 6 的高级代码编辑器组件，支持语法高亮、自动补全、错误检测等功能。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `content` | `string` | `''` | 编辑器内容 |
| `isReadOnly` | `boolean` | `false` | 是否为只读模式 |
| `fileName` | `string` | `undefined` | 文件名，用于确定语言模式 |
| `filePath` | `string` | `undefined` | 文件路径，用于错误检测 |
| `projectRoot` | `string` | `undefined` | 项目根目录，用于错误检测 |
| `gameDirectory` | `string` | `undefined` | 游戏目录，用于错误检测 |
| `disableErrorHandling` | `boolean` | `false` | 是否禁用错误处理 |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `update:content` | `content: string` | 内容更新时触发 |
| `cursorChange` | `line: number, column: number` | 光标位置变化时触发 |
| `scroll` | - | 滚动时触发 |
| `contextmenu` | `event: MouseEvent` | 右键菜单时触发 |

#### 暴露的方法

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| `getEditorView` | - | `EditorView` | 获取 CodeMirror 编辑器实例 |
| `getSelectedText` | - | `string` | 获取选中的文本 |
| `insertText` | `text: string` | - | 在光标位置插入文本 |
| `getCursorPosition` | - | `{line: number, column: number}` | 获取光标位置 |
| `cutSelection` | - | `string` | 剪切选中文本 |
| `copySelection` | - | `string` | 复制选中文本 |

#### 示例

```vue
<template>
  <CodeMirrorEditor
    ref="editorRef"
    :content="fileContent"
    :is-read-only="isReadOnly"
    :file-name="fileName"
    :file-path="filePath"
    :project-root="projectRoot"
    :game-directory="gameDirectory"
    @update:content="handleContentChange"
    @cursor-change="handleCursorChange"
    @contextmenu="handleContextMenu"
  />
</template>

<script setup>
import { ref } from 'vue'
import CodeMirrorEditor from '@/components/editor/CodeMirrorEditor.vue'

const editorRef = ref(null)
const fileContent = ref('')
const fileName = ref('example.txt')
const filePath = ref('/path/to/example.txt')
const projectRoot = ref('/path/to/project')
const gameDirectory = ref('/path/to/game')
const isReadOnly = ref(false)

function handleContentChange(content) {
  fileContent.value = content
  console.log('内容已更新:', content)
}

function handleCursorChange(line, column) {
  console.log(`光标位置: 行 ${line}, 列 ${column}`)
}

function handleContextMenu(event) {
  console.log('右键菜单:', event)
}

// 获取编辑器实例并调用方法
function insertSampleText() {
  if (editorRef.value) {
    editorRef.value.insertText('sample text')
  }
}
</script>
```

### EditorGroup

编辑器窗格组组件，支持多窗格编辑、分割视图等功能。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `projectPath` | `string` | - | 项目路径 |
| `gameDirectory` | `string` | - | 游戏目录 |
| `autoSave` | `boolean` | `false` | 是否启用自动保存 |
| `disableErrorHandling` | `boolean` | `false` | 是否禁用错误处理 |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `contextMenu` | `event: MouseEvent, paneId: string, fileIndex: number` | 右键菜单时触发 |
| `openFile` | `node: FileNode, paneId?: string` | 打开文件时触发 |
| `errorsChange` | `paneId: string, errors: Array<{line: number, msg: string, type: string}>` | 错误变化时触发 |
| `editorContextMenuAction` | `action: string, paneId: string` | 编辑器右键菜单操作时触发 |
| `previewEvent` | `paneId: string` | 预览事件时触发 |
| `previewFocus` | `paneId: string` | 预览国策树时触发 |
| `contentChange` | `paneId: string, content: string` | 内容变化时触发 |

#### 暴露的方法

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| `panes` | - | `Ref<EditorPane[]>` | 获取所有窗格 |
| `activePaneId` | - | `Ref<string>` | 获取活动窗格 ID |
| `activePane` | - | `Computed<EditorPane>` | 获取活动窗格 |
| `openFileInPane` | `node: FileNode, paneId?: string` | - | 在指定窗格打开文件 |
| `splitPane` | `paneId: string, fileIndex?: number` | - | 分割窗格 |
| `closePane` | `paneId: string` | - | 关闭窗格 |
| `setActivePane` | `paneId: string` | - | 设置活动窗格 |
| `jumpToErrorLine` | `line: number` | - | 跳转到错误行 |
| `saveCurrentFile` | - | `Promise<boolean>` | 保存当前文件 |

#### 示例

```vue
<template>
  <EditorGroup
    ref="editorGroupRef"
    :project-path="projectPath"
    :game-directory="gameDirectory"
    :auto-save="autoSave"
    @context-menu="handleContextMenu"
    @open-file="handleOpenFile"
    @errors-change="handleErrorsChange"
    @content-change="handleContentChange"
  />
</template>

<script setup>
import { ref } from 'vue'
import EditorGroup from '@/components/editor/EditorGroup.vue'

const editorGroupRef = ref(null)
const projectPath = ref('/path/to/project')
const gameDirectory = ref('/path/to/game')
const autoSave = ref(true)

function handleContextMenu(event, paneId, fileIndex) {
  console.log('右键菜单:', { event, paneId, fileIndex })
}

function handleOpenFile(node, paneId) {
  console.log('打开文件:', { node, paneId })
}

function handleErrorsChange(paneId, errors) {
  console.log('错误变化:', { paneId, errors })
}

function handleContentChange(paneId, content) {
  console.log('内容变化:', { paneId, content })
}

// 跳转到错误行
function jumpToLine(lineNumber) {
  if (editorGroupRef.value) {
    editorGroupRef.value.jumpToErrorLine(lineNumber)
  }
}

// 保存当前文件
async function saveCurrentFile() {
  if (editorGroupRef.value) {
    const success = await editorGroupRef.value.saveCurrentFile()
    console.log('保存结果:', success)
  }
}
</script>
```

### EditorPane

单个编辑器窗格组件，包含文件标签、编辑器内容和工具栏。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `pane` | `EditorPane` | - | 窗格数据 |
| `isActive` | `boolean` | `false` | 是否为活动窗格 |
| `projectPath` | `string` | - | 项目路径 |
| `gameDirectory` | `string` | - | 游戏目录 |
| `isReadOnly` | `boolean` | `false` | 是否为只读模式 |
| `disableErrorHandling` | `boolean` | `false` | 是否禁用错误处理 |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `switchFile` | `paneId: string, index: number` | 切换文件时触发 |
| `closeFile` | `paneId: string, index: number` | 关闭文件时触发 |
| `contextMenu` | `event: MouseEvent, paneId: string, index: number` | 右键菜单时触发 |
| `contentChange` | `paneId: string, content: string` | 内容变化时触发 |
| `cursorChange` | `paneId: string, line: number, column: number` | 光标位置变化时触发 |
| `saveFile` | `paneId: string` | 保存文件时触发 |
| `activate` | `paneId: string` | 激活窗格时触发 |
| `splitPane` | `paneId: string, fileIndex?: number` | 分割窗格时触发 |
| `errorsChange` | `paneId: string, errors: Array<{line: number, msg: string, type: string}>` | 错误变化时触发 |
| `editorContextMenuAction` | `action: string, paneId: string` | 编辑器右键菜单操作时触发 |
| `previewEvent` | `paneId: string` | 预览事件时触发 |
| `previewFocus` | `paneId: string` | 预览国策树时触发 |

#### 暴露的方法

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| `jumpToLine` | `line: number` | - | 跳转到指定行 |
| `getEditorMethods` | - | `ComponentPublicInstance` | 获取编辑器方法 |

#### 示例

```vue
<template>
  <EditorPane
    :pane="paneData"
    :is-active="isActive"
    :project-path="projectPath"
    :game-directory="gameDirectory"
    :is-read-only="isReadOnly"
    @switch-file="handleSwitchFile"
    @close-file="handleCloseFile"
    @content-change="handleContentChange"
    @save-file="handleSaveFile"
  />
</template>

<script setup>
import { ref } from 'vue'
import EditorPane from '@/components/editor/EditorPane.vue'

const paneData = ref({
  id: 'pane-1',
  openFiles: [],
  activeFileIndex: -1,
  width: 100
})
const isActive = ref(true)
const projectPath = ref('/path/to/project')
const gameDirectory = ref('/path/to/game')
const isReadOnly = ref(false)

function handleSwitchFile(paneId, index) {
  console.log('切换文件:', { paneId, index })
}

function handleCloseFile(paneId, index) {
  console.log('关闭文件:', { paneId, index })
}

function handleContentChange(paneId, content) {
  console.log('内容变化:', { paneId, content })
}

function handleSaveFile(paneId) {
  console.log('保存文件:', paneId)
}
</script>
```

### EditorTabs

编辑器文件标签组件，用于显示和管理打开的文件标签。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `openFiles` | `OpenFile[]` | `[]` | 打开的文件列表 |
| `activeFileIndex` | `number` | `-1` | 活动文件索引 |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `switchFile` | `index: number` | 切换文件时触发 |
| `closeFile` | `index: number` | 关闭文件时触发 |
| `contextMenu` | `event: MouseEvent, index: number` | 右键菜单时触发 |

#### 示例

```vue
<template>
  <EditorTabs
    :open-files="openFiles"
    :active-file-index="activeFileIndex"
    @switch-file="handleSwitchFile"
    @close-file="handleCloseFile"
    @context-menu="handleContextMenu"
  />
</template>

<script setup>
import { ref } from 'vue'
import EditorTabs from '@/components/editor/EditorTabs.vue'

const openFiles = ref([
  {
    node: { name: 'file1.txt', path: '/path/to/file1.txt' },
    content: '',
    hasUnsavedChanges: false,
    cursorLine: 1,
    cursorColumn: 1
  },
  {
    node: { name: 'file2.txt', path: '/path/to/file2.txt' },
    content: '',
    hasUnsavedChanges: true,
    cursorLine: 1,
    cursorColumn: 1
  }
])
const activeFileIndex = ref(0)

function handleSwitchFile(index) {
  activeFileIndex.value = index
  console.log('切换到文件:', index)
}

function handleCloseFile(index) {
  openFiles.value.splice(index, 1)
  if (activeFileIndex.value >= openFiles.value.length) {
    activeFileIndex.value = Math.max(0, openFiles.value.length - 1)
  }
  console.log('关闭文件:', index)
}

function handleContextMenu(event, index) {
  console.log('右键菜单:', { event, index })
}
</script>
```

### EditorToolbar

编辑器工具栏组件，提供常用操作按钮。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `projectName` | `string` | `undefined` | 项目名称 |
| `rightPanelExpanded` | `boolean` | `false` | 右侧面板是否展开 |
| `isLaunchingGame` | `boolean` | `false` | 是否正在启动游戏 |
| `tagCount` | `number` | `0` | 已加载的标签数量 |
| `ideaCount` | `number` | `0` | 已加载的 Idea 数量 |
| `autoSave` | `boolean` | `false` | 是否启用自动保存 |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `goBack` | - | 返回主页时触发 |
| `toggleRightPanel` | - | 切换右侧面板时触发 |
| `launchGame` | - | 启动游戏时触发 |
| `manageDependencies` | - | 管理依赖项时触发 |
| `toggleLoadingMonitor` | - | 切换加载监控时触发 |
| `packageProject` | - | 打包项目时触发 |
| `toggleAutoSave` | - | 切换自动保存时触发 |

#### 示例

```vue
<template>
  <EditorToolbar
    :project-name="projectName"
    :right-panel-expanded="rightPanelExpanded"
    :is-launching-game="isLaunchingGame"
    :tag-count="tagCount"
    :idea-count="ideaCount"
    :auto-save="autoSave"
    @go-back="handleGoBack"
    @toggle-right-panel="handleToggleRightPanel"
    @launch-game="handleLaunchGame"
    @manage-dependencies="handleManageDependencies"
    @package-project="handlePackageProject"
    @toggle-auto-save="handleToggleAutoSave"
  />
</template>

<script setup>
import { ref } from 'vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'

const projectName = ref('My HOI4 Mod')
const rightPanelExpanded = ref(true)
const isLaunchingGame = ref(false)
const tagCount = ref(150)
const ideaCount = ref(75)
const autoSave = ref(true)

function handleGoBack() {
  console.log('返回主页')
}

function handleToggleRightPanel() {
  rightPanelExpanded.value = !rightPanelExpanded.value
}

function handleLaunchGame() {
  isLaunchingGame.value = true
  console.log('启动游戏')
  setTimeout(() => {
    isLaunchingGame.value = false
  }, 3000)
}

function handleManageDependencies() {
  console.log('管理依赖项')
}

function handlePackageProject() {
  console.log('打包项目')
}

function handleToggleAutoSave() {
  autoSave.value = !autoSave.value
  console.log('自动保存:', autoSave.value ? '启用' : '禁用')
}
</script>
```

## 📝 对话框组件

### ConfirmDialog

确认对话框组件，用于确认用户操作。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `visible` | `boolean` | `false` | 是否显示对话框 |
| `title` | `string` | `'⚠️ 确认操作'` | 对话框标题 |
| `message` | `string` | - | 对话框消息 |
| `confirmText` | `string` | `'确定'` | 确认按钮文本 |
| `cancelText` | `string` | `'取消'` | 取消按钮文本 |
| `type` | `'warning' \| 'danger' \| 'info'` | `'warning'` | 对话框类型 |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `confirm` | - | 点击确认按钮时触发 |
| `cancel` | - | 点击取消按钮时触发 |

#### 示例

```vue
<template>
  <div>
    <button @click="showDialog = true">显示确认对话框</button>
    
    <ConfirmDialog
      :visible="showDialog"
      title="⚠️ 删除确认"
      message="确定要删除这个文件吗？此操作不可撤销。"
      confirm-text="删除"
      cancel-text="取消"
      type="danger"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ConfirmDialog from '@/components/editor/ConfirmDialog.vue'

const showDialog = ref(false)

function handleConfirm() {
  console.log('用户确认操作')
  showDialog.value = false
  // 执行删除操作
}

function handleCancel() {
  console.log('用户取消操作')
  showDialog.value = false
}
</script>
```

### CreateDialog

创建/重命名对话框组件，用于创建新文件/文件夹或重命名。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `visible` | `boolean` | `false` | 是否显示对话框 |
| `type` | `'file' \| 'folder'` | `'file'` | 创建类型 |
| `initialValue` | `string` | `''` | 初始值（用于重命名） |
| `mode` | `'create' \| 'rename'` | `'create'` | 对话框模式 |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `confirm` | `name: string` | 确认时触发，返回输入的名称 |
| `cancel` | - | 取消时触发 |

#### 示例

```vue
<template>
  <div>
    <button @click="showCreateFileDialog">创建文件</button>
    <button @click="showCreateFolderDialog">创建文件夹</button>
    <button @click="showRenameDialog">重命名</button>
    
    <CreateDialog
      :visible="showDialog"
      :type="dialogType"
      :initial-value="initialValue"
      :mode="dialogMode"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CreateDialog from '@/components/editor/CreateDialog.vue'

const showDialog = ref(false)
const dialogType = ref('file')
const dialogMode = ref('create')
const initialValue = ref('')

function showCreateFileDialog() {
  dialogType.value = 'file'
  dialogMode.value = 'create'
  initialValue.value = ''
  showDialog.value = true
}

function showCreateFolderDialog() {
  dialogType.value = 'folder'
  dialogMode.value = 'create'
  initialValue.value = ''
  showDialog.value = true
}

function showRenameDialog() {
  dialogType.value = 'file'
  dialogMode.value = 'rename'
  initialValue.value = 'old-name.txt'
  showDialog.value = true
}

function handleConfirm(name) {
  console.log('确认:', { type: dialogType.value, mode: dialogMode.value, name })
  showDialog.value = false
  // 执行创建或重命名操作
}

function handleCancel() {
  console.log('取消操作')
  showDialog.value = false
}
</script>
```

### PackageDialog

项目打包对话框组件，用于配置和执行项目打包。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `visible` | `boolean` | `false` | 是否显示对话框 |
| `projectName` | `string` | `undefined` | 项目名称 |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `close` | - | 关闭对话框时触发 |
| `confirm` | `fileName: string` | 确认打包时触发，返回文件名 |

#### 暴露的方法

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| `startPacking` | - | - | 开始打包（由父组件调用） |
| `updateProgress` | `message: string` | - | 更新进度（由父组件调用） |
| `finishPacking` | `result: {success: boolean, message: string, outputPath?: string}` | - | 完成打包（由父组件调用） |

#### 示例

```vue
<template>
  <div>
    <button @click="showPackageDialog = true">打包项目</button>
    
    <PackageDialog
      :visible="showPackageDialog"
      :project-name="projectName"
      ref="packageDialogRef"
      @close="handleClose"
      @confirm="handleConfirm"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { packProject } from '@/api/tauri'
import PackageDialog from '@/components/editor/PackageDialog.vue'

const showPackageDialog = ref(false)
const projectName = ref('My HOI4 Mod')
const packageDialogRef = ref(null)

async function handleConfirm(fileName) {
  if (!packageDialogRef.value) return
  
  // 开始打包
  packageDialogRef.value.startPacking()
  
  try {
    // 更新进度
    packageDialogRef.value.updateProgress('正在收集文件...')
    
    // 执行打包
    const result = await packProject({
      projectPath: '/path/to/project',
      outputName: fileName,
      excludeDependencies: false
    })
    
    // 完成打包
    packageDialogRef.value.finishPacking({
      success: result.success,
      message: result.message,
      outputPath: result.outputPath
    })
  } catch (error) {
    // 打包失败
    packageDialogRef.value.finishPacking({
      success: false,
      message: `打包失败: ${error}`
    })
  }
}

function handleClose() {
  showPackageDialog.value = false
}
</script>
```

## 📝 面板组件

### LeftPanelTabs

左侧面板标签组件，用于切换项目和依赖项视图。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `activeTab` | `'project' \| 'dependencies'` | `'project'` | 活动标签 |
| `activeDependencyId` | `string` | `undefined` | 活动依赖项 ID |
| `dependencies` | `Dependency[]` | `[]` | 依赖项列表 |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `switchToProject` | - | 切换到项目标签时触发 |
| `switchToDependency` | `id: string` | 切换到依赖项标签时触发 |
| `manageDependencies` | - | 管理依赖项时触发 |

#### 示例

```vue
<template>
  <LeftPanelTabs
    :active-tab="activeTab"
    :active-dependency-id="activeDependencyId"
    :dependencies="dependencies"
    @switch-to-project="handleSwitchToProject"
    @switch-to-dependency="handleSwitchToDependency"
    @manage-dependencies="handleManageDependencies"
  />
</template>

<script setup>
import { ref } from 'vue'
import LeftPanelTabs from '@/components/editor/LeftPanelTabs.vue'

const activeTab = ref('project')
const activeDependencyId = ref('')
const dependencies = ref([
  {
    id: 'dep1',
    name: 'Dependency 1',
    path: '/path/to/dep1',
    type: 'hoics',
    addedAt: '2023-01-01',
    enabled: true
  },
  {
    id: 'dep2',
    name: 'Dependency 2',
    path: '/path/to/dep2',
    type: 'hoi4mod',
    addedAt: '2023-01-02',
    enabled: true
  }
])

function handleSwitchToProject() {
  activeTab.value = 'project'
  console.log('切换到项目视图')
}

function handleSwitchToDependency(id) {
  activeTab.value = 'dependencies'
  activeDependencyId.value = id
  console.log('切换到依赖项:', id)
}

function handleManageDependencies() {
  console.log('管理依赖项')
}
</script>
```

### RightPanel

右侧面板组件，包含项目信息、游戏目录、错误列表和搜索等功能。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `projectInfo` | `any` | - | 项目信息 |
| `gameDirectory` | `string` | - | 游戏目录 |
| `gameFileTree` | `FileNode[]` | `[]` | 游戏文件树 |
| `isLoadingGameTree` | `boolean` | `false` | 是否正在加载游戏文件树 |
| `txtErrors` | `Array<{line: number, msg: string, type: string}>` | `[]` | 错误列表 |
| `width` | `number` | `300` | 面板宽度 |
| `searchQuery` | `string` | `''` | 搜索查询 |
| `searchResults` | `SearchResult[]` | `[]` | 搜索结果 |
| `isSearching` | `boolean` | `false` | 是否正在搜索 |
| `searchCaseSensitive` | `boolean` | `false` | 是否区分大小写 |
| `searchRegex` | `boolean` | `false` | 是否使用正则表达式 |
| `searchScope` | `string` | `'project'` | 搜索范围 |
| `includeAllFiles` | `boolean` | `false` | 是否包含所有文件类型 |
| `projectPath` | `string` | - | 项目路径 |
| `activeTab` | `'info' \| 'game' \| 'errors' \| 'search'` | `'info'` | 活动标签 |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `close` | - | 关闭面板时触发 |
| `resize` | `event: MouseEvent` | 调整大小时触发 |
| `jumpToError` | `error: {line: number, msg: string, type: string}` | 跳转到错误时触发 |
| `toggleGameFolder` | `node: FileNode` | 切换游戏文件夹时触发 |
| `openFile` | `node: FileNode` | 打开文件时触发 |
| `update:searchQuery` | `value: string` | 搜索查询更新时触发 |
| `update:searchCaseSensitive` | `value: boolean` | 大小写敏感设置更新时触发 |
| `update:searchRegex` | `value: boolean` | 正则表达式设置更新时触发 |
| `update:searchScope` | `value: string` | 搜索范围更新时触发 |
| `update:includeAllFiles` | `value: boolean` | 包含所有文件类型设置更新时触发 |
| `performSearch` | - | 执行搜索时触发 |
| `jumpToSearchResult` | `result: SearchResult` | 跳转到搜索结果时触发 |
| `update:activeTab` | `value: 'info' \| 'game' \| 'errors' \| 'search'` | 活动标签更新时触发 |

#### 示例

```vue
<template>
  <RightPanel
    :project-info="projectInfo"
    :game-directory="gameDirectory"
    :game-file-tree="gameFileTree"
    :is-loading-game-tree="isLoadingGameTree"
    :txt-errors="txtErrors"
    :width="panelWidth"
    :search-query="searchQuery"
    :search-results="searchResults"
    :is-searching="isSearching"
    :search-case-sensitive="searchCaseSensitive"
    :search-regex="searchRegex"
    :search-scope="searchScope"
    :include-all-files="includeAllFiles"
    :project-path="projectPath"
    :active-tab="activeTab"
    @close="handleClose"
    @jump-to-error="handleJumpToError"
    @open-file="handleOpenFile"
    @update:search-query="handleSearchQueryUpdate"
    @perform-search="handlePerformSearch"
    @jump-to-search-result="handleJumpToSearchResult"
  />
</template>

<script setup>
import { ref } from 'vue'
import RightPanel from '@/components/editor/RightPanel.vue'

const projectInfo = ref({ name: 'My Mod', version: '1.0.0' })
const gameDirectory = ref('/path/to/game')
const gameFileTree = ref([])
const isLoadingGameTree = ref(false)
const txtErrors = ref([])
const panelWidth = ref(300)
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const searchCaseSensitive = ref(false)
const searchRegex = ref(false)
const searchScope = ref('project')
const includeAllFiles = ref(false)
const projectPath = ref('/path/to/project')
const activeTab = ref('info')

function handleClose() {
  console.log('关闭右侧面板')
}

function handleJumpToError(error) {
  console.log('跳转到错误:', error)
}

function handleOpenFile(node) {
  console.log('打开文件:', node)
}

function handleSearchQueryUpdate(value) {
  searchQuery.value = value
}

function handlePerformSearch() {
  console.log('执行搜索:', searchQuery.value)
  isSearching.value = true
  // 执行搜索逻辑
  setTimeout(() => {
    isSearching.value = false
    searchResults.value = [
      {
        file: { name: 'result.txt', path: '/path/to/result.txt', isDirectory: false },
        line: 10,
        content: 'search result content',
        matchStart: 5,
        matchEnd: 15
      }
    ]
  }, 1000)
}

function handleJumpToSearchResult(result) {
  console.log('跳转到搜索结果:', result)
}
</script>
```

### SearchPanel

搜索面板组件，提供文件内容搜索功能。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `searchQuery` | `string` | `''` | 搜索查询 |
| `searchResults` | `SearchResult[]` | `[]` | 搜索结果 |
| `isSearching` | `boolean` | `false` | 是否正在搜索 |
| `searchCaseSensitive` | `boolean` | `false` | 是否区分大小写 |
| `searchRegex` | `boolean` | `false` | 是否使用正则表达式 |
| `searchScope` | `string` | `'project'` | 搜索范围 |
| `includeAllFiles` | `boolean` | `false` | 是否包含所有文件类型 |
| `projectPath` | `string` | - | 项目路径 |
| `gameDirectory` | `string` | - | 游戏目录 |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `jumpToResult` | `result: SearchResult` | 跳转到搜索结果时触发 |
| `update:searchQuery` | `value: string` | 搜索查询更新时触发 |
| `update:searchCaseSensitive` | `value: boolean` | 大小写敏感设置更新时触发 |
| `update:searchRegex` | `value: boolean` | 正则表达式设置更新时触发 |
| `update:searchScope` | `value: string` | 搜索范围更新时触发 |
| `update:includeAllFiles` | `value: boolean` | 包含所有文件类型设置更新时触发 |
| `performSearch` | - | 执行搜索时触发 |

#### 示例

```vue
<template>
  <SearchPanel
    :search-query="searchQuery"
    :search-results="searchResults"
    :is-searching="isSearching"
    :search-case-sensitive="searchCaseSensitive"
    :search-regex="searchRegex"
    :search-scope="searchScope"
    :include-all-files="includeAllFiles"
    :project-path="projectPath"
    :game-directory="gameDirectory"
    @jump-to-result="handleJumpToResult"
    @update:search-query="handleSearchQueryUpdate"
    @perform-search="handlePerformSearch"
  />
</template>

<script setup>
import { ref } from 'vue'
import SearchPanel from '@/components/editor/SearchPanel.vue'

const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const searchCaseSensitive = ref(false)
const searchRegex = ref(false)
const searchScope = ref('project')
const includeAllFiles = ref(false)
const projectPath = ref('/path/to/project')
const gameDirectory = ref('/path/to/game')

function handleJumpToResult(result) {
  console.log('跳转到搜索结果:', result)
}

function handleSearchQueryUpdate(value) {
  searchQuery.value = value
}

function handlePerformSearch() {
  console.log('执行搜索:', searchQuery.value)
  isSearching.value = true
  // 执行搜索逻辑
  setTimeout(() => {
    isSearching.value = false
    searchResults.value = [
      {
        file: { name: 'result.txt', path: '/path/to/result.txt', isDirectory: false },
        line: 10,
        content: 'search result content',
        matchStart: 5,
        matchEnd: 15
      }
    ]
  }, 1000)
}
</script>
```

## 🌳 树形组件

### FileTreeNode

文件树节点组件，用于显示文件和目录的树形结构。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `node` | `FileNode` | - | 节点数据 |
| `level` | `number` | `0` | 节点层级 |
| `selectedPath` | `string \| null` | `null` | 选中的路径 |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `toggle` | `node: FileNode` | 切换文件夹展开/折叠时触发 |
| `openFile` | `node: FileNode` | 打开文件时触发 |
| `contextmenu` | `event: MouseEvent, node: FileNode` | 右键菜单时触发 |

#### 示例

```vue
<template>
  <div class="file-tree">
    <FileTreeNode
      v-for="node in fileTree"
      :key="node.path"
      :node="node"
      :level="0"
      :selected-path="selectedPath"
      @toggle="handleToggle"
      @open-file="handleOpenFile"
      @contextmenu="handleContextMenu"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import FileTreeNode from '@/components/FileTreeNode.vue'

const fileTree = ref([
  {
    name: 'src',
    path: '/path/to/src',
    isDirectory: true,
    expanded: true,
    children: [
      {
        name: 'main.js',
        path: '/path/to/src/main.js',
        isDirectory: false
      },
      {
        name: 'components',
        path: '/path/to/src/components',
        isDirectory: true,
        expanded: false,
        children: [
          {
            name: 'App.vue',
            path: '/path/to/src/components/App.vue',
            isDirectory: false
          }
        ]
      }
    ]
  }
])
const selectedPath = ref('')

function handleToggle(node) {
  node.expanded = !node.expanded
  console.log('切换文件夹:', node.name, node.expanded ? '展开' : '折叠')
}

function handleOpenFile(node) {
  selectedPath.value = node.path
  console.log('打开文件:', node.path)
}

function handleContextMenu(event, node) {
  console.log('右键菜单:', { node: node.name, event })
}
</script>
```

## 🎨 其他组件

### ChangelogPanel

更新日志面板组件，用于显示应用程序的更新历史。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `visible` | `boolean` | `false` | 是否显示面板 |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `close` | - | 关闭面板时触发 |

#### 示例

```vue
<template>
  <div>
    <button @click="showChangelog = true">查看更新日志</button>
    
    <ChangelogPanel
      :visible="showChangelog"
      @close="showChangelog = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ChangelogPanel from '@/components/ChangelogPanel.vue'

const showChangelog = ref(false)
</script>
```

### ThemePanel

主题面板组件，用于选择和预览应用程序主题。

#### Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `visible` | `boolean` | `false` | 是否显示面板 |
| `currentThemeId` | `string` | `'onedark'` | 当前主题 ID |

#### Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `close` | - | 关闭面板时触发 |
| `selectTheme` | `themeId: string` | 选择主题时触发 |

#### 示例

```vue
<template>
  <div>
    <button @click="showThemePanel = true">切换主题</button>
    
    <ThemePanel
      :visible="showThemePanel"
      :current-theme-id="currentThemeId"
      @close="showThemePanel = false"
      @select-theme="handleSelectTheme"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ThemePanel from '@/components/ThemePanel.vue'

const showThemePanel = ref(false)
const currentThemeId = ref('onedark')

function handleSelectTheme(themeId) {
  currentThemeId.value = themeId
  console.log('选择主题:', themeId)
}
</script>
```

## 🔗 相关链接

- [前端 API 概览](./README.md)
- [Tauri API](./TauriAPI.md)
- [组合式函数 API](./Composables.md)
- [后端 API](../Backend/README.md)
- [集成 API](../Integration/README.md)

---

**注意**: 所有组件都遵循 Vue 3 Composition API 规范，建议使用 TypeScript 进行开发。组件的 Props 和 Events 都有完整的类型定义，可以在开发过程中获得良好的类型提示和检查。