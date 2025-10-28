<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { loadSettings, buildDirectoryTreeFast, createFile, createFolder, writeJsonFile } from '../api/tauri'
import { collectErrors } from '../utils/ErrorTip'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'

// 组件导入
import EditorToolbar from '../components/editor/EditorToolbar.vue'
import EditorTabs from '../components/editor/EditorTabs.vue'
import CodeMirrorEditor from '../components/editor/CodeMirrorEditor.vue'
import RightPanel from '../components/editor/RightPanel.vue'
import ContextMenu from '../components/editor/ContextMenu.vue'
import CreateDialog from '../components/editor/CreateDialog.vue'
import FileTreeNode from '../components/FileTreeNode.vue'

// Composables 导入
import { useFileManager, type FileNode } from '../composables/useFileManager'
import { useEditorState } from '../composables/useEditorState'
import { useSyntaxHighlight } from '../composables/useSyntaxHighlight'
import { useSearch } from '../composables/useSearch'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { usePanelResize } from '../composables/usePanelResize'
import SearchPanel from '../components/editor/SearchPanel.vue'

// Prism 语法定义
Prism.languages.mod = {
  'comment': { pattern: /#.*/, greedy: true },
  'mod-key': {
    pattern: /^(\s*)(version|tags|name|replace_path|supported_version)\s*(=)/m,
    lookbehind: false,
    inside: {
      'whitespace': /^\s+/,
      'keyword': /(version|tags|name|replace_path|supported_version)/,
      'punctuation': /=/
    }
  },
  'string': { pattern: /"(?:[^"\\]|\\.)*"/, greedy: true },
  'number': /\b\d+(?:\.\d+)?\b/,
  'punctuation': /[{}[\],]/,
  'operator': /=/
}

Prism.languages.hoi4 = {
  'comment': { pattern: /#.*/, greedy: true },
  'hoi4-key': {
    pattern: /^(\s*)([a-zA-Z0-9_\.\-]+)(?=\s*=)/m,
    lookbehind: false,
    inside: {
      'whitespace': /^\s+/,
      'property': /[a-zA-Z0-9_\.\-]+/
    }
  },
  'hoi4-keyword-purple': { pattern: /\b(no|yes|true|false|if|limit)\b/, greedy: true },
  'string': { pattern: /"(?:[^"\\]|\\.)*"/, greedy: true },
  'number': /\b\d+(?:\.\d+)?\b/,
  'punctuation': /[{}[\],]/,
  'operator': /[=<>]/
}

const router = useRouter()
const route = useRoute()

// 基础状态
const projectPath = ref('')
const projectInfo = ref<any>(null)
const loading = ref(true)
const fileTree = ref<FileNode[]>([])
const selectedNode = ref<FileNode | null>(null)
const gameDirectory = ref('')
const gameFileTree = ref<FileNode[]>([])
const isLoadingGameTree = ref(false)
const rightPanelExpanded = ref(true)
const txtErrors = ref<{line: number, msg: string, type: string}[]>([])

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuType = ref<'file' | 'tree'>('file')
const contextMenuFileIndex = ref(-1)
const treeContextMenuNode = ref<FileNode | null>(null)

// 创建对话框状态
const createDialogVisible = ref(false)
const createDialogType = ref<'file' | 'folder'>('file')

// Refs
const editorRef = ref<InstanceType<typeof CodeMirrorEditor> | null>(null)

// CodeMirror 内置滚动和高亮，无需额外状态

// 使用 Composables
const {
  openFiles,
  activeFileIndex,
  currentFile,
  openFile,
  switchToFile,
  closeFile,
  closeAllFiles,
  closeOtherFiles,
  saveFile,
  updateCurrentFile,
  updateFileState,
  isFileReadOnly
} = useFileManager(gameDirectory.value)

const {
  fileContent,
  hasUnsavedChanges,
  currentLine,
  currentColumn,
  isReadOnly,
  onContentChange,
  resetUnsavedChanges,
  setReadOnly
} = useEditorState()

const {
  highlightCode,
  getLanguage
} = useSyntaxHighlight()

const {
  leftPanelWidth,
  rightPanelWidth,
  startResizeLeft
} = usePanelResize()

// 搜索功能
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

const searchPanelVisible = ref(false)

// 计算行数
const lineCount = ref(1)
watch(fileContent, (content) => {
  lineCount.value = content ? content.split('\n').length : 1
})

// 转换文件节点
function convertRustFileNode(node: any): FileNode {
  return {
    name: node.name,
    path: node.path,
    isDirectory: node.is_directory,
    children: node.children?.map(convertRustFileNode),
    expanded: node.expanded || false
  }
}

// 加载项目信息
async function loadProjectInfo() {
  if (!projectPath.value) return
  try {
    const projectJsonPath = `${projectPath.value}/project.json`
    const { readJsonFile } = await import('../api/tauri')
    const result = await readJsonFile(projectJsonPath)
    if (result.success && result.data) {
      projectInfo.value = result.data
      return
    }
    const shouldInitialize = confirm('检测到此文件夹不是HOI4 Code Studio项目，是否要将其初始化为项目？')
    if (shouldInitialize) {
      try {
        const descriptorPath = `${projectPath.value}/descriptor.mod`
        const { readFileContent } = await import('../api/tauri')
        const descriptorResult = await readFileContent(descriptorPath)
        if (descriptorResult.success) {
          const content = descriptorResult.content
          const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m)
          const modName = nameMatch ? nameMatch[1] : 'Unknown Mod'
          const projectData = { name: modName, version: '1.0.0', created_at: new Date().toISOString() }
          const writeResult = await writeJsonFile(projectJsonPath, projectData)
          if (writeResult.success) {
            projectInfo.value = projectData
            alert(`项目初始化成功！项目名称: ${modName}`)
          } else {
            alert(`项目初始化失败: ${writeResult.message}`)
          }
        } else {
          alert(`无法读取 descriptor.mod 文件: ${descriptorResult.message}\n请确保项目根目录包含有效的 descriptor.mod 文件。`)
        }
      } catch (error) {
        console.error('项目初始化失败:', error)
        alert(`项目初始化失败: ${error}`)
      }
    }
  } catch (error) {
    console.error('加载项目信息失败:', error)
  }
}

// 加载文件树
async function loadFileTree() {
  if (!projectPath.value) return
  try {
    const result = await buildDirectoryTreeFast(projectPath.value, 3)
    if (result.success && result.tree) {
      fileTree.value = result.tree.map(convertRustFileNode)
    }
  } catch (error) {
    console.error('加载文件树失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载游戏目录
async function loadGameDirectory() {
  try {
    const result = await loadSettings()
    if (result.success && result.data && result.data.gameDirectory) {
      gameDirectory.value = result.data.gameDirectory
      await loadGameFileTree()
    }
  } catch (error) {
    console.error('加载游戏目录设置失败:', error)
  }
}

// 加载游戏文件树
async function loadGameFileTree() {
  if (!gameDirectory.value) return
  isLoadingGameTree.value = true
  try {
    const result = await buildDirectoryTreeFast(gameDirectory.value, 3)
    if (result.success && result.tree) {
      gameFileTree.value = result.tree.map(convertRustFileNode)
    }
  } catch (error) {
    console.error('加载游戏目录文件树失败:', error)
  } finally {
    isLoadingGameTree.value = false
  }
}

// 切换文件夹
async function toggleFolder(node: FileNode) {
  if (!node.isDirectory) return
  selectedNode.value = node
  node.expanded = !node.expanded
  if (node.expanded && (!node.children || node.children.length === 0)) {
    try {
      const result = await buildDirectoryTreeFast(node.path, 2)
      if (result.success && result.tree) {
        node.children = result.tree.map(convertRustFileNode)
      }
    } catch (error) {
      console.error('加载子目录失败:', error)
    }
  }
}

// 切换游戏文件夹
async function toggleGameFolder(node: FileNode) {
  if (!node.isDirectory) return
  node.expanded = !node.expanded
  if (node.expanded && (!node.children || node.children.length === 0)) {
    try {
      const result = await buildDirectoryTreeFast(node.path, 2)
      if (result.success && result.tree) {
        node.children = result.tree.map(convertRustFileNode)
      }
    } catch (error) {
      console.error('加载游戏目录子目录失败:', error)
    }
  }
}

// 打开文件处理
async function handleOpenFile(node: FileNode) {
  selectedNode.value = node
  const success = await openFile(node, (content) => {
    fileContent.value = content
    hasUnsavedChanges.value = false
    setReadOnly(isFileReadOnly(node.path))
    nextTick(() => {
      if (currentFile.value) {
        const language = getLanguage(currentFile.value.name)
        if (language === 'hoi4') {
          txtErrors.value = collectErrors(content, { filePath: node.path, projectRoot: projectPath.value })
        } else {
          txtErrors.value = []
        }
        highlightCode(content, currentFile.value.name, txtErrors.value)
      }
    })
  })
  if (success) {
    updateCurrentFile()
  }
}

// 切换文件
function handleSwitchFile(index: number) {
  switchToFile(index, fileContent.value)
  const file = updateCurrentFile()
  if (file) {
    fileContent.value = file.content
    hasUnsavedChanges.value = file.hasUnsavedChanges
    currentLine.value = file.cursorLine
    currentColumn.value = file.cursorColumn
    setReadOnly(isFileReadOnly(file.node.path))
    nextTick(() => {
      if (currentFile.value) {
        const language = getLanguage(currentFile.value.name)
        if (language === 'hoi4') {
          txtErrors.value = collectErrors(fileContent.value, { filePath: file.node.path, projectRoot: projectPath.value })
        } else {
          txtErrors.value = []
        }
        highlightCode(fileContent.value, currentFile.value.name, txtErrors.value)
      }
    })
  }
}

// 关闭文件
function handleCloseFile(index: number) {
  closeFile(index)
  const file = updateCurrentFile()
  if (file) {
    fileContent.value = file.content
    hasUnsavedChanges.value = file.hasUnsavedChanges
  } else {
    fileContent.value = ''
    hasUnsavedChanges.value = false
  }
}

// 保存文件
async function handleSaveFile() {
  if (!currentFile.value || !hasUnsavedChanges.value) return
  const success = await saveFile(fileContent.value)
  if (success) {
    hasUnsavedChanges.value = false
    resetUnsavedChanges()
  }
}

// 内容变化
function handleContentChange(content: string) {
  // CodeMirror 内置撤销/重做，无需手动保存历史
  onContentChange(content)
  updateFileState(content, true)
  
  if (currentFile.value) {
    const language = getLanguage(currentFile.value.name)
    if (language === 'hoi4') {
      txtErrors.value = collectErrors(content, { filePath: currentFile.value.path, projectRoot: projectPath.value })
    }
    highlightCode(content, currentFile.value.name, txtErrors.value)
  }
}

// 光标位置变化
function handleCursorChange(line: number, column: number) {
  currentLine.value = line
  currentColumn.value = column
  if (activeFileIndex.value >= 0 && openFiles.value[activeFileIndex.value]) {
    openFiles.value[activeFileIndex.value].cursorLine = line
    openFiles.value[activeFileIndex.value].cursorColumn = column
  }
}


// 撤销
function handleUndo() {
  // contentEditable有自己的撤销/重做机制
  // 简化处理，只更新文件状态
  if (currentFile.value) {
    highlightCode(fileContent.value, currentFile.value.name, txtErrors.value)
  }
}

// 重做
function handleRedo() {
  // contentEditable有自己的撤销/重做机制
  // 简化处理，只更新文件状态
  if (currentFile.value) {
    highlightCode(fileContent.value, currentFile.value.name, txtErrors.value)
  }
}

// 滚动同步（CodeMirror 内置滚动，简化处理）
function handleScroll() {
  // CodeMirror 内置滚动管理，无需额外同步
}

// 右键菜单
function showFileTabContextMenu(event: MouseEvent, index: number) {
  contextMenuFileIndex.value = index
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuType.value = 'file'
  contextMenuVisible.value = true
}

function showTreeContextMenu(event: MouseEvent, node: FileNode | null = null) {
  treeContextMenuNode.value = node
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuType.value = 'tree'
  contextMenuVisible.value = true
}

function hideContextMenu() {
  contextMenuVisible.value = false
}

function handleContextMenuAction(action: string) {
  if (contextMenuType.value === 'file') {
    if (action === 'closeAll') {
      closeAllFiles()
    } else if (action === 'closeOthers') {
      closeOtherFiles(contextMenuFileIndex.value)
    }
  } else if (contextMenuType.value === 'tree') {
    if (action === 'createFile') {
      createDialogType.value = 'file'
      createDialogVisible.value = true
    } else if (action === 'createFolder') {
      createDialogType.value = 'folder'
      createDialogVisible.value = true
    }
  }
  hideContextMenu()
}

// 创建文件/文件夹
async function handleCreateConfirm(name: string) {
  let parentPath: string
  if (treeContextMenuNode.value) {
    parentPath = treeContextMenuNode.value.isDirectory 
      ? treeContextMenuNode.value.path 
      : treeContextMenuNode.value.path.substring(0, treeContextMenuNode.value.path.lastIndexOf('\\'))
  } else if (selectedNode.value) {
    parentPath = selectedNode.value.isDirectory 
      ? selectedNode.value.path 
      : selectedNode.value.path.substring(0, selectedNode.value.path.lastIndexOf('\\'))
  } else {
    parentPath = projectPath.value
  }
  const targetPath = `${parentPath}\\${name}`
  try {
    let result
    if (createDialogType.value === 'file') {
      result = await createFile(targetPath, '', false)
    } else {
      result = await createFolder(targetPath)
    }
    if (result.success) {
      await loadFileTree()
      createDialogVisible.value = false
    } else {
      alert(result.message || '创建失败')
    }
  } catch (error) {
    console.error('创建失败:', error)
    alert(`创建失败: ${error}`)
  }
}

// 返回主界面
function goBack() {
  const hasUnsaved = openFiles.value.some(f => f.hasUnsavedChanges)
  if (hasUnsaved) {
    if (!confirm('有文件包含未保存的更改，是否放弃所有更改？')) {
      return
    }
  }
  router.push('/')
}

// 切换右侧面板
function toggleRightPanel() {
  rightPanelExpanded.value = !rightPanelExpanded.value
}

// 跳转到错误行
async function jumpToError(error: {line: number, msg: string, type: string}) {
  const view = editorRef.value?.editorView as any
  if (!view) return
  
  try {
    const targetLine = Math.max(1, Math.min(error.line, view.state.doc.lines))
    const line = view.state.doc.line(targetLine)
    const pos = line.from
    
    view.dispatch({
      selection: { anchor: pos, head: pos },
      scrollIntoView: true
    })
    view.focus()
  } catch (error) {
    console.error('Jump to error failed:', error)
  }
}

// 处理搜索
function handlePerformSearch() {
  const searchPath = searchScope.value === 'project' ? projectPath.value : gameDirectory.value
  if (searchPath) {
    performSearch(searchPath)
  }
}

function handleJumpToSearchResult(result: any) {
  const view = editorRef.value?.editorView
  if (!view) return
  
  jumpToResult(result, view)
  searchPanelVisible.value = false
}

// 键盘快捷键
useKeyboardShortcuts({
  save: () => {
    if (currentFile.value && hasUnsavedChanges.value) {
      handleSaveFile()
    }
  },
  undo: handleUndo,
  redo: handleRedo,
  search: () => {
    searchPanelVisible.value = !searchPanelVisible.value
  }
})

// 生命周期
onMounted(() => {
  projectPath.value = route.query.path as string || ''
  if (projectPath.value) {
    loadProjectInfo()
    loadFileTree()
    loadGameDirectory()
  } else {
    loading.value = false
  }
  document.addEventListener('click', hideContextMenu)
})
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-hoi4-dark overflow-hidden">
    <!-- 顶部工具栏 -->
    <EditorToolbar
      :project-name="projectInfo?.name"
      :right-panel-expanded="rightPanelExpanded"
      @go-back="goBack"
      @toggle-right-panel="toggleRightPanel"
    />

    <!-- 主内容区域 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧文件树面板 -->
      <div
        class="bg-hoi4-gray border-r-2 border-hoi4-border overflow-y-auto flex-shrink-0"
        :style="{ width: leftPanelWidth + 'px' }"
        @contextmenu.prevent="showTreeContextMenu($event, null)"
      >
        <div class="p-2">
          <h3 class="text-hoi4-text font-bold mb-2 text-sm">文件目录</h3>
          <div v-if="loading" class="text-hoi4-text-dim text-sm p-2">加载中...</div>
          <div v-else-if="fileTree.length === 0" class="text-hoi4-text-dim text-sm p-2">无文件</div>
          <div v-else>
            <FileTreeNode
              v-for="node in fileTree"
              :key="node.path"
              :node="node"
              :level="0"
              :selected-path="selectedNode?.path"
              @toggle="toggleFolder"
              @open-file="handleOpenFile"
              @contextmenu="showTreeContextMenu"
            />
          </div>
        </div>
      </div>

      <!-- 左侧拖动条 -->
      <div
        class="w-1 bg-hoi4-border hover:bg-hoi4-accent cursor-col-resize flex-shrink-0"
        @mousedown="startResizeLeft"
      ></div>

      <!-- 中间编辑区域 -->
      <div class="flex-1 bg-hoi4-dark flex flex-col overflow-hidden">
        <!-- 文件标签栏 -->
        <div v-if="openFiles.length > 0" class="bg-hoi4-gray border-b-2 border-hoi4-border">
          <EditorTabs
            :open-files="openFiles"
            :active-file-index="activeFileIndex"
            @switch-file="handleSwitchFile"
            @close-file="handleCloseFile"
            @context-menu="showFileTabContextMenu"
          />
          
          <!-- 编辑器工具栏 -->
          <div class="px-4 py-2 flex items-center justify-between bg-hoi4-accent">
            <div class="flex items-center space-x-2">
              <button
                @click="handleSaveFile"
                class="px-3 py-1 bg-hoi4-gray hover:bg-hoi4-border rounded text-hoi4-text text-xs transition-colors flex items-center space-x-1"
                :disabled="!hasUnsavedChanges || isReadOnly"
                :class="{ 'opacity-50 cursor-not-allowed': !hasUnsavedChanges || isReadOnly }"
                title="保存 (Ctrl+S)"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                </svg>
                <span>保存</span>
              </button>
            </div>
            
            <div class="flex items-center space-x-4 text-xs text-hoi4-text-dim">
              <span v-if="isReadOnly" class="text-red-400 font-semibold">只读</span>
              <span>行: {{ currentLine }}</span>
              <span>列: {{ currentColumn }}</span>
              <span>字符: {{ fileContent.length }}</span>
            </div>
          </div>
        </div>

        <!-- 编辑器 -->
        <div v-if="currentFile" class="flex-1 overflow-hidden relative">
          <CodeMirrorEditor
            ref="editorRef"
            :content="fileContent"
            :is-read-only="isReadOnly"
            :file-name="currentFile?.name"
            :file-path="currentFile?.path"
            :project-root="projectPath"
            @update:content="handleContentChange"
            @cursor-change="handleCursorChange"
            @scroll="handleScroll"
          />
        </div>

        <!-- 空状态 -->
        <div v-else class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <h2 class="text-hoi4-text text-2xl font-bold mb-4">编辑器区域</h2>
            <p class="text-hoi4-text-dim">点击左侧文件树中的文件进行编辑</p>
          </div>
        </div>
      </div>

      <!-- 右侧面板 -->
      <RightPanel
        v-if="rightPanelExpanded"
        :project-info="projectInfo"
        :game-directory="gameDirectory"
        :game-file-tree="gameFileTree"
        :is-loading-game-tree="isLoadingGameTree"
        :txt-errors="txtErrors"
        :width="rightPanelWidth"
        @close="toggleRightPanel"
        @jumpToError="jumpToError"
        @toggleGameFolder="toggleGameFolder"
        @openFile="handleOpenFile"
      />
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      :menu-type="contextMenuType"
      @action="handleContextMenuAction"
      @close="hideContextMenu"
    />

    <!-- 创建对话框 -->
    <CreateDialog
      :visible="createDialogVisible"
      :type="createDialogType"
      @confirm="handleCreateConfirm"
      @cancel="createDialogVisible = false"
    />

    <!-- 搜索面板 -->
    <SearchPanel
      :visible="searchPanelVisible"
      :search-query="searchQuery"
      :search-results="searchResults"
      :is-searching="isSearching"
      :search-case-sensitive="searchCaseSensitive"
      :search-regex="searchRegex"
      :search-scope="searchScope"
      :project-path="projectPath"
      :game-directory="gameDirectory"
      @close="searchPanelVisible = false"
      @jump-to-result="handleJumpToSearchResult"
      @update:search-query="searchQuery = $event"
      @update:search-case-sensitive="searchCaseSensitive = $event"
      @update:search-regex="searchRegex = $event"
      @update:search-scope="searchScope = $event as 'project' | 'game'"
      @perform-search="handlePerformSearch"
    />
  </div>
</template>

<style scoped>
.cursor-col-resize {
  cursor: col-resize;
}
</style>
