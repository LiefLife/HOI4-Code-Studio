<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { loadSettings, saveSettings, buildDirectoryTreeFast, createFile, createFolder, writeFileContent, writeJsonFile, launchGame, renamePath, deletePath, openFolder } from '../api/tauri'
import 'highlight.js/styles/github-dark.css'
import 'highlight.js/lib/languages/json'
import 'highlight.js/lib/languages/yaml'

// 组件导入
import EditorToolbar from '../components/editor/EditorToolbar.vue'
import EditorGroup from '../components/editor/EditorGroup.vue'
import RightPanel from '../components/editor/RightPanel.vue'
import ContextMenu from '../components/editor/ContextMenu.vue'
import CreateDialog from '../components/editor/CreateDialog.vue'
import ConfirmDialog from '../components/editor/ConfirmDialog.vue'
import FileTreeNode from '../components/FileTreeNode.vue'
import LeftPanelTabs from '../components/editor/LeftPanelTabs.vue'
import DependencyManager from '../components/editor/DependencyManager.vue'
import LoadingMonitor from '../components/editor/LoadingMonitor.vue'
import PackageDialog from '../components/editor/PackageDialog.vue'

// Composables 导入
import { type FileNode, type OpenFile } from '../composables/useFileManager'
import { useSearch } from '../composables/useSearch'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { usePanelResize } from '../composables/usePanelResize'

import ThemePanel from '../components/ThemePanel.vue'
import IconPanel from '../components/IconPanel.vue'
import { setTagRoots, useTagRegistry } from '../composables/useTagRegistry'
import { useTheme } from '../composables/useTheme'
import { useFileTreeIcons } from '../composables/useFileTreeIcons'
import { setIdeaRoots, useIdeaRegistry, ensureIdeaRegistry } from '../composables/useIdeaRegistry'
import { logger } from '../utils/logger'
import { readFileContent } from '../api/tauri'
import { useDependencyManager } from '../composables/useDependencyManager'
import { loadFontConfigFromSettings } from '../composables/useEditorFont'

// Highlight.js 语言定义已移至 useSyntaxHighlight.ts 中

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
const autoSave = ref(true)
const disableErrorHandling = ref(false)

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuType = ref<'file' | 'tree' | 'pane'>('file')
const contextMenuPaneId = ref('')
const contextMenuFileIndex = ref(-1)
const treeContextMenuNode = ref<FileNode | null>(null)
const lastContextMenuTime = ref(0)

// 创建对话框状态
const createDialogVisible = ref(false)
const createDialogType = ref<'file' | 'folder'>('file')
const createDialogMode = ref<'create' | 'rename'>('create')
const createDialogInitialValue = ref('')

// 确认对话框状态
const confirmDialogVisible = ref(false)
const confirmDialogTitle = ref('')
const confirmDialogMessage = ref('')
const confirmDialogType = ref<'warning' | 'danger' | 'info'>('warning')
let confirmDialogResolve: ((value: boolean) => void) | null = null

/**
 * 显示确认对话框
 */
function showConfirmDialog(message: string, title = '⚠️ 确认操作', type: 'warning' | 'danger' | 'info' = 'warning'): Promise<boolean> {
  return new Promise((resolve) => {
    confirmDialogMessage.value = message
    confirmDialogTitle.value = title
    confirmDialogType.value = type
    confirmDialogVisible.value = true
    confirmDialogResolve = resolve
  })
}

/**
 * 处理确认对话框确认
 */
function handleConfirmDialogConfirm() {
  confirmDialogVisible.value = false
  if (confirmDialogResolve) {
    confirmDialogResolve(true)
    confirmDialogResolve = null
  }
}

async function handleJumpToFocusFromPreview(sourcePaneId: string, sourceFilePath: string, _focusId: string, line: number) {
  if (!editorGroupRef.value) return

  const panes = editorGroupRef.value.panes
  let targetPane = panes.find(p => {
    const active = p.openFiles[p.activeFileIndex]
    return !!active && active.isFocusTree !== true
  })

  if (!targetPane) {
    targetPane = panes.find(p => p.id === sourcePaneId)
  }
  if (!targetPane) return

  editorGroupRef.value.setActivePane(targetPane.id)

  const node: FileNode = {
    name: basename(sourceFilePath),
    path: sourceFilePath,
    isDirectory: false
  }

  await handleOpenFile(node, targetPane.id)

  setTimeout(() => {
    const paneRef = (editorGroupRef.value as any)?.paneRefs?.get?.(targetPane!.id)
    if (paneRef?.jumpToLine) {
      paneRef.jumpToLine(line)
    }
  }, 80)
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function handlePerformReplace(replaceText: string) {
  if (!searchQuery.value.trim()) return
  if (searchResults.value.length === 0) return

  const confirmed = await showConfirmDialog(
    `确定要将搜索到的内容替换为 "${replaceText}" 吗？该操作将直接修改文件内容，且不可恢复。`,
    '✏️ 替换确认',
    'warning'
  )
  if (!confirmed) return

  const flags = searchCaseSensitive.value ? 'g' : 'gi'
  let pattern: RegExp
  try {
    pattern = searchRegex.value
      ? new RegExp(searchQuery.value, flags)
      : new RegExp(escapeRegExp(searchQuery.value), flags)
  } catch (error) {
    alert(`替换失败：无效的正则表达式: ${error}`)
    return
  }

  const filePaths = Array.from(new Set(searchResults.value.map(r => r.file.path)))
  let totalReplacements = 0
  const updatedContents = new Map<string, string>()

  function syncOpenedFilesContent() {
    if (!editorGroupRef.value) return

    for (const pane of editorGroupRef.value.panes) {
      for (const openFile of pane.openFiles) {
        if (!openFile?.node?.path) continue
        if (openFile.hasUnsavedChanges) continue
        if (openFile.isImage) continue

        const updated = updatedContents.get(openFile.node.path)
        if (updated !== undefined) {
          openFile.content = updated
        }
      }
    }
  }

  try {
    for (const filePath of filePaths) {
      const readResult = await readFileContent(filePath)
      if (!readResult.success) {
        alert(`读取文件失败: ${filePath}\n${readResult.message}`)
        continue
      }

      const original = readResult.content ?? ''
      const matches = original.match(pattern)
      const matchCount = matches ? matches.length : 0
      if (matchCount === 0) continue

      const updated = original.replace(pattern, replaceText)
      const writeResult = await writeFileContent(filePath, updated)
      if (!writeResult.success) {
        alert(`写入文件失败: ${filePath}\n${writeResult.message}`)
        continue
      }

      updatedContents.set(filePath, updated)
      totalReplacements += matchCount
    }
  } catch (error) {
    logger.error('替换失败:', error)
    alert(`替换失败: ${error}`)
    return
  }

  syncOpenedFilesContent()

  await handlePerformSearch()
  alert(`替换完成：共替换 ${totalReplacements} 处。`)
}

/**
 * 处理确认对话框取消
 */
function handleConfirmDialogCancel() {
  confirmDialogVisible.value = false
  if (confirmDialogResolve) {
    confirmDialogResolve(false)
    confirmDialogResolve = null
  }
}

// 依赖项管理状态
const leftPanelActiveTab = ref<'project' | 'dependencies'>('project')
const activeDependencyId = ref<string | undefined>(undefined)
const dependencyManagerVisible = ref(false)
const dependencyFileTrees = ref<Map<string, FileNode[]>>(new Map())

// Refs
const editorGroupRef = ref<InstanceType<typeof EditorGroup> | null>(null)

// 计算可移动到的窗格列表（排除当前窗格）
const availablePanesForMove = computed(() => {
  if (!editorGroupRef.value || contextMenuType.value !== 'pane') return []
  
  return editorGroupRef.value.panes
    .filter(p => p.id !== contextMenuPaneId.value)
    .map((p) => ({
      id: p.id,
      name: `窗格 ${editorGroupRef.value!.panes.findIndex(pane => pane.id === p.id) + 1}`
    }))
})

const {
  leftPanelWidth,
  rightPanelWidth,
  startResizeLeft,
  startResizeRight
} = usePanelResize()

// 搜索功能
const {
  searchQuery,
  searchResults,
  isSearching,
  searchCaseSensitive,
  searchRegex,
  searchScope,
  includeAllFiles,
  performSearch
} = useSearch()


const loadingMonitorVisible = ref(false)
const packageDialogVisible = ref(false)
const packageDialogRef = ref<InstanceType<typeof PackageDialog> | null>(null)

// 目录树自动刷新
const fileTreeAutoRefreshInterval = ref<number | null>(null)
const fileTreeAutoRefreshEnabled = ref(true)

const { isLoading: tagLoading, refresh: refreshTags, tags: tagList } = useTagRegistry()
const { isLoading: ideaLoading, refresh: refreshIdeas, ideas: ideaList } = useIdeaRegistry()

// 主题系统
const { toggleThemePanel, loadThemeFromSettings } = useTheme()

// 图标系统
const { toggleIconPanel, loadIconSetFromSettings } = useFileTreeIcons()
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

const enabledDependencyRoots = computed(() =>
  (dependencies.value || []).filter(d => d.enabled).map(d => d.path)
)

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
    const shouldInitialize = await showConfirmDialog(
      '检测到此文件夹不是HOI4 Code Studio项目，是否要将其初始化为项目？',
      '📁 初始化项目',
      'info'
    )
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
      autoSave.value = ('autoSave' in result.data && result.data.autoSave === false) ? false : true
      disableErrorHandling.value = ('disableErrorHandling' in result.data && result.data.disableErrorHandling === true) ? true : false
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
  return ['png', 'jpg', 'jpeg', 'tga', 'bmp', 'gif', 'webp' ,'dds'].includes(ext || '')
}

function basename(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() || p
}

// 打开文件处理
async function handleOpenFile(node: FileNode, paneId?: string, jumpInfo?: any) {
  if (node.isDirectory) return
  
  selectedNode.value = node
  const targetPaneId = paneId || editorGroupRef.value?.activePaneId
  if (!targetPaneId) return
  
  const pane = editorGroupRef.value?.panes.find(p => p.id === targetPaneId)
  if (!pane) return
  
  // 检查文件是否已在该窗格中打开
  const existingIndex = pane.openFiles.findIndex(f => f.node.path === node.path && !f.isPreview)
  if (existingIndex !== -1) {
    pane.activeFileIndex = existingIndex
    
    // 如果有跳转信息且文件已存在，直接执行跳转，避免后续文件切换事件重置光标
    if (jumpInfo && editorGroupRef.value) {
      console.log('[Editor] File already open, jumping directly to avoid cursor reset')
      setTimeout(() => {
        editorGroupRef.value!.jumpToSearchResult(jumpInfo)
      }, 50) // 短暂延迟确保文件切换完成
    }
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
  // 如果是背景点击（node=null），且距离上次有效点击时间很近，则忽略（视为冒泡）
  const now = Date.now()
  if (node === null && now - lastContextMenuTime.value < 100) {
    return
  }
  
  if (node) {
    lastContextMenuTime.value = now
    treeContextMenuNode.value = node
    selectedNode.value = node // 强制高亮
  } else {
    treeContextMenuNode.value = null
  }
  
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuType.value = 'tree'
  contextMenuVisible.value = true
}

function hideContextMenu() {
  contextMenuVisible.value = false
}

function isPathUnder(target: string, base: string): boolean {
  const normalize = (p: string) => p.replace(/\\/g, '/').toLowerCase().replace(/\/+$/g, '')
  const t = normalize(target)
  const b = normalize(base)
  return t === b || t.startsWith(b + '/')
}

async function closeOpenedFilesUnderPath(basePath: string) {
  if (!editorGroupRef.value) return

  for (const pane of editorGroupRef.value.panes) {
    const indicesToClose: number[] = []
    for (let i = 0; i < pane.openFiles.length; i++) {
      const file = pane.openFiles[i]
      if (file?.node?.path && isPathUnder(file.node.path, basePath)) {
        indicesToClose.push(i)
      }
    }

    for (let i = indicesToClose.length - 1; i >= 0; i--) {
      pane.openFiles.splice(indicesToClose[i], 1)
    }

    if (pane.openFiles.length === 0) {
      pane.activeFileIndex = -1
    } else if (pane.activeFileIndex >= pane.openFiles.length) {
      pane.activeFileIndex = pane.openFiles.length - 1
    }
  }
}

async function handleContextMenuAction(action: string, payload?: any) {
  if (contextMenuType.value === 'pane') {
    const pane = editorGroupRef.value?.panes.find(p => p.id === contextMenuPaneId.value)
    if (!pane) return
    
    if (action === 'splitRight') {
      editorGroupRef.value?.splitPane(contextMenuPaneId.value, contextMenuFileIndex.value)
    } else if (action === 'moveToPane') {
      // 移动文件到其他窗格
      const targetPaneId = payload as string
      const targetPane = editorGroupRef.value?.panes.find(p => p.id === targetPaneId)
      if (!targetPane || !pane || contextMenuFileIndex.value < 0) return
      
      const file = pane.openFiles[contextMenuFileIndex.value]
      if (!file) return
      
      // 检查目标窗格是否已有该文件
      const existingIndex = targetPane.openFiles.findIndex(f => f.node.path === file.node.path)
      if (existingIndex !== -1) {
        // 如果已存在，直接激活
        targetPane.activeFileIndex = existingIndex
        editorGroupRef.value?.setActivePane(targetPaneId)
      } else {
        // 复制文件到目标窗格
        targetPane.openFiles.push({ ...file })
        targetPane.activeFileIndex = targetPane.openFiles.length - 1
        editorGroupRef.value?.setActivePane(targetPaneId)
      }
      
      // 从源窗格删除文件
      pane.openFiles.splice(contextMenuFileIndex.value, 1)
      if (pane.openFiles.length === 0) {
        pane.activeFileIndex = -1
      } else if (contextMenuFileIndex.value === pane.activeFileIndex) {
        pane.activeFileIndex = Math.min(contextMenuFileIndex.value, pane.openFiles.length - 1)
      } else if (contextMenuFileIndex.value < pane.activeFileIndex) {
        pane.activeFileIndex--
      }
    } else if (action === 'closeAll') {
      if (pane.openFiles.some(f => f.hasUnsavedChanges)) {
        const confirmed = await showConfirmDialog(
          '有文件包含未保存的更改，是否关闭？',
          '⚠️ 未保存的更改',
          'warning'
        )
        if (!confirmed) return
      }
      pane.openFiles = []
      pane.activeFileIndex = -1
      
      // 如果窗格为空且有多个窗格，自动删除该窗格（与逐个删除文件行为保持一致）
      if (editorGroupRef.value && editorGroupRef.value.panes.length > 1) {
        // 延迟一下执行，确保 UI 更新
        setTimeout(() => {
          editorGroupRef.value?.closePane(contextMenuPaneId.value)
        }, 100)
      }
    } else if (action === 'closeOthers') {
      const keepFile = pane.openFiles[contextMenuFileIndex.value]
      if (!keepFile) return
      
      const others = pane.openFiles.filter((_, i) => i !== contextMenuFileIndex.value)
      if (others.some(f => f.hasUnsavedChanges)) {
        const confirmed = await showConfirmDialog(
          '其他文件包含未保存的更改，是否关闭？',
          '⚠️ 未保存的更改',
          'warning'
        )
        if (!confirmed) return
      }
      
      pane.openFiles = [keepFile]
      pane.activeFileIndex = 0
    }
  } else if (contextMenuType.value === 'tree') {
    if (action === 'createFile') {
      createDialogType.value = 'file'
      createDialogMode.value = 'create'
      createDialogInitialValue.value = ''
      createDialogVisible.value = true
    } else if (action === 'createFolder') {
      createDialogType.value = 'folder'
      createDialogMode.value = 'create'
      createDialogInitialValue.value = ''
      createDialogVisible.value = true
    } else if (action === 'rename') {
      if (!treeContextMenuNode.value) return
      createDialogType.value = treeContextMenuNode.value.isDirectory ? 'folder' : 'file'
      createDialogMode.value = 'rename'
      createDialogInitialValue.value = treeContextMenuNode.value.name
      createDialogVisible.value = true
    } else if (action === 'delete') {
      if (!treeContextMenuNode.value) return

      const node = treeContextMenuNode.value
      const confirmed = await showConfirmDialog(
        node.isDirectory
          ? `确定要删除文件夹 "${node.name}" 吗？该操作将递归删除其下所有内容，且不可恢复。`
          : `确定要删除文件 "${node.name}" 吗？该操作不可恢复。`,
        '🗑️ 删除确认',
        'danger'
      )
      if (!confirmed) return

      try {
        const result = await deletePath(node.path)
        if (!result.success) {
          alert(result.message || '删除失败')
          return
        }

        await closeOpenedFilesUnderPath(node.path)

        if (leftPanelActiveTab.value === 'dependencies' && activeDependencyId.value) {
          dependencyFileTrees.value.delete(activeDependencyId.value)
          await loadDependencyFileTree(activeDependencyId.value)
        } else {
          await loadFileTree()
        }
      } catch (error) {
        logger.error('删除失败:', error)
        alert(`删除失败: ${error}`)
      }
    } else if (action === 'copyPath') {
      if (treeContextMenuNode.value) {
        navigator.clipboard.writeText(treeContextMenuNode.value.path).catch(err => {
          console.error('无法复制路径: ', err)
        })
      } else if (projectPath.value) {
        // 如果是在根目录空白处点击，复制项目路径
        navigator.clipboard.writeText(projectPath.value).catch(err => {
          console.error('无法复制路径: ', err)
        })
      }
    } else if (action === 'showInExplorer') {
      const targetPath = treeContextMenuNode.value ? treeContextMenuNode.value.path : projectPath.value
      if (targetPath) {
        // 如果是文件，打开父目录；如果是目录，直接打开
        // 由于 openFolder 目前只负责打开，对于文件，我们尝试获取其父目录
        if (treeContextMenuNode.value && !treeContextMenuNode.value.isDirectory) {
          const lastSepIndex = Math.max(targetPath.lastIndexOf('/'), targetPath.lastIndexOf('\\'))
          if (lastSepIndex > 0) {
             openFolder(targetPath.substring(0, lastSepIndex))
          } else {
             openFolder(targetPath)
          }
        } else {
          openFolder(targetPath)
        }
      }
    }
  }
  hideContextMenu()
}

// 创建文件/文件夹
async function handleCreateConfirm(name: string, useBom: boolean = false) {
  if (createDialogMode.value === 'rename') {
    if (!treeContextMenuNode.value) return
    
    const oldPath = treeContextMenuNode.value.path
    // 获取父目录
    const lastSepIndex = Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\'))
    const parentPath = lastSepIndex > 0 ? oldPath.substring(0, lastSepIndex) : oldPath
    const newPath = `${parentPath}\\${name}` // 假设是 Windows 分隔符，或者应该检测系统
    
    try {
      const result = await renamePath(oldPath, newPath)
      if (result.success) {
        await loadFileTree()
        createDialogVisible.value = false
      } else {
        alert(result.message || '重命名失败')
      }
    } catch (error) {
      logger.error('重命名失败:', error)
      alert(`重命名失败: ${error}`)
    }
    return
  }

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
      result = await createFile(targetPath, '', useBom)
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
async function goBack() {
  const hasUnsaved = editorGroupRef.value?.panes.some(pane => 
    pane.openFiles.some((f: any) => f.hasUnsavedChanges)
  )
  if (hasUnsaved) {
    const confirmed = await showConfirmDialog(
      '有文件包含未保存的更改，是否放弃所有更改？',
      '⚠️ 未保存的更改',
      'warning'
    )
    if (!confirmed) {
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

// 处理预览事件
async function handlePreviewEvent(paneId: string) {
  if (!editorGroupRef.value) return
  
  const sourcePane = editorGroupRef.value.panes.find(p => p.id === paneId)
  if (!sourcePane || sourcePane.activeFileIndex < 0) return
  
  const currentFile = sourcePane.openFiles[sourcePane.activeFileIndex]
  if (!currentFile) return
  
  let targetPane = null
  
  // 如果已有两个或更多窗格，查找包含预览的窗格
  if (editorGroupRef.value.panes.length >= 2) {
    targetPane = editorGroupRef.value.panes.find(p => 
      p.openFiles.some(f => f.isEventGraph || f.isFocusTree)
    )
  }
  
  // 如果找到了包含预览的窗格，直接在该窗格中添加
  if (targetPane) {
    const previewFile: OpenFile = {
      node: {
        ...currentFile.node,
        name: `📊 ${currentFile.node.name} - 事件关系图`
      },
      content: currentFile.content,
      hasUnsavedChanges: false,
      cursorLine: 1,
      cursorColumn: 1,
      isEventGraph: true,
      isPreview: true,
      sourceFilePath: currentFile.node.path
    }
    targetPane.openFiles.push(previewFile)
    targetPane.activeFileIndex = targetPane.openFiles.length - 1
    editorGroupRef.value.setActivePane(targetPane.id)
    return
  }
  
  // 否则，分割窗格创建新预览
  const splitSuccess = editorGroupRef.value.splitPane(paneId)
  if (!splitSuccess) return
  
  const newPane = editorGroupRef.value.panes[editorGroupRef.value.panes.length - 1]
  if (!newPane) return
  
  const previewFile: OpenFile = {
    node: {
      ...currentFile.node,
      name: `📊 ${currentFile.node.name} - 事件关系图`
    },
    content: currentFile.content,
    hasUnsavedChanges: false,
    cursorLine: 1,
    cursorColumn: 1,
    isEventGraph: true,
    isPreview: true,
    sourceFilePath: currentFile.node.path
  }
  newPane.openFiles.push(previewFile)
  newPane.activeFileIndex = 0
}

// 处理预览国策树
async function handlePreviewFocus(paneId: string) {
  if (!editorGroupRef.value) return
  
  const sourcePane = editorGroupRef.value.panes.find(p => p.id === paneId)
  if (!sourcePane || sourcePane.activeFileIndex < 0) return
  
  const currentFile = sourcePane.openFiles[sourcePane.activeFileIndex]
  if (!currentFile) return
  
  let targetPane = null
  
  // 如果已有两个或更多窗格，查找包含预览的窗格
  if (editorGroupRef.value.panes.length >= 2) {
    targetPane = editorGroupRef.value.panes.find(p => 
      p.openFiles.some(f => f.isEventGraph || f.isFocusTree)
    )
  }
  
  // 如果找到了包含预览的窗格，直接在该窗格中添加
  if (targetPane) {
    const previewFile: OpenFile = {
      node: {
        ...currentFile.node,
        name: `🌳 ${currentFile.node.name} - 国策树`
      },
      content: currentFile.content,
      hasUnsavedChanges: false,
      cursorLine: 1,
      cursorColumn: 1,
      isFocusTree: true,
      isPreview: true,
      sourceFilePath: currentFile.node.path
    }
    targetPane.openFiles.push(previewFile)
    targetPane.activeFileIndex = targetPane.openFiles.length - 1
    editorGroupRef.value.setActivePane(targetPane.id)
    return
  }
  
  // 否则，分割窗格创建新预览
  const splitSuccess = editorGroupRef.value.splitPane(paneId)
  if (!splitSuccess) return
  
  const newPane = editorGroupRef.value.panes[editorGroupRef.value.panes.length - 1]
  if (!newPane) return
  
  const previewFile: OpenFile = {
    node: {
      ...currentFile.node,
      name: `🌳 ${currentFile.node.name} - 国策树`
    },
    content: currentFile.content,
    hasUnsavedChanges: false,
    cursorLine: 1,
    cursorColumn: 1,
    isFocusTree: true,
    isPreview: true,
    sourceFilePath: currentFile.node.path
  }
  newPane.openFiles.push(previewFile)
  newPane.activeFileIndex = 0
}

// 处理编辑器右键菜单操作
async function handleEditorContextMenuAction(action: string, paneId: string) {
  if (!editorGroupRef.value) return
  
  const pane = editorGroupRef.value.panes.find(p => p.id === paneId)
  if (!pane) return
  
  const paneRef = (editorGroupRef.value as any).paneRefs?.get?.(paneId)
  if (!paneRef) return
  
  const editorMethods = paneRef.getEditorMethods?.()
  if (!editorMethods) return
  
  switch (action) {
    case 'selectAll':
      // 全选文本
      if (editorMethods.selectAll) {
        editorMethods.selectAll()
      }
      break
      
    case 'copy':
      // 复制选中文本到剪贴板
      try {
        const selectedText = editorMethods.getSelectedText?.() || ''
        if (selectedText) {
          await navigator.clipboard.writeText(selectedText)
        }
      } catch (error) {
        console.error('复制失败:', error)
      }
      break
      
    case 'cut':
      // 剪切选中文本
      try {
        const selectedText = editorMethods.cutSelection?.() || ''
        if (selectedText) {
          await navigator.clipboard.writeText(selectedText)
        }
      } catch (error) {
        console.error('剪切失败:', error)
      }
      break
      
    case 'paste':
      // 粘贴剪贴板内容
      try {
        const clipboardText = await navigator.clipboard.readText()
        if (clipboardText) {
          editorMethods.insertText?.(clipboardText)
        }
      } catch (error) {
        console.error('粘贴失败:', error)
      }
      break
      
    case 'insertIdeaTemplate':
      // 插入 Idea 模板
      handleInsertIdeaTemplate(pane, editorMethods)
      break
      
    case 'insertTagTemplate':
      // 插入 Tag 初始态定义模板
      handleInsertTagTemplate(pane, editorMethods)
      break
      
    case 'insertBopTemplate':
      // 插入权力平衡模板
      handleInsertBopTemplate(pane, editorMethods)
      break
  }
}

// 处理插入 Idea 模板
function handleInsertIdeaTemplate(pane: any, editorMethods: any) {
  // 检查当前文件路径
  if (pane.activeFileIndex === -1) return
  
  const currentFile = pane.openFiles[pane.activeFileIndex]
  if (!currentFile) return
  
  const filePath = currentFile.node.path
  
  // 检查文件是否在 common/ideas/ 目录下
  const normalizedPath = filePath.replace(/\\/g, '/')
  if (!normalizedPath.includes('common/ideas/')) {
    alert('错误：只能在 common/ideas/ 目录下的文件中插入 Idea 模板')
    return
  }
  
  // 构建 Idea 模板
  const template = `ideas = {
\tcountry = {
\t\tidea_name = {
\t\t\tpicture = your_image
\t\t\tallowed = {
\t\t\t\talways = yes
\t\t\t}
\t\t\tallowed_civil_war = {
\t\t\t\talways = yes
\t\t\t}
\t\t\tmodifier = {
\t\t\t}
\t\t}
\t}
}`
  
  // 在光标位置插入模板
  editorMethods.insertText?.(template)
}

// 处理插入 Tag 初始态定义模板
function handleInsertTagTemplate(pane: any, editorMethods: any) {
  // 检查当前文件路径
  if (pane.activeFileIndex === -1) return
  
  const currentFile = pane.openFiles[pane.activeFileIndex]
  if (!currentFile) return
  
  const filePath = currentFile.node.path
  
  // 检查文件是否在 history/countries/ 目录下
  const normalizedPath = filePath.replace(/\\/g, '/')
  if (!normalizedPath.includes('history/countries/')) {
    alert('错误：只能在 history/countries/ 目录下的文件中插入 Tag 初始态定义模板')
    return
  }
  
  // 构建 Tag 初始态定义模板
  const template = `capital = your_tag_owner_provinces

set_research_slots = your_research_slots

set_oob = army_file

set_stability = your_stability_value
set_war_support = your_war_support_value

set_politics = {
\truling_party = your_ruling_party
\telections_allowed = no
}

set_popularities = {
\tdemocratic = democratic_value
\tcommunism = communism_value
\tneutrality = neutrality_value
\tfascism = fascism_value
}

add_ideas = {
\tidea1
\tidea2\t
}

recruit_character = char1
recruit_character = char2

set_technology = {
}`
  
  // 在光标位置插入模板
  editorMethods.insertText?.(template)
}

// 处理插入权力平衡模板
function handleInsertBopTemplate(pane: any, editorMethods: any) {
  // 检查当前文件路径
  if (pane.activeFileIndex === -1) return
  
  const currentFile = pane.openFiles[pane.activeFileIndex]
  if (!currentFile) return
  
  const filePath = currentFile.node.path
  
  // 检查文件是否在 common/bop/ 目录下
  const normalizedPath = filePath.replace(/\\/g, '/')
  if (!normalizedPath.includes('common/bop/')) {
    alert('错误：只能在 common/bop/ 目录下的文件中插入权力平衡模板')
    return
  }
  
  // 构建权力平衡模板
  const template = `bop_name = {

\tinitial_value = #默认值

\tleft_side = #左侧名称
\tright_side = #右侧名称

\tdecision_category = #决议组
\t
\t# 中间范围
\trange = {

\t\tid = 

\t\tmin = 

\t\tmax = 

\t\tmodifier = {
\t\t}
\t}
\t
\t#右侧
\tside = {

\t\tid = #右侧名称

\t\ticon = 
\t\t
\t\t# 阈值1
\t\trange = {

\t\t\tid = 

\t\t\tmin = 

\t\t\tmax = 

\t\t\tmodifier = {
\t\t\t}
\t\t}
\t\t
\t\t# 阈值2
\t\trange = {
\t\t\t...
\t\t}
\t}
\t
\t#左侧同理
}`
  
  // 在光标位置插入模板
  editorMethods.insertText?.(template)
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

// 右侧面板活动标签页
const rightPanelActiveTab = ref<'info' | 'game' | 'errors' | 'search' | 'ai'>('info')

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

// 跳转到错误行
function jumpToError(error: {line: number, msg: string, type: string}) {
  console.log('[Editor] jumpToError called with:', error)
  
  if (!editorGroupRef.value) {
    console.warn('[Editor] Editor group ref not available')
    return
  }
  
  console.log('[Editor] Calling jumpToErrorLine with line:', error.line)
  // 调用 EditorGroup 的 jumpToErrorLine 方法
  editorGroupRef.value.jumpToErrorLine(error.line)
}

// 处理错误变化
function handleErrorsChange(_paneId: string, errors: Array<{line: number, msg: string, type: string}>) {
  // 更新全局错误列表
  txtErrors.value = errors
}

// 处理内容变化 - 同步预览文件内容
function handleContentChange(paneId: string, content: string) {
  if (!editorGroupRef.value) return
  
  // 查找当前活动的窗格
  const pane = editorGroupRef.value.panes.find(p => p.id === paneId)
  if (!pane || pane.activeFileIndex === -1) return
  
  const currentFile = pane.openFiles[pane.activeFileIndex]
  if (!currentFile) return
  
  // 获取当前文件路径
  const currentFilePath = currentFile.node.path
  
  // 同步更新所有预览文件的内容
  let previewFilesUpdated = 0
  editorGroupRef.value.panes.forEach(targetPane => {
    targetPane.openFiles.forEach(file => {
      // 检查是否是预览文件，且源文件路径匹配
      // 预览文件的 sourceFilePath 应该指向原始文件
      if (file.isPreview && file.sourceFilePath === currentFilePath) {
        // 更新预览文件的内容
        file.content = content
        previewFilesUpdated++
        console.log(`[Editor] 同步更新预览文件内容: ${file.node.name} (源文件: ${currentFilePath})`)
      }
    })
  })
  console.log(`[Editor] 内容变化处理完成，更新了 ${previewFilesUpdated} 个预览文件`)
}

// 处理搜索
async function handlePerformSearch() {
  if (searchScope.value === 'dependencies') {
    // 搜索所有启用的依赖项
    const enabledDependencies = dependencies.value.filter(dep => dep.enabled)
    if (enabledDependencies.length === 0) {
      searchResults.value = []
      return
    }
    
    // 清空现有结果
    searchResults.value = []
    isSearching.value = true
    
    try {
      // 遍历所有依赖项，执行搜索
      for (let i = 0; i < enabledDependencies.length; i++) {
        const dep = enabledDependencies[i]
        // 第一个依赖项不追加（清空现有结果），后续依赖项追加
        await performSearch(dep.path, i > 0)
      }
    } finally {
      isSearching.value = false
    }
  } else {
    // 搜索项目或游戏目录
    const searchPath = searchScope.value === 'project' ? projectPath.value : gameDirectory.value
    if (searchPath) {
      performSearch(searchPath)
    }
  }
}

async function handleJumpToSearchResult(result: any) {
  const targetPath = result?.file?.path
  if (!targetPath) return

  const name = (result?.file?.name as string) || (targetPath.split(/[\\\/ ]/).pop() || targetPath)
  const node: FileNode = { name, path: targetPath, isDirectory: false }
  
  // 传递跳转信息到handleOpenFile，避免文件切换时重置光标位置
  await handleOpenFile(node, undefined, result)
  
  // 增加等待时间并使用更可靠的跳转策略
  setTimeout(() => {
    // 跳转到搜索结果行，使用更精确的跳转
    if (editorGroupRef.value && result?.line) {
      console.log('[Editor] Jumping to search result:', { 
        line: result.line, 
        matchStart: result.matchStart, 
        matchEnd: result.matchEnd,
        content: result.content?.slice(0, 50) 
      })
      
      // 尝试使用增强的跳转方法（支持精确匹配位置）
      editorGroupRef.value.jumpToSearchResult(result)
      
      // 再次延迟确认跳转，防止被后续事件覆盖
      setTimeout(() => {
        if (editorGroupRef.value && result?.line) {
          console.log('[Editor] Re-confirming search result jump to prevent override')
          editorGroupRef.value.jumpToSearchResult(result)
        }
      }, 100)
    } else {
      console.warn('[Editor] Cannot jump to line - missing editorGroup or line number', { 
        hasEditorGroup: !!editorGroupRef.value, 
        line: result?.line 
      })
    }
  }, 1000) 
  

}

// 跳转到下一个错误
function handleNextError() {
  if (!editorGroupRef.value) return
  const activePaneId = editorGroupRef.value.activePaneId
  const activePane = editorGroupRef.value.panes.find(p => p.id === activePaneId)
  if (!activePane || activePane.activeFileIndex === -1) return
  
  const activeFile = activePane.openFiles[activePane.activeFileIndex]
  const currentLine = activeFile.cursorLine
  
  const sortedErrors = [...txtErrors.value].sort((a, b) => a.line - b.line)
  if (sortedErrors.length === 0) return
  
  const nextError = sortedErrors.find(e => e.line > currentLine)
  
  if (nextError) {
    jumpToError(nextError)
  } else {
    // 循环到第一个
    jumpToError(sortedErrors[0])
  }
}

// 跳转到上一个错误
function handlePreviousError() {
  if (!editorGroupRef.value) return
  const activePaneId = editorGroupRef.value.activePaneId
  const activePane = editorGroupRef.value.panes.find(p => p.id === activePaneId)
  if (!activePane || activePane.activeFileIndex === -1) return
  
  const activeFile = activePane.openFiles[activePane.activeFileIndex]
  const currentLine = activeFile.cursorLine
  
  const sortedErrors = [...txtErrors.value].sort((a, b) => a.line - b.line)
  if (sortedErrors.length === 0) return
  
  // 查找小于当前行的最大行号错误
  // reverse() 后 find 第一个 < currentLine 的
  const prevError = [...sortedErrors].reverse().find(e => e.line < currentLine)
  
  if (prevError) {
    jumpToError(prevError)
  } else {
    // 循环到最后一个
    jumpToError(sortedErrors[sortedErrors.length - 1])
  }
}

// 切换自动保存
async function toggleAutoSave() {
  autoSave.value = !autoSave.value
}

// 监听自动保存开关变化，立即保存设置
watch(autoSave, async (newValue) => {
  try {
    const result = await loadSettings()
    if (result.success && result.data) {
      const settings = {
        ...result.data,
        autoSave: newValue
      }
      await saveSettings(settings)
    }
  } catch (error) {
    logger.error('保存自动保存设置失败:', error)
  }
})

// 键盘快捷键
useKeyboardShortcuts({
  save: () => {
    // 保存当前活动窗格的文件
    if (editorGroupRef.value) {
      editorGroupRef.value.saveCurrentFile()
    }
  },
  undo: () => {},
  redo: () => {},
  search: () => {
    // 打开右侧边栏并切换到搜索标签页
    rightPanelExpanded.value = true
    rightPanelActiveTab.value = 'search'
  },
  nextError: handleNextError,
  previousError: handlePreviousError,
  toggleTheme: toggleThemePanel,
  toggleIconPanel: toggleIconPanel
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
  // 加载主题设置
  await loadThemeFromSettings()
  
  // 加载图标设置
  await loadIconSetFromSettings()
  
  // 加载设置
  const settingsResult = await loadSettings()
  if (settingsResult.success && settingsResult.data) {
    const data = settingsResult.data as any
    autoSave.value = data.autoSave !== false
    disableErrorHandling.value = data.disableErrorHandling || false
    // 加载编辑器字体设置
    loadFontConfigFromSettings(data)
  }
  
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
      :auto-save="autoSave"
      @go-back="goBack"
      @toggle-right-panel="toggleRightPanel"
      @launch-game="handleLaunchGame"
      @manage-dependencies="openDependenciesFromToolbar"
      @toggle-loading-monitor="toggleLoadingMonitor"
      @package-project="openPackageDialog"
      @toggle-auto-save="toggleAutoSave"
    />

    <!-- 主内容区域 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧文件树面板 -->
      <div
        class="ui-island flex-shrink-0 rounded-xl my-2 ml-2 flex flex-col overflow-hidden"
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
          <!-- 文件树切换过渡效果 -->
          <Transition name="sidebar-fade-slide" mode="out-in">
            <!-- 项目文件树 -->
            <div v-if="leftPanelActiveTab === 'project'" :key="'project'">
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
                  @contextmenu="(e, n) => showTreeContextMenu(e, n)"
                />
              </div>
            </div>

            <!-- 依赖项文件树 -->
            <div v-else-if="leftPanelActiveTab === 'dependencies' && activeDependencyId" :key="activeDependencyId">
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
                  @contextmenu="(e, n) => showTreeContextMenu(e, n)"
                />
              </div>
            </div>
          </Transition>
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
        :dependency-roots="enabledDependencyRoots"
        :auto-save="autoSave"
        :disable-error-handling="disableErrorHandling"
        @context-menu="showFileTabContextMenu"
        @open-file="handleOpenFile"
        @errors-change="handleErrorsChange"
        @editor-context-menu-action="handleEditorContextMenuAction"
        @preview-event="handlePreviewEvent"
        @preview-focus="handlePreviewFocus"
        @jump-to-focus-from-preview="handleJumpToFocusFromPreview"
        @content-change="handleContentChange"
      />

      <!-- 右侧拖动条 -->
      <div
        v-if="rightPanelExpanded"
        class="w-1 bg-hoi4-border hover:bg-hoi4-accent cursor-col-resize flex-shrink-0"
        @mousedown="startResizeRight"
      ></div>

      <!-- 右侧面板 -->
      <RightPanel
        v-if="rightPanelExpanded"
        :project-info="projectInfo"
        :game-directory="gameDirectory"
        :game-file-tree="gameFileTree"
        :is-loading-game-tree="isLoadingGameTree"
        :txt-errors="txtErrors"
        :width="rightPanelWidth"
        :search-query="searchQuery"
        :search-results="searchResults"
        :is-searching="isSearching"
        :search-case-sensitive="searchCaseSensitive"
        :search-regex="searchRegex"
        :search-scope="searchScope"
        :include-all-files="includeAllFiles"
        :project-path="projectPath"
        v-model:active-tab="rightPanelActiveTab"
        @close="toggleRightPanel"
        @jumpToError="jumpToError"
        @toggleGameFolder="toggleGameFolder"
        @openFile="handleOpenFile"
        @update:search-query="searchQuery = $event"
        @update:search-case-sensitive="searchCaseSensitive = $event"
        @update:search-regex="searchRegex = $event"
        @update:search-scope="searchScope = $event as 'project' | 'game' | 'dependencies'"
        @update:include-all-files="includeAllFiles = $event"
        @perform-search="handlePerformSearch"
        @perform-replace="handlePerformReplace"
        @jumpToSearchResult="handleJumpToSearchResult"
      />
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      :menu-type="contextMenuType"
      :can-split="(editorGroupRef?.panes.length || 0) < 3"
      :available-panes="availablePanesForMove"
      @action="handleContextMenuAction"
      @close="hideContextMenu"
    />

    <!-- 创建对话框 -->
    <CreateDialog
      :visible="createDialogVisible"
      :type="createDialogType"
      :mode="createDialogMode"
      :initial-value="createDialogInitialValue"
      @confirm="handleCreateConfirm"
      @cancel="createDialogVisible = false"
    />

    <!-- 确认对话框 -->
    <ConfirmDialog
      :visible="confirmDialogVisible"
      :title="confirmDialogTitle"
      :message="confirmDialogMessage"
      :type="confirmDialogType"
      @confirm="handleConfirmDialogConfirm"
      @cancel="handleConfirmDialogCancel"
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

    <!-- 主题切换面板 -->
    <ThemePanel />
    
    <!-- 图标选择面板 -->
    <IconPanel />
  </div>
</template>

<style scoped>
.cursor-col-resize {
  cursor: col-resize;
}
</style>
