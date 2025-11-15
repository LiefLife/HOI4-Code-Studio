<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { loadSettings, buildDirectoryTreeFast, createFile, createFolder, writeJsonFile } from '../api/tauri'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'

// 组件导入
import EditorToolbar from '../components/editor/EditorToolbar.vue'
import EditorGroup from '../components/editor/EditorGroup.vue'
import RightPanel from '../components/editor/RightPanel.vue'
import ContextMenu from '../components/editor/ContextMenu.vue'
import CreateDialog from '../components/editor/CreateDialog.vue'
import FileTreeNode from '../components/FileTreeNode.vue'

// Composables 导入
import { type FileNode } from '../composables/useFileManager'
import { useSearch } from '../composables/useSearch'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { usePanelResize } from '../composables/usePanelResize'
import SearchPanel from '../components/editor/SearchPanel.vue'
import { setTagRoots, useTagRegistry } from '../composables/useTagRegistry'
import { setIdeaRoots, useIdeaRegistry, ensureIdeaRegistry } from '../composables/useIdeaRegistry'
import { logger } from '../utils/logger'
import { readFileContent } from '../api/tauri'

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
const contextMenuType = ref<'file' | 'tree' | 'pane'>('file')
const contextMenuPaneId = ref('')
const contextMenuFileIndex = ref(-1)
const treeContextMenuNode = ref<FileNode | null>(null)

// 创建对话框状态
const createDialogVisible = ref(false)
const createDialogType = ref<'file' | 'folder'>('file')

// Refs
const editorGroupRef = ref<InstanceType<typeof EditorGroup> | null>(null)

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
  performSearch
} = useSearch()

const searchPanelVisible = ref(false)

// 标签状态
const { isLoading: tagLoading, statusMessage: tagStatus, refresh: refreshTags } = useTagRegistry()

// idea状态
const { isLoading: ideaLoading, statusMessage: ideaStatus, refresh: refreshIdeas } = useIdeaRegistry()

async function handleRefreshTags() {
  await refreshTags()
}

async function handleRefreshIdeas() {
  await refreshIdeas()
}

// 计算行数（已移至EditorPane）

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
        logger.error('项目初始化失败:', error)
        alert(`项目初始化失败: ${error}`)
      }
    }
  } catch (error) {
    logger.error('加载项目信息失败:', error)
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
    setTagRoots(projectPath.value, gameDirectory.value)
    await refreshTags()
    setIdeaRoots(projectPath.value, gameDirectory.value)
    await refreshIdeas()
  } catch (error) {
    logger.error('加载文件树失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载游戏目录
async function loadGameDirectory() {
  try {
    const result = await loadSettings()
    if (result.success && result.data && typeof result.data === 'object' && 'gameDirectory' in result.data) {
      gameDirectory.value = result.data.gameDirectory as string
      setTagRoots(projectPath.value, gameDirectory.value)
      await loadGameFileTree()
      await refreshTags()
      setIdeaRoots(projectPath.value, gameDirectory.value)
      await ensureIdeaRegistry()
    } else {
      setTagRoots(projectPath.value, undefined)
      await refreshTags()
      setIdeaRoots(projectPath.value, undefined)
      await ensureIdeaRegistry()
    }
  } catch (error) {
    logger.error('加载游戏目录设置失败:', error)
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
    logger.error('加载游戏目录文件树失败:', error)
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
      logger.error('加载子目录失败:', error)
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
      logger.error('加载游戏目录子目录失败:', error)
    }
  }
}

// 打开文件处理
async function handleOpenFile(node: FileNode, paneId?: string) {
  if (node.isDirectory) return
  
  selectedNode.value = node
  const targetPaneId = paneId || editorGroupRef.value?.activePaneId
  if (!targetPaneId) return
  
  const pane = editorGroupRef.value?.panes.find(p => p.id === targetPaneId)
  if (!pane) return
  
  // 检查文件是否已在该窗格中打开
  const existingIndex = pane.openFiles.findIndex(f => f.node.path === node.path)
  if (existingIndex !== -1) {
    pane.activeFileIndex = existingIndex
    return
  }
  
  // 读取文件内容
  try {
    const result = await readFileContent(node.path)
    if (result.success) {
      pane.openFiles.push({
        node,
        content: result.content,
        hasUnsavedChanges: false,
        cursorLine: 1,
        cursorColumn: 1
      })
      pane.activeFileIndex = pane.openFiles.length - 1
    } else {
      alert(`打开文件失败: ${result.message}`)
    }
  } catch (error) {
    logger.error('打开文件失败:', error)
    alert(`打开文件失败: ${error}`)
  }
}

// 切换文件（已移至EditorGroup）

// 关闭文件（已移至EditorGroup）

// 保存文件（已移至EditorGroup）

// 内容变化（已移至EditorPane）

// 光标位置变化（已移至EditorPane）
// 撤销/重做（已移至EditorPane）
// 滚动同步（已移至EditorPane）

// 右键菜单
function showFileTabContextMenu(event: MouseEvent, paneId: string, index: number) {
  contextMenuPaneId.value = paneId
  contextMenuFileIndex.value = index
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuType.value = 'pane'
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
  if (contextMenuType.value === 'pane') {
    const pane = editorGroupRef.value?.panes.find(p => p.id === contextMenuPaneId.value)
    if (!pane) return
    
    if (action === 'splitRight') {
      editorGroupRef.value?.splitPane(contextMenuPaneId.value, contextMenuFileIndex.value)
    } else if (action === 'closeAll') {
      if (pane.openFiles.some(f => f.hasUnsavedChanges)) {
        if (!confirm('有文件包含未保存的更改，是否关闭？')) return
      }
      pane.openFiles = []
      pane.activeFileIndex = -1
    } else if (action === 'closeOthers') {
      const keepFile = pane.openFiles[contextMenuFileIndex.value]
      if (!keepFile) return
      
      const others = pane.openFiles.filter((_, i) => i !== contextMenuFileIndex.value)
      if (others.some(f => f.hasUnsavedChanges)) {
        if (!confirm('其他文件包含未保存的更改，是否关闭？')) return
      }
      
      pane.openFiles = [keepFile]
      pane.activeFileIndex = 0
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
    logger.error('创建失败:', error)
    alert(`创建失败: ${error}`)
  }
}

// 返回主界面
function goBack() {
  const hasUnsaved = editorGroupRef.value?.panes.some(pane => 
    pane.openFiles.some((f: any) => f.hasUnsavedChanges)
  )
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

// 跳转到错误行（已移至EditorPane）
function jumpToError(error: {line: number, msg: string, type: string}) {
  // TODO: 实现跳转到错误行
  console.log('Jump to error:', error)
}

// 处理搜索
function handlePerformSearch() {
  const searchPath = searchScope.value === 'project' ? projectPath.value : gameDirectory.value
  if (searchPath) {
    performSearch(searchPath)
  }
}

async function handleJumpToSearchResult(result: any) {
  const targetPath = result?.file?.path
  if (!targetPath) return

  const name = (result?.file?.name as string) || (targetPath.split(/[\\\/ ]/).pop() || targetPath)
  const node: FileNode = { name, path: targetPath, isDirectory: false }
  
  await handleOpenFile(node)
  
  // TODO: 实现跳转到搜索结果
  searchPanelVisible.value = false
}

// 键盘快捷键
useKeyboardShortcuts({
  save: () => {
    // 保存当前活动窗格的文件
    // TODO: 实现保存快捷键
  },
  undo: () => {},
  redo: () => {},
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
        class="bg-hoi4-gray/80 border border-hoi4-border/60 overflow-y-auto flex-shrink-0 rounded-2xl shadow-lg my-2 ml-2"
        :style="{ width: leftPanelWidth + 'px' }"
        @contextmenu.prevent="showTreeContextMenu($event, null)"
      >
        <div class="p-2">
          <h3 class="text-hoi4-text font-bold mb-2 text-sm">文件目录</h3>
          <div
            v-if="tagLoading || tagStatus"
            class="text-hoi4-text-dim text-xs mb-2 px-2 py-1 bg-hoi4-border/30 rounded flex items-center justify-between"
          >
            <span>{{ tagLoading ? '国家标签加载中...' : tagStatus }}</span>
          <button
            class="ml-2 px-2 py-0.5 bg-hoi4-accent text-hoi4-text text-xs rounded hover:bg-hoi4-border transition-colors"
            @click="handleRefreshTags"
            :disabled="tagLoading"
          >
            刷新
          </button>
        </div>
        <div
          v-if="ideaLoading || ideaStatus"
          class="text-hoi4-text-dim text-xs mb-2 px-2 py-1 bg-hoi4-border/30 rounded flex items-center justify-between"
        >
          <span>{{ ideaLoading ? 'idea数据加载中...' : ideaStatus }}</span>
          <button
            class="ml-2 px-2 py-0.5 bg-hoi4-accent text-hoi4-text text-xs rounded hover:bg-hoi4-border transition-colors"
            @click="handleRefreshIdeas"
            :disabled="ideaLoading"
          >
            刷新
          </button>
        </div>
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

      <!-- 中间编辑区域 - EditorGroup -->
      <EditorGroup
        ref="editorGroupRef"
        :project-path="projectPath"
        :game-directory="gameDirectory"
        @context-menu="showFileTabContextMenu"
        @open-file="handleOpenFile"
      />

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
      :can-split="(editorGroupRef?.panes.length || 0) < 3"
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
