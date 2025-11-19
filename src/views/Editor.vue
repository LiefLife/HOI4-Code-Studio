<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { loadSettings, buildDirectoryTreeFast, createFile, createFolder, writeJsonFile, launchGame } from '../api/tauri'
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
import LeftPanelTabs from '../components/editor/LeftPanelTabs.vue'
import DependencyManager from '../components/editor/DependencyManager.vue'
import LoadingMonitor from '../components/editor/LoadingMonitor.vue'
import PackageDialog from '../components/editor/PackageDialog.vue'

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
import { useDependencyManager } from '../composables/useDependencyManager'

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
const isLaunchingGame = ref(false)

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

// 依赖项管理状态
const leftPanelActiveTab = ref<'project' | 'dependencies'>('project')
const activeDependencyId = ref<string | undefined>(undefined)
const dependencyManagerVisible = ref(false)
const dependencyFileTrees = ref<Map<string, FileNode[]>>(new Map())

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
const loadingMonitorVisible = ref(false)
const packageDialogVisible = ref(false)
const packageDialogRef = ref<InstanceType<typeof PackageDialog> | null>(null)

// 目录树自动刷新
const fileTreeAutoRefreshInterval = ref<number | null>(null)
const fileTreeAutoRefreshEnabled = ref(true)

const { isLoading: tagLoading, refresh: refreshTags, tags: tagList } = useTagRegistry()
const { isLoading: ideaLoading, refresh: refreshIdeas, ideas: ideaList } = useIdeaRegistry()
// 依赖项管理
const dependencyManager = useDependencyManager(projectPath.value)
const {
  dependencies,
  isLoading: isDependencyLoading,
  addDependency,
  removeDependency,
  toggleDependency,
  loadDependencies: loadDependenciesList
} = dependencyManager

async function handleRefreshTags() {
  await refreshTags()
}

async function handleRefreshIdeas() {
  await refreshIdeas()
}

// 依赖项管理函数
function handleSwitchToProject() {
  leftPanelActiveTab.value = 'project'
  activeDependencyId.value = undefined
}

function handleSwitchToDependency(id: string) {
  leftPanelActiveTab.value = 'dependencies'
  activeDependencyId.value = id
  loadDependencyFileTree(id)
}

function handleManageDependencies() {
  dependencyManagerVisible.value = true
}

async function handleAddDependency(path: string) {
  const result = await addDependency(path)
  if (result.success) {
    // 成功添加后刷新依赖项列表
    await loadDependenciesList()
  } else {
    alert(result.message)
  }
}

async function handleRemoveDependency(id: string) {
  const result = await removeDependency(id)
  if (result.success) {
    // 如果删除的是当前激活的依赖项，切换回项目
    if (activeDependencyId.value === id) {
      handleSwitchToProject()
    }
    dependencyFileTrees.value.delete(id)
  } else {
    alert(result.message)
  }
}

async function handleToggleDependency(id: string) {
  await toggleDependency(id)
}

async function loadDependencyFileTree(dependencyId: string) {
  const dependency = dependencies.value.find(dep => dep.id === dependencyId)
  if (!dependency) return
  
  // 如果已经加载过，直接返回
  if (dependencyFileTrees.value.has(dependencyId)) return
  
  try {
    const result = await buildDirectoryTreeFast(dependency.path, 3)
    if (result.success && result.tree) {
      dependencyFileTrees.value.set(
        dependencyId,
        result.tree.map(convertRustFileNode)
      )
    }
  } catch (error) {
    logger.error('加载依赖项文件树失败:', error)
  }
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

// 收集展开的文件夹路径
function collectExpandedPaths(nodes: FileNode[]): Set<string> {
  const expandedPaths = new Set<string>()
  
  function traverse(node: FileNode) {
    if (node.isDirectory && node.expanded) {
      expandedPaths.add(node.path)
      if (node.children) {
        node.children.forEach(traverse)
      }
    }
  }
  
  nodes.forEach(traverse)
  return expandedPaths
}

// 恢复展开状态
function restoreExpandedState(nodes: FileNode[], expandedPaths: Set<string>): void {
  function traverse(node: FileNode) {
    if (node.isDirectory && expandedPaths.has(node.path)) {
      node.expanded = true
      if (node.children) {
        node.children.forEach(traverse)
      }
    }
  }
  
  nodes.forEach(traverse)
}

// 加载文件树
async function loadFileTree() {
  if (!projectPath.value) return
  
  // 保存当前展开状态
  const expandedPaths = collectExpandedPaths(fileTree.value)
  
  try {
    const result = await buildDirectoryTreeFast(projectPath.value, 3)
    if (result.success && result.tree) {
      fileTree.value = result.tree.map(convertRustFileNode)
      // 恢复展开状态
      restoreExpandedState(fileTree.value, expandedPaths)
    }
    // 只设置根目录，不自动刷新 Tag/Idea（避免 2 秒刷新影响 30 秒定时器）
    const enabledDependencyPaths = dependencies.value.filter(dep => dep.enabled).map(dep => dep.path)
    setTagRoots(projectPath.value, gameDirectory.value, enabledDependencyPaths)
    setIdeaRoots(projectPath.value, gameDirectory.value, enabledDependencyPaths)
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
      const enabledDependencyPaths = dependencies.value.filter(dep => dep.enabled).map(dep => dep.path)
      setTagRoots(projectPath.value, gameDirectory.value, enabledDependencyPaths)
      await loadGameFileTree()
      await refreshTags()
      setIdeaRoots(projectPath.value, gameDirectory.value, enabledDependencyPaths)
      await ensureIdeaRegistry()
    } else {
      const enabledDependencyPaths = dependencies.value.filter(dep => dep.enabled).map(dep => dep.path)
      setTagRoots(projectPath.value, undefined, enabledDependencyPaths)
      await refreshTags()
      setIdeaRoots(projectPath.value, undefined, enabledDependencyPaths)
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

// 检查是否为图片文件
function isImageFile(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase()
  return ['png', 'jpg', 'jpeg', 'tga', 'bmp', 'gif', 'webp'].includes(ext || '')
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
  
  // 检查是否为图片文件
  const isImage = isImageFile(node.path)
  
  // 如果是图片，读取为 base64
  if (isImage) {
    try {
      // 使用自定义命令读取图片文件为 base64
      const { readImageAsBase64 } = await import('../api/tauri')
      const result = await readImageAsBase64(node.path)
      if (result.success && result.base64) {
        pane.openFiles.push({
          node,
          content: result.base64, // 存储 base64 数据
          hasUnsavedChanges: false,
          cursorLine: 1,
          cursorColumn: 1,
          isImage: true
        })
        pane.activeFileIndex = pane.openFiles.length - 1
      } else {
        alert(`打开图片失败: ${result.message || '无法读取图片'}`)
      }
    } catch (error) {
      logger.error('打开图片失败:', error)
      alert(`打开图片失败: ${error}`)
    }
    return
  }
  
  // 读取文本文件内容
  try {
    const result = await readFileContent(node.path)
    if (result.success) {
      pane.openFiles.push({
        node,
        content: result.content,
        hasUnsavedChanges: false,
        cursorLine: 1,
        cursorColumn: 1,
        isImage: false
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

// 打开依赖项管理对话框（从工具栏）
function openDependenciesFromToolbar() {
  dependencyManagerVisible.value = true
}

// 切换加载监控面板
function toggleLoadingMonitor() {
  loadingMonitorVisible.value = !loadingMonitorVisible.value
}

// 打开打包对话框
function openPackageDialog() {
  packageDialogVisible.value = true
}

// 处理打包
async function handlePackageProject(fileName: string) {
  if (!projectPath.value || !packageDialogRef.value) return
  
  // 开始打包
  packageDialogRef.value.startPacking()
  
  try {
    // 导入 API
    const { packProject } = await import('../api/tauri')
    
    // 执行打包
    const result = await packProject({
      projectPath: projectPath.value,
      outputName: fileName,
      excludeDependencies: true
    })
    
    // 显示结果
    packageDialogRef.value.finishPacking(result)
  } catch (error) {
    logger.error('打包失败:', error)
    packageDialogRef.value.finishPacking({
      success: false,
      message: `打包失败: ${error}`
    })
  }
}

// 切换右侧面板
function toggleRightPanel() {
  rightPanelExpanded.value = !rightPanelExpanded.value
}

// 启动游戏
async function handleLaunchGame() {
  if (isLaunchingGame.value) return
  
  isLaunchingGame.value = true
  
  try {
    const result = await launchGame()
    
    // 最少显示 500ms 的加载状态，让用户看到反馈
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (result.success) {
      console.log('游戏启动成功:', result.message)
    } else {
      alert(`启动游戏失败: ${result.message}`)
    }
  } catch (error) {
    logger.error('启动游戏失败:', error)
    alert(`启动游戏失败: ${error}`)
  } finally {
    isLaunchingGame.value = false
  }
}

// 跳转到错误行（已移至EditorPane）
function jumpToError(error: {line: number, msg: string, type: string}) {
  // TODO: 实现跳转到错误行
  console.log('Jump to error:', error)
}

// 处理错误变化
function handleErrorsChange(_paneId: string, errors: Array<{line: number, msg: string, type: string}>) {
  // 更新全局错误列表
  txtErrors.value = errors
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

// 开始目录树自动刷新
function startFileTreeAutoRefresh() {
  stopFileTreeAutoRefresh() // 先清除现有的定时器
  if (fileTreeAutoRefreshEnabled.value) {
    fileTreeAutoRefreshInterval.value = window.setInterval(() => {
      if (projectPath.value) {
        loadFileTree()
      }
    }, 2000) // 2秒刷新一次
  }
}

// 停止目录树自动刷新
function stopFileTreeAutoRefresh() {
  if (fileTreeAutoRefreshInterval.value !== null) {
    clearInterval(fileTreeAutoRefreshInterval.value)
    fileTreeAutoRefreshInterval.value = null
  }
}

// 生命周期
onMounted(async () => {
  projectPath.value = route.query.path as string || ''
  if (projectPath.value) {
    dependencyManager.setProjectPath(projectPath.value)
    loadProjectInfo()
    loadFileTree()
    loadGameDirectory()
    // 加载依赖项列表
    await loadDependenciesList()
    // 首次加载 Tags 和 Ideas
    await refreshTags()
    await refreshIdeas()
    // 启动目录树自动刷新
    startFileTreeAutoRefresh()
  } else {
    loading.value = false
  }
  document.addEventListener('click', hideContextMenu)
})

// 组件卸载时清理
onUnmounted(() => {
  stopFileTreeAutoRefresh()
  document.removeEventListener('click', hideContextMenu)
})
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-hoi4-dark overflow-hidden">
    <!-- 顶部工具栏 -->
    <EditorToolbar
      :project-name="projectInfo?.name"
      :right-panel-expanded="rightPanelExpanded"
      :is-launching-game="isLaunchingGame"
      :tag-count="tagList.length"
      :idea-count="ideaList.length"
      @go-back="goBack"
      @toggle-right-panel="toggleRightPanel"
      @launch-game="handleLaunchGame"
      @manage-dependencies="openDependenciesFromToolbar"
      @toggle-loading-monitor="toggleLoadingMonitor"
      @package-project="openPackageDialog"
    />

    <!-- 主内容区域 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧文件树面板 -->
      <div
        class="bg-hoi4-gray/80 border border-hoi4-border/60 flex-shrink-0 rounded-2xl shadow-lg my-2 ml-2 flex flex-col overflow-hidden"
        :style="{ width: leftPanelWidth + 'px' }"
      >
        <!-- 左侧面板标签栏 -->
        <LeftPanelTabs
          :active-tab="leftPanelActiveTab"
          :active-dependency-id="activeDependencyId"
          :dependencies="dependencies"
          @switch-to-project="handleSwitchToProject"
          @switch-to-dependency="handleSwitchToDependency"
          @manage-dependencies="handleManageDependencies"
        />
        
        <!-- 文件树内容 -->
        <div class="flex-1 overflow-y-auto p-2" @contextmenu.prevent="showTreeContextMenu($event, null)">
          <h3 class="text-hoi4-text font-bold mb-2 text-sm">
            {{ leftPanelActiveTab === 'project' ? '项目文件' : '依赖项文件' }}
          </h3>
          <!-- 项目文件树 -->
          <template v-if="leftPanelActiveTab === 'project'">
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
          </template>

          <!-- 依赖项文件树 -->
          <template v-else-if="leftPanelActiveTab === 'dependencies' && activeDependencyId">
            <div v-if="!dependencyFileTrees.has(activeDependencyId)" class="text-hoi4-text-dim text-sm p-2">
              加载中...
            </div>
            <div v-else-if="(dependencyFileTrees.get(activeDependencyId) || []).length === 0" class="text-hoi4-text-dim text-sm p-2">
              无文件
            </div>
            <div v-else>
              <FileTreeNode
                v-for="node in dependencyFileTrees.get(activeDependencyId)"
                :key="node.path"
                :node="node"
                :level="0"
                :selected-path="selectedNode?.path"
                @toggle="toggleFolder"
                @open-file="handleOpenFile"
                @contextmenu="showTreeContextMenu"
              />
            </div>
          </template>
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
        @errors-change="handleErrorsChange"
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

    <!-- 依赖项管理对话框 -->
    <DependencyManager
      :visible="dependencyManagerVisible"
      :dependencies="dependencies"
      :is-loading="isDependencyLoading"
      @close="dependencyManagerVisible = false"
      @add="handleAddDependency"
      @remove="handleRemoveDependency"
      @toggle="handleToggleDependency"
    />

    <!-- 加载监控面板 -->
    <LoadingMonitor
      :visible="loadingMonitorVisible"
      :tags="tagList"
      :ideas="ideaList"
      :is-loading-tags="tagLoading"
      :is-loading-ideas="ideaLoading"
      @close="loadingMonitorVisible = false"
      @refresh-tags="handleRefreshTags"
      @refresh-ideas="handleRefreshIdeas"
    />

    <!-- 打包对话框 -->
    <PackageDialog
      ref="packageDialogRef"
      :visible="packageDialogVisible"
      :project-name="projectInfo?.name"
      @close="packageDialogVisible = false"
      @confirm="handlePackageProject"
    />
  </div>
</template>

<style scoped>
.cursor-col-resize {
  cursor: col-resize;
}
</style>
