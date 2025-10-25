<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { readJsonFile, readFileContent, writeFileContent, createFile, createFolder, loadSettings, searchFiles, type SearchResult as ApiSearchResult, buildDirectoryTreeFast, getBracketDepths, writeJsonFile } from '../api/tauri'
import FileTreeNode from '../components/FileTreeNode.vue'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
// @ts-ignore
import { parseTxtErrors } from '../utils/txtParser'

// 定义 MOD 文件语法规则
Prism.languages.mod = {
  'comment': {
    pattern: /#.*/,
    greedy: true
  },
  'mod-key': {
    pattern: /^(\s*)(version|tags|name|replace_path|supported_version)\s*(=)/m,
    lookbehind: false,
    inside: {
      'whitespace': /^\s+/, // 保留前置缩进
      'keyword': /(version|tags|name|replace_path|supported_version)/,
      'punctuation': /=/
    }
  },
  'object-key': {
    pattern: /^(\s*)([a-zA-Z0-9_\.\-]+)(?=\s*=)/m,
    lookbehind: false,
    inside: {
      'whitespace': /^\s+/, // 保留前置缩进
      'keyword': /[a-zA-Z0-9_\.\-]+/
    }
  },
  'string': {
    pattern: /"(?:[^"\\]|\\.)*"/,
    greedy: true
  },
  'number': /\b\d+(?:\.\d+)?\b/,
  'punctuation': /[{}[\],]/,
  'operator': /=/
}

// 定义 HOI4 脚本语法规则（用于 .txt 文件）
Prism.languages.hoi4 = {
  'comment': {
    pattern: /#.*/,
    greedy: true
  },
  'hoi4-key': {
    pattern: /^(\s*)([a-zA-Z0-9_\.\-]+)(?=\s*=)/m,
    lookbehind: false,
    inside: {
      'whitespace': /^\s+/,
      'property': /[a-zA-Z0-9_\.\-]+/  // 天蓝色
    }
  },
  'hoi4-keyword-purple': {
    pattern: /\b(no|yes|true|false|if|limit)\b/,
    greedy: true  // 紫色关键字
  },
  'hoi4-value': {
    pattern: /(=\s*)([a-zA-Z_][a-zA-Z0-9_]*)/,
    lookbehind: true,
    inside: {
      'keyword': /[a-zA-Z_][a-zA-Z0-9_]*/  // 黄色值
    }
  },
  'string': {
    pattern: /"(?:[^"\\]|\\.)*"/,
    greedy: true
  },
  'number': /\b\d+(?:\.\d+)?\b/,  // 浅绿色数字
  'punctuation': /[{}[\],]/,
  'operator': /[=<>]/
}

const router = useRouter()
const route = useRoute()

// 项目信息
const projectPath = ref('')
const projectInfo = ref<any>(null)
const loading = ref(true)

// 打开的文件列表
interface OpenFile {
  node: FileNode
  content: string
  hasUnsavedChanges: boolean
  cursorLine: number
  cursorColumn: number
}

const openFiles = ref<OpenFile[]>([])
const activeFileIndex = ref<number>(-1)
const fileTabsRef = ref<HTMLElement | null>(null)

// 当前活动文件（计算属性）
const currentFile = ref<FileNode | null>(null)
const fileContent = ref('')
const isLoadingFile = ref(false)
const hasUnsavedChanges = ref(false)
const isReadOnly = ref(false)

// 编辑器状态
const currentLine = ref(1)
const currentColumn = ref(1)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const highlightRef = ref<HTMLPreElement | null>(null)
const highlightedCode = ref('')
const showHighlight = ref(false)
const indentSize = 4 // TAB默认 4 个空格缩进

// txt文件错误
const txtErrors = ref<{line: number, msg: string, type: string}[]>([])

// 行数栏
const lineNumbers = ref<number[]>([])
const lineNumbersRef = ref<HTMLDivElement | null>(null)

// 计算总行数
function calculateLineCount(content: string): number {
  if (!content) return 1
  return content.split('\n').length
}

// 更新行数显示
function updateLineNumbers() {
  const lineCount = calculateLineCount(fileContent.value)
  lineNumbers.value = Array.from({ length: lineCount }, (_, i) => i + 1)
  // 更新行数后同步滚动
  nextTick(() => syncScroll())
}

// 撤销/重做堆栈
interface HistoryState {
  content: string
  cursorStart: number
  cursorEnd: number
}
const undoStack = ref<HistoryState[]>([])
const redoStack = ref<HistoryState[]>([])
const isApplyingHistory = ref(false)

// 右键菜单（文件标签）
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuFileIndex = ref(-1)

// 右键菜单（文件树）
const treeContextMenuVisible = ref(false)
const treeContextMenuX = ref(0)
const treeContextMenuY = ref(0)
const treeContextMenuNode = ref<FileNode | null>(null)

// 创建文件/文件夹对话框
const createDialogVisible = ref(false)
const createDialogType = ref<'file' | 'folder'>('file')
const createDialogInput = ref('')
const createDialogError = ref('')

// 文件树
interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
  expanded?: boolean
}

const fileTree = ref<FileNode[]>([])
// 选中的文件树节点
const selectedNode = ref<FileNode | null>(null)

// 游戏目录树
const gameDirectory = ref('')
const gameFileTree = ref<FileNode[]>([])
const isLoadingGameTree = ref(false)

// 搜索功能
interface SearchResult {
  file: FileNode
  line: number
  content: string
  matchStart: number
  matchEnd: number
}
const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const isSearching = ref(false)
const searchCaseSensitive = ref(false)
const searchRegex = ref(false)

// 游戏目录搜索
const gameSearchQuery = ref('')
const gameSearchResults = ref<SearchResult[]>([])
const isGameSearching = ref(false)
const gameSearchCaseSensitive = ref(false)
const gameSearchRegex = ref(false)

// 侧边栏宽度
const leftPanelWidth = ref(250)
const rightPanelWidth = ref(300)
const isResizingLeft = ref(false)
const isResizingRight = ref(false)

// 右侧面板展开状态
const rightPanelExpanded = ref(true)
const rightPanelTab = ref<'info' | 'game' | 'errors'>('info') // 'info' 项目信息, 'game' 游戏目录, 'errors' 错误列表

// 加载项目信息并检查项目初始化状态，优先询问用户是否要初始化项目而不是显示错误
async function loadProjectInfo() {
  if (!projectPath.value) return
  
  try {
    // 首先检查是否存在 project.json 文件，如果不存在直接询问用户是否初始化
    // 如果存在但读取失败，也询问用户是否要重新初始化
    const projectJsonPath = `${projectPath.value}/project.json`
    const result = await readJsonFile(projectJsonPath)
    
    if (result.success && result.data) {
      // 成功读取项目配置
      projectInfo.value = result.data
      return
    }
    
    // project.json 不存在或读取失败，询问用户是否初始化项目
    const shouldInitialize = confirm('检测到此文件夹不是HOI4 Code Studio项目，是否要将其初始化为项目？')
    
    if (shouldInitialize) {
      try {
        // 读取 descriptor.mod 文件
        const descriptorPath = `${projectPath.value}/descriptor.mod`
        const descriptorResult = await readFileContent(descriptorPath)
        
        if (descriptorResult.success) {
          // 解析 descriptor.mod 中的 name 属性
          const content = descriptorResult.content
          const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m)
          const modName = nameMatch ? nameMatch[1] : 'Unknown Mod'
          
          // 创建 project.json
          const projectData = {
            name: modName,
            version: '1.0.0',
            created_at: new Date().toISOString()
          }
          
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
    // 如果用户选择不初始化，不做任何操作
  } catch (error) {
    console.error('加载项目信息失败:', error)
    const projectJsonPath = `${projectPath.value}/project.json`
    // 即使出现异常也不显示错误给用户，而是询问是否初始化
    const shouldInitialize = confirm('检测到此文件夹不是HOI4 Code Studio项目，是否要将其初始化为项目？')
    
    if (shouldInitialize) {
      try {
        // 读取 descriptor.mod 文件
        const descriptorPath = `${projectPath.value}/descriptor.mod`
        const descriptorResult = await readFileContent(descriptorPath)
        
        if (descriptorResult.success) {
          // 解析 descriptor.mod 中的 name 属性
          const content = descriptorResult.content
          const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m)
          const modName = nameMatch ? nameMatch[1] : 'Unknown Mod'
          
          // 创建 project.json
          const projectData = {
            name: modName,
            version: '1.0.0',
            created_at: new Date().toISOString()
          }
          
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
      } catch (initError) {
        console.error('项目初始化失败:', initError)
        alert(`项目初始化失败: ${initError}`)
      }
    }
  }
}

// 加载游戏目录设置
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

// 转换Rust FileNode到本地FileNode
function convertRustFileNode(node: any): FileNode {
  return {
    name: node.name,
    path: node.path,
    isDirectory: node.is_directory,
    children: node.children?.map(convertRustFileNode),
    expanded: node.expanded || false
  }
}

// 加载游戏目录文件树（使用Rust多线程构建）
async function loadGameFileTree() {
  if (!gameDirectory.value) return
  
  isLoadingGameTree.value = true
  try {
    // 使用Rust多线程快速构建文件树，最大深度3层
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

// 切换游戏目录文件夹展开状态
async function toggleGameFolder(node: FileNode) {
  if (!node.isDirectory) return
  
  node.expanded = !node.expanded
  
  // 如果是第一次展开，加载子文件（使用Rust快速构建）
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

// 复制文本到剪贴板
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    alert('复制失败')
  }
}

// 将API搜索结果转换为本地SearchResult格式
function convertApiSearchResult(apiResult: ApiSearchResult): SearchResult {
  return {
    file: {
      name: apiResult.file_name,
      path: apiResult.file_path,
      isDirectory: false,
      children: [],
      expanded: false
    },
    line: apiResult.line,
    content: apiResult.content,
    matchStart: apiResult.match_start,
    matchEnd: apiResult.match_end
  }
}

// 搜索项目文件内容（使用Rust后端多线程搜索）
async function performSearch() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  
  if (!projectPath.value) {
    alert('项目路径未设置')
    return
  }
  
  isSearching.value = true
  searchResults.value = []
  
  try {
    const result = await searchFiles(
      projectPath.value,
      searchQuery.value,
      searchCaseSensitive.value,
      searchRegex.value
    )
    
    if (result.success) {
      searchResults.value = result.results.map(convertApiSearchResult)
    } else {
      alert(`搜索失败: ${result.message}`)
    }
  } catch (error) {
    console.error('搜索失败:', error)
    alert(`搜索失败: ${error}`)
  } finally {
    isSearching.value = false
  }
}

// 跳转到项目搜索结果
async function jumpToSearchResult(result: SearchResult) {
  await openFile(result.file)

  await nextTick()

  if (!textareaRef.value) return

  const lines = fileContent.value.split('\n')
  const targetLineIndex = Math.max(Math.min(result.line - 1, lines.length - 1), 0)

  let position = 0
  for (let i = 0; i < targetLineIndex && i < lines.length; i++) {
    position += (lines[i]?.length ?? 0) + 1
  }

  const targetLine = lines[targetLineIndex] ?? ''
  const safeMatchStart = Math.min(Math.max(result.matchStart, 0), targetLine.length)
  position += safeMatchStart

  const rawMatchLength = Math.max(result.matchEnd - result.matchStart, 0)
  const fallbackLength = searchQuery.value.length || 1
  const selectionLength = rawMatchLength > 0 ? rawMatchLength : fallbackLength
  const selectionEnd = position + selectionLength

  textareaRef.value.focus()
  textareaRef.value.setSelectionRange(position, selectionEnd)
  textareaRef.value.scrollTop = targetLineIndex * 20
  updateCursorPosition()
}

// 搜索游戏目录文件内容（使用Rust后端多线程搜索）
async function performGameSearch() {
  if (!gameSearchQuery.value.trim()) {
    gameSearchResults.value = []
    return
  }
  
  if (!gameDirectory.value) {
    alert('游戏目录未设置')
    return
  }
  
  isGameSearching.value = true
  gameSearchResults.value = []
  
  try {
    const result = await searchFiles(
      gameDirectory.value,
      gameSearchQuery.value,
      gameSearchCaseSensitive.value,
      gameSearchRegex.value
    )
    
    if (result.success) {
      gameSearchResults.value = result.results.map(convertApiSearchResult)
    } else {
      alert(`搜索失败: ${result.message}`)
    }
  } catch (error) {
    console.error('游戏目录搜索失败:', error)
    alert(`搜索失败: ${error}`)
  } finally {
    isGameSearching.value = false
  }
}

// 跳转到游戏目录搜索结果
async function jumpToGameSearchResult(result: SearchResult) {
  // 打开文件（游戏文件只读）
  await openFile(result.file)
  
  // 等待文件加载完成
  await nextTick()
  
  // 跳转到指定行
  if (textareaRef.value) {
    const lines = fileContent.value.split('\n')
    let position = 0
    for (let i = 0; i < result.line - 1; i++) {
      position += lines[i].length + 1 // +1 for newline
    }
    position += result.matchStart
    
    textareaRef.value.focus()
    textareaRef.value.setSelectionRange(position, position + gameSearchQuery.value.length)
    textareaRef.value.scrollTop = (result.line - 1) * 20 // 粗略估计行高
    updateCursorPosition()
  }
}

// 跳转到错误行
async function jumpToError(error: {line: number, msg: string, type: string}) {
  // 滚动到指定行
  if (textareaRef.value) {
    const lines = fileContent.value.split('\n')
    let position = 0
    for (let i = 0; i < error.line - 1; i++) {
      position += lines[i].length + 1 // +1 for newline
    }
    
    textareaRef.value.focus()
    textareaRef.value.setSelectionRange(position, position)
    textareaRef.value.scrollTop = (error.line - 1) * 20 // 粗略估计行高
    updateCursorPosition()
  }
}

// 加载文件树（使用Rust多线程构建）
async function loadFileTree() {
  if (!projectPath.value) return
  
  try {
    // 使用Rust多线程快速构建文件树，最大深度3层
    const result = await buildDirectoryTreeFast(projectPath.value, 3)
    console.log('读取目录结果:', result)
    if (result.success && result.tree) {
      fileTree.value = result.tree.map(convertRustFileNode)
    }
  } catch (error) {
    console.error('加载文件树失败:', error)
  } finally {
    loading.value = false
  }
}

// 旧的buildFileTree函数已删除，现在使用Rust的buildDirectoryTreeFast

// 选中文件树节点
function selectNode(node: FileNode) {
  selectedNode.value = node
}

// 切换文件夹展开状态（使用Rust快速构建）
async function toggleFolder(node: FileNode) {
  if (!node.isDirectory) return
  
  // 选中当前节点
  selectNode(node)
  
  node.expanded = !node.expanded
  
  // 如果是第一次展开，加载子文件
  if (node.expanded && (!node.children || node.children.length === 0)) {
    try {
      const result = await buildDirectoryTreeFast(node.path, 2)
      console.log('读取子目录结果:', result)
      if (result.success && result.tree) {
        node.children = result.tree.map(convertRustFileNode)
      }
    } catch (error) {
      console.error('加载子目录失败:', error)
    }
  }
}

// 左侧面板拖动
function startResizeLeft(e: MouseEvent) {
  isResizingLeft.value = true
  e.preventDefault()
}

function onMouseMove(e: MouseEvent) {
  if (isResizingLeft.value) {
    const newWidth = e.clientX
    if (newWidth >= 150 && newWidth <= 500) {
      leftPanelWidth.value = newWidth
    }
  }
  
  if (isResizingRight.value) {
    const newWidth = window.innerWidth - e.clientX
    if (newWidth >= 200 && newWidth <= 600) {
      rightPanelWidth.value = newWidth
    }
  }
}

function stopResize() {
  isResizingLeft.value = false
  isResizingRight.value = false
}

// 切换右侧面板
function toggleRightPanel() {
  rightPanelExpanded.value = !rightPanelExpanded.value
}

// 打开文件
async function openFile(node: FileNode) {
  if (node.isDirectory) return
  
  // 选中当前节点
  selectNode(node)
  
  // 检查文件是否已经打开
  const existingIndex = openFiles.value.findIndex(f => f.node.path === node.path)
  if (existingIndex !== -1) {
    activeFileIndex.value = existingIndex
    updateCurrentFileState()
    return
  }
  
  // 读取文件内容
  try {
    const result = await readFileContent(node.path)
    if (result.success) {
      // 显示编码信息
      if (result.encoding && result.encoding !== 'UTF-8') {
        console.log(`文件编码: ${result.encoding}`)
      }
      
      // 检查是否为二进制文件
      if (result.is_binary) {
        alert(`${result.message}\n文件可能包含二进制数据，显示可能不正确。`)
      }
      
      openFiles.value.push({
        node,
        content: result.content,
        hasUnsavedChanges: false,
        cursorLine: 1,
        cursorColumn: 1
      })
      activeFileIndex.value = openFiles.value.length - 1
      updateCurrentFileState()
      
      // 触发一次编辑以同步高亮层，但不标记为未保存
      nextTick(() => {
        if (textareaRef.value) {
          isApplyingHistory.value = true  // 阻止 saveHistory
          const event = new Event('input', { bubbles: true })
          textareaRef.value.dispatchEvent(event)
          nextTick(() => {
            isApplyingHistory.value = false
            hasUnsavedChanges.value = false  // 重置未保存标记
            if (activeFileIndex.value >= 0 && openFiles.value[activeFileIndex.value]) {
              openFiles.value[activeFileIndex.value].hasUnsavedChanges = false
            }
          })
        }
      })
    } else {
      // 检查是否为图片文件
      if (result.is_image) {
        alert(`${result.message}\n请使用图片查看器打开此文件。`)
      } else {
        alert(`打开文件失败: ${result.message}`)
      }
    }
  } catch (error) {
    console.error('打开文件失败:', error)
    alert(`打开文件失败: ${error}`)
  } finally {
    isLoadingFile.value = false
  }
}

// 切换到指定文件
function switchToFile(index: number) {
  if (index < 0 || index >= openFiles.value.length) return
  
  // 保存当前文件状态
  if (activeFileIndex.value >= 0 && activeFileIndex.value < openFiles.value.length) {
    const currentFile = openFiles.value[activeFileIndex.value]
    currentFile.content = fileContent.value
    currentFile.hasUnsavedChanges = hasUnsavedChanges.value
  }
  
  activeFileIndex.value = index
  updateCurrentFileState()
}

// 处理文件标签栏的滚轮事件
function handleTabsWheel(event: WheelEvent) {
  if (!fileTabsRef.value) return
  
  // 阻止默认的垂直滚动
  event.preventDefault()
  
  // 将垂直滚动转换为水平滚动
  fileTabsRef.value.scrollLeft += event.deltaY
}

// 处理编辑器滚轮事件 - 增加滚动力度
function handleEditorWheel(event: WheelEvent) {
  if (!textareaRef.value) return
  
  // 阻止默认滚动行为
  event.preventDefault()
  
  // 滚动力度倍数（可调整，2.5 表示 2.5 倍速度）
  const scrollMultiplier = 2.5
  
  // 计算新的滚动位置
  const newScrollTop = textareaRef.value.scrollTop + (event.deltaY * scrollMultiplier)
  
  // 应用滚动
  textareaRef.value.scrollTop = newScrollTop
  
  // 触发同步滚动
  syncScroll()
}

// 处理行数栏滚轮事件
function handleLineNumbersWheel(event: WheelEvent) {
  if (!textareaRef.value) return
  
  // 阻止默认滚动行为
  event.preventDefault()
  
  // 滚动力度倍数（与编辑器保持一致）
  const scrollMultiplier = 2.5
  
  // 计算新的滚动位置
  const newScrollTop = textareaRef.value.scrollTop + (event.deltaY * scrollMultiplier)
  
  // 应用滚动到textarea
  textareaRef.value.scrollTop = newScrollTop
  
  // 触发同步滚动
  syncScroll()
}

// 更新当前文件状态到界面
function updateCurrentFileState() {
  if (activeFileIndex.value === -1 || !openFiles.value[activeFileIndex.value]) {
    currentFile.value = null
    fileContent.value = ''
    hasUnsavedChanges.value = false
    currentLine.value = 1
    currentColumn.value = 1
    return
  }
  
  const file = openFiles.value[activeFileIndex.value]
  currentFile.value = file.node
  fileContent.value = file.content
  hasUnsavedChanges.value = file.hasUnsavedChanges
  currentLine.value = file.cursorLine
  currentColumn.value = file.cursorColumn
  
  // 设置只读状态
  isReadOnly.value = !!gameDirectory.value && file.node.path.startsWith(gameDirectory.value)
  
  // 更新行数显示
  updateLineNumbers()
  
  // 切换文件时重置撤销/重做堆栈
  undoStack.value = []
  redoStack.value = []
}

// 保存文件
async function saveFile() {
  if (!currentFile.value || activeFileIndex.value === -1) return
  
  try {
    const result = await writeFileContent(currentFile.value.path, fileContent.value)
    if (result.success) {
      hasUnsavedChanges.value = false
      // 更新文件列表中的状态
      if (openFiles.value[activeFileIndex.value]) {
        openFiles.value[activeFileIndex.value].hasUnsavedChanges = false
        openFiles.value[activeFileIndex.value].content = fileContent.value
      }
    } else {
      alert(`保存失败: ${result.message}`)
    }
  } catch (error) {
    console.error('保存文件失败:', error)
    alert(`保存失败: ${error}`)
  }
}

// 保存历史状态
function saveHistory() {
  if (isApplyingHistory.value || !textareaRef.value) return
  
  const textarea = textareaRef.value
  const state: HistoryState = {
    content: fileContent.value,
    cursorStart: textarea.selectionStart,
    cursorEnd: textarea.selectionEnd
  }
  
  undoStack.value.push(state)
  if (undoStack.value.length > 100) {
    undoStack.value.shift()
  }
  redoStack.value = []
}

// 监听内容变化
function onContentChange(event: Event) {
  const target = event.target as HTMLTextAreaElement
  
  if (!isApplyingHistory.value) {
    saveHistory()
  }
  
  fileContent.value = target.value
  hasUnsavedChanges.value = true
  updateCursorPosition()

  if (activeFileIndex.value >= 0 && openFiles.value[activeFileIndex.value]) {
    openFiles.value[activeFileIndex.value].content = fileContent.value
    openFiles.value[activeFileIndex.value].hasUnsavedChanges = true
  }
  
  // 更新行数
  updateLineNumbers()
  
  // 同步滚动
  syncScroll()
  
  // 直接更新高亮
  highlightCode()
}

function handleEditorKeydown(event: KeyboardEvent) {
  if (event.key === 'Tab' && textareaRef.value) {
    event.preventDefault()
    const textarea = textareaRef.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value

    const before = value.substring(0, start)
    const after = value.substring(end)

    const selectedText = value.substring(start, end)
    if (event.shiftKey && selectedText.includes('\n')) {
      const lines = selectedText.split('\n')
      const updatedLines = lines.map(line => line.startsWith(' '.repeat(indentSize)) ? line.slice(indentSize) : line)
      const updatedText = updatedLines.join('\n')
      textarea.value = before + updatedText + after
      const removed = selectedText.length - updatedText.length
      textarea.selectionStart = start
      textarea.selectionEnd = end - removed
    } else if (!event.shiftKey && selectedText.includes('\n')) {
      const lines = selectedText.split('\n')
      const updatedLines = lines.map(line => line.length > 0 ? ' '.repeat(indentSize) + line : line)
      const updatedText = updatedLines.join('\n')
      textarea.value = before + updatedText + after
      textarea.selectionStart = start
      textarea.selectionEnd = start + updatedText.length
    } else {
      const indent = ' '.repeat(indentSize)
      textarea.value = before + indent + after
      textarea.selectionStart = textarea.selectionEnd = start + indent.length
    }

    fileContent.value = textarea.value
    hasUnsavedChanges.value = true
    saveHistory()
    nextTick(updateCursorPosition)
  }

  if (event.key === '{' && textareaRef.value && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    const textarea = textareaRef.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value
    const before = value.substring(0, start)
    const after = value.substring(end)
    const selected = value.substring(start, end)
    const wrapped = selected.length > 0 ? `{${selected}}` : '{}'
    const newValue = `${before}${wrapped}${after}`
    textarea.value = newValue
    const cursorPos = start + 1
    textarea.selectionStart = textarea.selectionEnd = cursorPos + selected.length
    fileContent.value = newValue
    hasUnsavedChanges.value = true
    saveHistory()
    nextTick(updateCursorPosition)
  }

  if (event.key === '}' && textareaRef.value && !event.ctrlKey && !event.metaKey) {
    const textarea = textareaRef.value
    const start = textarea.selectionStart
    const value = textarea.value
    const nextChar = value.substring(start, start + 1)
    if (nextChar === '}') {
      event.preventDefault()
      textarea.selectionStart = textarea.selectionEnd = start + 1
      nextTick(updateCursorPosition)
    }
  }

  if (event.key === 'Enter' && textareaRef.value) {
    event.preventDefault()
    const textarea = textareaRef.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value
    const before = value.substring(0, start)
    const after = value.substring(end)

    const currentLineStart = before.lastIndexOf('\n') + 1
    const currentLine = before.substring(currentLineStart)
    const baseIndent = currentLine.match(/^\s*/)?.[0] ?? ''
    const indentUnit = ' '.repeat(indentSize)
    const prevChar = before.slice(-1)
    const nextChar = after.charAt(0)

    let insertText = '\n' + baseIndent
    let cursorOffset = insertText.length

    if (prevChar === '{') {
      insertText += indentUnit
      cursorOffset = insertText.length
      if (nextChar === '}') {
        insertText += '\n' + baseIndent
      }
    } else if (nextChar === '}') {
      const reducedIndent = baseIndent.length >= indentSize ? baseIndent.slice(0, baseIndent.length - indentSize) : ''
      insertText = '\n' + reducedIndent
      cursorOffset = insertText.length
    }

    textarea.value = before + insertText + after
    textarea.selectionStart = textarea.selectionEnd = start + cursorOffset
    fileContent.value = textarea.value
    hasUnsavedChanges.value = true
    saveHistory()
    nextTick(updateCursorPosition)
  }
}

// 更新光标位置
function updateCursorPosition() {
  if (!textareaRef.value) return
  
  const textarea = textareaRef.value
  const text = textarea.value
  const cursorPos = textarea.selectionStart
  
  // 计算行号
  const textBeforeCursor = text.substring(0, cursorPos)
  const lines = textBeforeCursor.split('\n')
  currentLine.value = lines.length
  
  // 计算列号
  const currentLineText = lines[lines.length - 1]
  currentColumn.value = currentLineText.length + 1
  
  // 更新当前文件的光标位置
  if (activeFileIndex.value >= 0) {
    openFiles.value[activeFileIndex.value].cursorLine = currentLine.value
    openFiles.value[activeFileIndex.value].cursorColumn = currentColumn.value
  }
}

// 获取文件语言类型
function getLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'json': return 'json'
    case 'yml': case 'yaml': return 'yaml'
    case 'mod': return 'mod' // .mod 文件使用自定义语法
    case 'txt': return 'hoi4' // .txt 文件使用 HOI4 脚本语法
    default: return 'plaintext'
  }
}

// 高亮代码
function highlightCode() {
  if (!currentFile.value) {
    highlightedCode.value = ''
    showHighlight.value = false
    return
  }
  
  const language = getLanguage(currentFile.value.name)
  
  // 如果是纯文本，不使用高亮
  if (language === 'plaintext') {
    showHighlight.value = false
    return
  }
  
  try {
    const grammar = Prism.languages[language]
    if (grammar) {
      let highlighted = Prism.highlight(fileContent.value, grammar, language)
      // 保留末尾换行，避免 split 丢失空行
      if (fileContent.value.endsWith('\n')) {
        highlighted += '\n'
      }
      const contentLines = fileContent.value.split('\n')
      const highlightLines = highlighted.split('\n')
      const normalized = contentLines.map((_, index) => {
        let lineHtml = highlightLines[index] ?? ''
        if (lineHtml.length === 0) {
          lineHtml = '<span class="line-placeholder">&nbsp;</span>'
        }
        return lineHtml
      })

      // 检测txt文件错误
      if (language === 'hoi4') {
        txtErrors.value = parseTxtErrors(fileContent.value)
        // 为有错误的行添加错误高亮
        txtErrors.value.forEach(error => {
          const lineIndex = error.line - 1
          if (normalized[lineIndex]) {
            normalized[lineIndex] = `<div class="error-line">${normalized[lineIndex]}</div>`
          }
        })
      } else {
        txtErrors.value = []
      }

      // 若 highlight 多出行（如 Prism 自动附加换行），截断以保持与文本一致
      highlightedCode.value = normalized.join('\n')
      showHighlight.value = true
      nextTick(() => {
        applyBraceHighlight()
        syncScroll()
      })
    } else {
      showHighlight.value = false
    }
  } catch (error) {
    console.error('语法高亮失败:', error)
    showHighlight.value = false
  }
}

// 同步滚动 - 使用平滑过渡效果
function syncScroll() {
  if (textareaRef.value) {
    requestAnimationFrame(() => {
      if (textareaRef.value) {
        const textarea = textareaRef.value
        const highlight = highlightRef.value
        const lineNumbers = lineNumbersRef.value
        
        // 检查是否滚动到底部
        const maxScroll = textarea.scrollHeight - textarea.clientHeight
        const currentScroll = textarea.scrollTop
        const bottomThreshold = 50 // 距离底部50px时触发回弹
        
        // 如果滚动到接近底部，使用平滑滚动回弹到固定位置
        if (maxScroll - currentScroll < bottomThreshold) {
          const bouncePosition = maxScroll - 100 // 回弹到距离底部100px的位置
          
          // 使用 scrollTo 的平滑滚动选项
          textarea.scrollTo({
            top: bouncePosition,
            behavior: 'smooth'
          })
          
          // 高亮层同步平滑滚动
          if (highlight) {
            highlight.scrollTo({
              top: bouncePosition,
              left: textarea.scrollLeft,
              behavior: 'smooth'
            })
          }

          // 行数栏同步平滑滚动
          if (lineNumbers) {
            lineNumbers.scrollTo({
              top: bouncePosition,
              behavior: 'smooth'
            })
          }
        } else {
          // 正常滚动时直接同步，不使用平滑效果以保持即时响应
          if (highlight) {
            highlight.scrollTop = textarea.scrollTop
            highlight.scrollLeft = textarea.scrollLeft
          }
          
          // 行数栏同步滚动
          if (lineNumbers) {
            lineNumbers.scrollTop = textarea.scrollTop
          }
        }
      }
    })
  }
}

// 获取括号颜色 class
function getBraceClass(depth: number): string {
  const level = ((depth - 1) % 6 + 6) % 6 + 1
  return `brace-depth-${level}`
}

// 清除已有的括号高亮
function clearBraceHighlight(codeEl: HTMLElement) {
  const highlightedBraces = codeEl.querySelectorAll('.brace-bracket')
  highlightedBraces.forEach((span) => {
    const text = span.textContent ?? ''
    span.replaceWith(document.createTextNode(text))
  })
}

// 应用括号分级高亮（使用Rust后端算法）
async function applyBraceHighlight() {
  if (!showHighlight.value || !highlightRef.value) return
  const codeEl = highlightRef.value.querySelector('code')
  if (!codeEl) return

  clearBraceHighlight(codeEl)

  try {
    // 使用Rust后端获取括号深度映射
    const depthMap = await getBracketDepths(fileContent.value)
    
    const walker = document.createTreeWalker(codeEl, NodeFilter.SHOW_TEXT)
    const textNodes: Text[] = []

    while (walker.nextNode()) {
      const node = walker.currentNode as Text
      if (node.nodeValue && (node.nodeValue.includes('{') || node.nodeValue.includes('}'))) {
        textNodes.push(node)
      }
    }

    let charIndex = 0

    textNodes.forEach((node) => {
      const parentElement = node.parentElement
      if (parentElement && (parentElement.closest('.token.string') || parentElement.closest('.token.comment'))) {
        charIndex += node.nodeValue?.length || 0
        return
      }

      const text = node.nodeValue ?? ''
      const fragment = document.createDocumentFragment()

      for (const char of text) {
        if (char === '{' || char === '}') {
          const depth = depthMap[charIndex] || 1
          const span = document.createElement('span')
          span.className = `brace-bracket ${getBraceClass(depth)}`
          span.textContent = char
          fragment.appendChild(span)
        } else {
          fragment.appendChild(document.createTextNode(char))
        }
        charIndex++
      }

      node.replaceWith(fragment)
    })
  } catch (error) {
    console.error('括号高亮失败:', error)
  }
}

// 监听文件切换时更新高亮
watch(currentFile, () => {
  nextTick(() => {
    highlightCode()
  })
}, { immediate: true })

// 关闭文件
function closeFile(index?: number) {
  const targetIndex = index !== undefined ? index : activeFileIndex.value
  if (targetIndex === -1 || !openFiles.value[targetIndex]) return
  
  const file = openFiles.value[targetIndex]
  
  // 检查未保存更改
  if (file.hasUnsavedChanges) {
    if (!confirm(`文件 "${file.node.name}" 有未保存的更改，是否放弃更改？`)) {
      return
    }
  }
  
  // 从列表中移除
  openFiles.value.splice(targetIndex, 1)
  
  // 调整活动文件索引
  if (openFiles.value.length === 0) {
    activeFileIndex.value = -1
  } else if (targetIndex === activeFileIndex.value) {
    // 如果关闭的是当前文件，切换到前一个或后一个
    activeFileIndex.value = Math.min(targetIndex, openFiles.value.length - 1)
  } else if (targetIndex < activeFileIndex.value) {
    // 如果关闭的文件在当前文件之前，索引需要减1
    activeFileIndex.value--
  }
  
  updateCurrentFileState()
}

// 关闭所有文件
function closeAllFiles() {
  const hasUnsaved = openFiles.value.some(f => f.hasUnsavedChanges)
  if (hasUnsaved) {
    if (!confirm('有文件包含未保存的更改，是否放弃所有更改？')) {
      return
    }
  }
  
  openFiles.value = []
  activeFileIndex.value = -1
  updateCurrentFileState()
  hideContextMenu()
}

// 关闭其他文件
function closeOtherFiles(keepIndex: number) {
  if (keepIndex < 0 || keepIndex >= openFiles.value.length) return
  
  // 检查其他文件是否有未保存更改
  const hasUnsaved = openFiles.value.some((f, i) => i !== keepIndex && f.hasUnsavedChanges)
  if (hasUnsaved) {
    if (!confirm('其他文件包含未保存的更改，是否放弃更改？')) {
      return
    }
  }
  
  // 保留指定文件
  const keepFile = openFiles.value[keepIndex]
  openFiles.value = [keepFile]
  activeFileIndex.value = 0
  updateCurrentFileState()
  hideContextMenu()
}

// 显示文件标签右键菜单
function showFileTabContextMenu(event: MouseEvent, index: number) {
  event.preventDefault()
  contextMenuFileIndex.value = index
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuVisible.value = true
}

// 隐藏右键菜单
function hideContextMenu() {
  contextMenuVisible.value = false
  contextMenuFileIndex.value = -1
  treeContextMenuVisible.value = false
  treeContextMenuNode.value = null
}

// 处理右键菜单选项
function handleContextMenuAction(action: 'closeAll' | 'closeOthers') {
  if (action === 'closeAll') {
    closeAllFiles()
  } else if (action === 'closeOthers') {
    closeOtherFiles(contextMenuFileIndex.value)
  }
}

// 显示文件树右键菜单
function showTreeContextMenu(event: MouseEvent, node: FileNode | null = null) {
  event.preventDefault()
  event.stopPropagation()
  treeContextMenuNode.value = node
  treeContextMenuX.value = event.clientX
  treeContextMenuY.value = event.clientY
  treeContextMenuVisible.value = true
}

// 在空白区域右键
function handleTreeAreaContextMenu(event: MouseEvent) {
  // 检查是否点击在文件树节点上
  const target = event.target as HTMLElement
  if (target.closest('.file-tree-node')) {
    return // 如果点击在节点上，让节点处理
  }
  showTreeContextMenu(event, null)
}

// 显示创建对话框
function showCreateDialog(type: 'file' | 'folder') {
  createDialogType.value = type
  createDialogInput.value = ''
  createDialogError.value = ''
  createDialogVisible.value = true
  hideContextMenu()
  
  // 等待 DOM 更新后聚焦输入框
  setTimeout(() => {
    const input = document.querySelector('.create-dialog-input') as HTMLInputElement
    if (input) input.focus()
  }, 100)
}

// 取消创建对话框
function cancelCreateDialog() {
  createDialogVisible.value = false
  createDialogInput.value = ''
  createDialogError.value = ''
}

// 确认创建
async function confirmCreate() {
  const name = createDialogInput.value.trim()
  
  // 验证输入
  if (!name) {
    createDialogError.value = '名称不能为空'
    return
  }
  
  // 验证文件名合法性
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(name)) {
    createDialogError.value = '名称包含非法字符: < > : " / \\ | ? *'
    return
  }
  
  // 确定父路径
  // 优先级：右键菜单节点 > 选中的节点 > 项目根目录
  let parentPath: string
  if (treeContextMenuNode.value) {
    // 如果有右键菜单节点，使用它
    parentPath = treeContextMenuNode.value.isDirectory 
      ? treeContextMenuNode.value.path 
      : treeContextMenuNode.value.path.substring(0, treeContextMenuNode.value.path.lastIndexOf('\\'))
  } else if (selectedNode.value) {
    // 如果有选中的节点，使用它
    parentPath = selectedNode.value.isDirectory 
      ? selectedNode.value.path 
      : selectedNode.value.path.substring(0, selectedNode.value.path.lastIndexOf('\\'))
  } else {
    // 否则使用项目根目录
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
      // 刷新文件树
      await refreshFileTree(parentPath)
      cancelCreateDialog()
    } else {
      createDialogError.value = result.message || '创建失败'
    }
  } catch (error) {
    console.error('创建失败:', error)
    createDialogError.value = `创建失败: ${error}`
  }
}

// 处理对话框键盘事件
function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    confirmCreate()
  } else if (event.key === 'Escape') {
    cancelCreateDialog()
  }
}

// 刷新文件树指定路径（使用Rust快速构建）
async function refreshFileTree(path: string) {
  try {
    const result = await buildDirectoryTreeFast(path, 3)
    if (result.success && result.tree) {
      // 如果是根目录，更新整个树
      if (path === projectPath.value) {
        fileTree.value = result.tree.map(convertRustFileNode)
      } else {
        // 否则找到对应节点并更新其子节点
        updateNodeChildren(fileTree.value, path, result.tree)
      }
    }
  } catch (error) {
    console.error('刷新文件树失败:', error)
  }
}

// 递归更新节点的子节点
function updateNodeChildren(nodes: FileNode[], targetPath: string, newFiles: any[]) {
  for (const node of nodes) {
    if (node.path === targetPath && node.isDirectory) {
      node.children = newFiles.map(convertRustFileNode)
      node.expanded = true
      return true
    }
    if (node.children && updateNodeChildren(node.children, targetPath, newFiles)) {
      return true
    }
  }
  return false
}

// 撤销
function undo() {
  if (!textareaRef.value || undoStack.value.length === 0) return
  
  const textarea = textareaRef.value
  const currentState: HistoryState = {
    content: fileContent.value,
    cursorStart: textarea.selectionStart,
    cursorEnd: textarea.selectionEnd
  }
  
  redoStack.value.push(currentState)
  
  const previousState = undoStack.value.pop()
  if (previousState) {
    isApplyingHistory.value = true
    fileContent.value = previousState.content
    
    // 立即更新打开文件的内容
    if (activeFileIndex.value >= 0 && openFiles.value[activeFileIndex.value]) {
      openFiles.value[activeFileIndex.value].content = previousState.content
    }
    
    nextTick(() => {
      textarea.setSelectionRange(previousState.cursorStart, previousState.cursorEnd)
      textarea.focus()
      isApplyingHistory.value = false
      highlightCode()
      updateCursorPosition()
      // 更新行数显示
      updateLineNumbers()
      // 同步滚动
      syncScroll()
      // 同步滚动
      syncScroll()
    })
  }
}

// 重做
function redo() {
  if (!textareaRef.value || redoStack.value.length === 0) return
  
  const textarea = textareaRef.value
  const currentState: HistoryState = {
    content: fileContent.value,
    cursorStart: textarea.selectionStart,
    cursorEnd: textarea.selectionEnd
  }
  
  undoStack.value.push(currentState)
  const nextState = redoStack.value.pop()!
  
  isApplyingHistory.value = true
  fileContent.value = nextState.content
  textarea.value = nextState.content
  
  // 立即更新打开文件的内容
  if (activeFileIndex.value >= 0 && openFiles.value[activeFileIndex.value]) {
    openFiles.value[activeFileIndex.value].content = nextState.content
  }
  
  nextTick(() => {
    textarea.setSelectionRange(nextState.cursorStart, nextState.cursorEnd)
    textarea.focus()
    isApplyingHistory.value = false
    highlightCode()
    updateCursorPosition()
    // 更新行数显示
    updateLineNumbers()
    // 同步滚动
    syncScroll()
  })
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


// 键盘快捷键
function handleKeyDown(e: KeyboardEvent) {
  // Ctrl+S 保存
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (currentFile.value && hasUnsavedChanges.value) {
      saveFile()
    }
  }
  
  // Ctrl+Z 撤销
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    undo()
  }
  
  // Ctrl+Y 或 Ctrl+Shift+Z 重做
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault()
    redo()
  }
}

onMounted(() => {
  projectPath.value = route.query.path as string || ''
  
  if (projectPath.value) {
    loadProjectInfo()
    loadFileTree()
    loadGameDirectory()
  } else {
    loading.value = false
  }
  
  // 添加全局鼠标事件监听
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', stopResize)
  
  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeyDown)
  // 点击其他地方关闭右键菜单
  document.addEventListener('click', hideContextMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', hideContextMenu)
})
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-hoi4-dark overflow-hidden">
    <!-- 顶部工具栏 -->
    <div class="flex items-center justify-between px-4 py-2 bg-hoi4-gray border-b-2 border-hoi4-border">
      <div class="flex items-center space-x-4">
        <button
          @click="goBack"
          class="flex items-center space-x-2 px-3 py-1 bg-hoi4-accent hover:bg-hoi4-border rounded transition-colors"
        >
          <svg class="w-4 h-4 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          <span class="text-hoi4-text text-sm">返回</span>
        </button>
        <h1 class="text-hoi4-text font-bold text-lg">项目编辑器</h1>
      </div>
      
      <button
        @click="toggleRightPanel"
        class="flex items-center space-x-2 px-3 py-1 bg-hoi4-accent hover:bg-hoi4-border rounded transition-colors"
      >
        <svg class="w-4 h-4 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span class="text-hoi4-text text-sm">{{ rightPanelExpanded ? '隐藏' : '显示' }}侧边栏</span>
      </button>
    </div>

    <!-- 主内容区域 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧文件树面板 -->
      <div
        class="bg-hoi4-gray border-r-2 border-hoi4-border overflow-y-auto flex-shrink-0"
        :style="{ width: leftPanelWidth + 'px' }"
        @contextmenu="handleTreeAreaContextMenu"
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
              @open-file="openFile"
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
          <!-- 多文件标签 -->
          <div 
            v-if="openFiles.length > 0" 
            ref="fileTabsRef"
            @wheel="handleTabsWheel"
            class="flex items-center bg-hoi4-gray border-b border-hoi4-border overflow-x-auto scroll-smooth"
            style="scrollbar-width: none; -ms-overflow-style: none;"
          >
            <div
              v-for="(file, index) in openFiles"
              :key="file.node.path"
              @click="switchToFile(index)"
              @contextmenu.prevent="showFileTabContextMenu($event, index)"
              class="flex items-center px-4 py-2 border-r border-hoi4-border cursor-pointer hover:bg-hoi4-accent transition-colors whitespace-nowrap"
              :class="{ 'bg-hoi4-accent': index === activeFileIndex }"
            >
              <span class="text-hoi4-text text-sm whitespace-nowrap">{{ file.node.name }}</span>
              <span v-if="file.hasUnsavedChanges" class="text-red-400 text-xs">●</span>
              <button
                @click.stop="closeFile(index)"
                class="text-hoi4-text-dim hover:text-hoi4-text transition-colors ml-2"
                title="关闭"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 编辑器工具栏 -->
          <div class="px-4 py-2 flex items-center justify-between bg-hoi4-accent">
            <div class="flex items-center space-x-2">
              <!-- 保存按钮 -->
              <button
                @click="saveFile"
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
            
            <!-- 文件信息 -->
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
          <!-- 行数栏 -->
          <div
            ref="lineNumbersRef"
            class="absolute left-0 top-0 bottom-0 z-5 overflow-y-auto line-numbers"
            style="width: 60px; background-color: #1a1a1a; border-right: 1px solid #2a2a2a; padding: 16px 8px 50vh 8px; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 0.875rem; line-height: 1.5; color: #6a6a6a; user-select: none;"
            @wheel="handleLineNumbersWheel"
          >
            <div
              v-for="lineNumber in lineNumbers"
              :key="lineNumber"
              class="line-number"
              :class="{ 'current-line': lineNumber === currentLine }"
              style="height: 1.5em; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px;"
            >
              {{ lineNumber }}
            </div>
          </div>
          
          <!-- 语法高亮层 -->
          <pre
            v-if="showHighlight"
            ref="highlightRef"
            class="absolute inset-0 p-4 bg-hoi4-dark text-hoi4-text font-mono overflow-auto pointer-events-none highlight-layer"
            style="font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 0.875rem; margin: 0; line-height: 1.5; white-space: pre; overflow-x: auto; overflow-y: auto; letter-spacing: 0; word-spacing: 0; font-feature-settings: normal; font-variant-ligatures: none; padding-bottom: 50vh; left: 60px;"
          ><code v-html="highlightedCode" class="language-code" style="font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 0.875rem; white-space: pre; letter-spacing: 0; word-spacing: 0; display: block; font-feature-settings: normal; font-variant-ligatures: none; line-height: 1.5;"></code></pre>
          
          <!-- 文本编辑区 -->
          <textarea
            ref="textareaRef"
            :value="fileContent"
            @input="onContentChange"
            @click="updateCursorPosition"
            @keydown="handleEditorKeydown"
            @scroll="syncScroll"
            @wheel="handleEditorWheel"
            @mouseup="updateCursorPosition"
            class="w-full h-full p-4 bg-transparent text-hoi4-text font-mono resize-none outline-none relative z-10"
            :class="{ 'text-transparent caret-white': showHighlight }"
            style="font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 0.875rem; line-height: 1.5; white-space: pre; overflow-x: auto; overflow-y: auto; letter-spacing: 0; word-spacing: 0; font-feature-settings: normal; font-variant-ligatures: none; padding-bottom: 50vh; padding-left: 76px;"
            spellcheck="false"
            wrap="off"
          ></textarea>
          
          <!-- 底部空气墙 -->
          <div class="absolute bottom-0 left-0 right-0 pointer-events-none" style="height: 50vh; background: transparent;"></div>
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
      <div
        v-if="rightPanelExpanded"
        class="bg-hoi4-gray border-l-2 border-hoi4-border flex-shrink-0 overflow-hidden flex flex-col"
        :style="{ width: rightPanelWidth + 'px' }"
      >
        <!-- 标签栏 -->
        <div class="bg-hoi4-accent border-b border-hoi4-border flex items-center justify-between">
          <div class="flex">
            <button
              @click="rightPanelTab = 'info'"
              class="px-4 py-2 text-sm transition-colors border-r border-hoi4-border"
              :class="rightPanelTab === 'info' ? 'bg-hoi4-gray text-hoi4-text' : 'text-hoi4-text-dim hover:text-hoi4-text'"
            >
              项目信息
            </button>
            <button
              @click="rightPanelTab = 'game'"
              class="px-4 py-2 text-sm transition-colors"
              :class="rightPanelTab === 'game' ? 'bg-hoi4-gray text-hoi4-text' : 'text-hoi4-text-dim hover:text-hoi4-text'"
            >
              显示游戏目录
            </button>
            <button
              @click="rightPanelTab = 'errors'"
              class="px-4 py-2 text-sm transition-colors"
              :class="rightPanelTab === 'errors' ? 'bg-hoi4-gray text-hoi4-text' : 'text-hoi4-text-dim hover:text-hoi4-text'"
            >
              错误列表
            </button>
          </div>
          <button
            @click="toggleRightPanel"
            class="px-3 text-hoi4-text-dim hover:text-hoi4-text"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- 搜索栏 (仅在项目信息标签显示) -->
        <div v-if="rightPanelTab === 'info'" class="p-2 bg-hoi4-accent border-b border-hoi4-border">
          <div class="flex items-center space-x-2 mb-2">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索代码..."
              class="flex-1 px-2 py-1 bg-hoi4-dark text-hoi4-text text-xs rounded border border-hoi4-border focus:outline-none focus:border-hoi4-text-dim"
              @keydown.enter="performSearch"
            />
            <button
              @click="performSearch"
              :disabled="isSearching || !searchQuery.trim()"
              class="px-3 py-1 bg-hoi4-gray hover:bg-hoi4-border rounded text-hoi4-text text-xs transition-colors"
              :class="{ 'opacity-50 cursor-not-allowed': isSearching || !searchQuery.trim() }"
            >
              {{ isSearching ? '搜索中...' : '搜索' }}
            </button>
          </div>
          <div class="flex items-center space-x-3 text-xs">
            <label class="flex items-center space-x-1 cursor-pointer text-hoi4-text-dim hover:text-hoi4-text">
              <input
                v-model="searchCaseSensitive"
                type="checkbox"
                class="w-3 h-3"
              />
              <span>区分大小写</span>
            </label>
            <label class="flex items-center space-x-1 cursor-pointer text-hoi4-text-dim hover:text-hoi4-text">
              <input
                v-model="searchRegex"
                type="checkbox"
                class="w-3 h-3"
              />
              <span>正则表达式</span>
            </label>
          </div>
        </div>
        
        <!-- 内容区域 -->
        <div class="flex-1 overflow-y-auto">
          <!-- 项目信息标签内容 -->
          <div v-if="rightPanelTab === 'info'" class="h-full flex flex-col">
            <!-- 搜索结果 -->
            <div v-if="searchResults.length > 0" class="flex-1 overflow-y-auto p-2">
              <div class="text-hoi4-text text-xs mb-2 font-semibold">
                找到 {{ searchResults.length }} 个结果
              </div>
              <div class="space-y-1">
                <div
                  v-for="(result, index) in searchResults"
                  :key="index"
                  @click="() => jumpToSearchResult(result)"
                  class="bg-hoi4-accent p-2 rounded cursor-pointer hover:bg-hoi4-border transition-colors"
                >
                  <div class="text-hoi4-text text-xs font-semibold mb-1">
                    {{ result.file.name }} : {{ result.line }}
                  </div>
                  <div class="text-hoi4-text-dim text-xs font-mono truncate">
                    {{ result.content }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 项目信息 -->
            <div v-else class="p-3">
              <div v-if="!projectInfo" class="text-hoi4-text-dim text-sm">加载项目信息...</div>
              <div v-else class="space-y-4">
                <!-- 项目名称 -->
                <div class="bg-hoi4-accent p-3 rounded">
                  <div class="text-hoi4-text-dim text-xs mb-1">项目名称</div>
                  <div class="text-hoi4-text font-bold text-lg">{{ projectInfo.name }}</div>
                </div>
                
                <!-- 版本 -->
                <div>
                  <div class="text-hoi4-text-dim text-xs mb-1">版本</div>
                  <div class="text-hoi4-text text-sm">{{ projectInfo.version }}</div>
                </div>
                
                <!-- 创建时间 -->
                <div>
                  <div class="text-hoi4-text-dim text-xs mb-1">创建时间</div>
                  <div class="text-hoi4-text text-sm">{{ new Date(projectInfo.created_at).toLocaleString('zh-CN') }}</div>
                </div>
                
                <!-- Replace Path -->
                <div v-if="projectInfo.replace_path && projectInfo.replace_path.length > 0">
                  <div class="text-hoi4-text-dim text-xs mb-2">Replace Path</div>
                  <div class="space-y-1">
                    <div
                      v-for="(path, index) in projectInfo.replace_path"
                      :key="index"
                      class="bg-hoi4-accent px-2 py-1 rounded text-hoi4-text text-xs"
                    >
                      {{ path }}
                    </div>
                  </div>
                </div>
                
                <!-- 其他字段 -->
                <div v-for="(value, key) in projectInfo" :key="String(key)">
                  <template v-if="!['name', 'version', 'created_at', 'replace_path'].includes(String(key))">
                    <div class="text-hoi4-text-dim text-xs mb-1">{{ key }}</div>
                    <div class="text-hoi4-text text-sm break-words">
                      {{ typeof value === 'object' ? JSON.stringify(value, null, 2) : value }}
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- 游戏目录标签内容 -->
          <div v-else-if="rightPanelTab === 'game'" class="h-full flex flex-col">
            <div v-if="!gameDirectory" class="text-hoi4-text-dim text-sm p-2">
              未设置游戏目录，请前往设置页面配置
            </div>
            <div v-else-if="isLoadingGameTree" class="text-hoi4-text-dim text-sm p-2">
              加载游戏目录中...
            </div>
            <div v-else-if="gameFileTree.length === 0" class="text-hoi4-text-dim text-sm p-2">
              游戏目录为空
            </div>
            <template v-else>
              <!-- 游戏目录搜索栏 -->
              <div class="p-2 bg-hoi4-accent border-b border-hoi4-border">
                <div class="flex items-center space-x-2 mb-2">
                  <input
                    v-model="gameSearchQuery"
                    type="text"
                    placeholder="搜索游戏目录..."
                    class="flex-1 px-2 py-1 bg-hoi4-dark text-hoi4-text text-xs rounded border border-hoi4-border focus:outline-none focus:border-hoi4-text-dim"
                    @keydown.enter="performGameSearch"
                  />
                  <button
                    @click="performGameSearch"
                    :disabled="isGameSearching || !gameSearchQuery.trim()"
                    class="px-3 py-1 bg-hoi4-gray hover:bg-hoi4-border rounded text-hoi4-text text-xs transition-colors"
                    :class="{ 'opacity-50 cursor-not-allowed': isGameSearching || !gameSearchQuery.trim() }"
                  >
                    {{ isGameSearching ? '搜索中...' : '搜索' }}
                  </button>
                </div>
                <div class="flex items-center space-x-3 text-xs">
                  <label class="flex items-center space-x-1 cursor-pointer text-hoi4-text-dim hover:text-hoi4-text">
                    <input
                      v-model="gameSearchCaseSensitive"
                      type="checkbox"
                      class="w-3 h-3"
                    />
                    <span>区分大小写</span>
                  </label>
                  <label class="flex items-center space-x-1 cursor-pointer text-hoi4-text-dim hover:text-hoi4-text">
                    <input
                      v-model="gameSearchRegex"
                      type="checkbox"
                      class="w-3 h-3"
                    />
                    <span>正则表达式</span>
                  </label>
                </div>
              </div>

              <!-- 游戏目录搜索结果 -->
              <div v-if="gameSearchResults.length > 0" class="flex-1 overflow-y-auto p-2">
                <div class="text-hoi4-text text-xs mb-2 font-semibold">
                  找到 {{ gameSearchResults.length }} 个结果
                </div>
                <div class="space-y-1">
                  <div
                    v-for="(result, index) in gameSearchResults"
                    :key="index"
                    @click="jumpToGameSearchResult(result)"
                    class="bg-hoi4-accent p-2 rounded cursor-pointer hover:bg-hoi4-border transition-colors"
                  >
                    <div class="text-hoi4-text text-xs font-semibold mb-1">
                      {{ result.file.name }} : {{ result.line }}
                    </div>
                    <div class="text-hoi4-text-dim text-xs font-mono truncate">
                      {{ result.content }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 游戏目录树 -->
              <div v-else class="flex-1 overflow-y-auto p-2">
                <div class="text-hoi4-text text-xs mb-2 font-semibold px-1">
                  游戏目录: {{ gameDirectory }}
                </div>
                <FileTreeNode
                  v-for="node in gameFileTree"
                  :key="node.path"
                  :node="node"
                  :level="0"
                  @toggle="toggleGameFolder"
                  @open-file="openFile"
                />
              </div>
            </template>
          </div>

          <!-- 错误列表标签内容 -->
          <div v-else-if="rightPanelTab === 'errors'" class="h-full flex flex-col">
            <div v-if="txtErrors.length === 0" class="text-hoi4-text-dim text-sm p-2">
              无错误
            </div>
            <div v-else class="flex-1 overflow-y-auto p-2">
              <div class="text-hoi4-text text-xs mb-2 font-semibold">
                找到 {{ txtErrors.length }} 个错误
              </div>
              <div class="space-y-1">
                <div
                  v-for="(error, index) in txtErrors"
                  :key="index"
                  @click="jumpToError(error)"
                  class="bg-hoi4-accent p-2 rounded cursor-pointer hover:bg-hoi4-border transition-colors"
                >
                  <div class="text-hoi4-text text-xs font-semibold mb-1">
                    第 {{ error.line }} 行: {{ error.msg }}
                  </div>
                  <div class="text-hoi4-text-dim text-xs">
                    类型: {{ error.type }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件标签右键菜单 -->
    <div
      v-if="contextMenuVisible"
      class="fixed border-2 rounded shadow-lg z-50"
      :style="{ 
        left: contextMenuX + 'px', 
        top: contextMenuY + 'px',
        backgroundColor: '#1a1a1a',
        borderColor: '#2a2a2a'
      }"
      @click.stop
    >
      <button
        @click="handleContextMenuAction('closeAll')"
        class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item"
        style="color: #e0e0e0;"
      >
        关闭全部
      </button>
      <button
        @click="handleContextMenuAction('closeOthers')"
        class="w-full px-4 py-2 text-left text-sm border-t whitespace-nowrap transition-colors context-menu-item"
        style="color: #e0e0e0; border-color: #2a2a2a;"
      >
        关闭其他
      </button>
    </div>

    <!-- 文件树右键菜单 -->
    <div
      v-if="treeContextMenuVisible"
      class="fixed border-2 rounded shadow-lg z-50"
      :style="{ 
        left: treeContextMenuX + 'px', 
        top: treeContextMenuY + 'px',
        backgroundColor: '#1a1a1a',
        borderColor: '#2a2a2a'
      }"
      @click.stop
    >
      <button
        @click="showCreateDialog('file')"
        class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item"
        style="color: #e0e0e0;"
      >
        📄 新建文件
      </button>
      <button
        @click="showCreateDialog('folder')"
        class="w-full px-4 py-2 text-left text-sm border-t whitespace-nowrap transition-colors context-menu-item"
        style="color: #e0e0e0; border-color: #2a2a2a;"
      >
        📁 新建文件夹
      </button>
    </div>

    <!-- 创建文件/文件夹对话框 -->
    <div
      v-if="createDialogVisible"
      class="fixed inset-0 flex items-center justify-center z-50"
      style="background-color: rgba(0, 0, 0, 0.7);"
      @click.self="cancelCreateDialog"
    >
      <div
        class="border-2 rounded-lg shadow-2xl"
        style="background-color: #1a1a1a; border-color: #2a2a2a; width: 400px; max-width: 90vw;"
        @click.stop
      >
        <!-- 对话框标题 -->
        <div class="px-6 py-4 border-b-2" style="border-color: #2a2a2a;">
          <h3 class="text-lg font-bold" style="color: #e0e0e0;">
            {{ createDialogType === 'file' ? '📄 新建文件' : '📁 新建文件夹' }}
          </h3>
        </div>

        <!-- 对话框内容 -->
        <div class="px-6 py-4">
          <label class="block mb-2 text-sm" style="color: #a0a0a0;">
            {{ createDialogType === 'file' ? '文件名' : '文件夹名' }}
          </label>
          <input
            v-model="createDialogInput"
            type="text"
            class="create-dialog-input w-full px-3 py-2 rounded border-2 text-sm focus:outline-none transition-colors"
            style="background-color: #0a0a0a; color: #e0e0e0; border-color: #2a2a2a;"
            :placeholder="createDialogType === 'file' ? '例如: main.txt' : '例如: scripts'"
            @keydown="handleDialogKeydown"
            @focus="(e) => (e.target as HTMLInputElement).style.borderColor = '#3a3a3a'"
            @blur="(e) => (e.target as HTMLInputElement).style.borderColor = '#2a2a2a'"
          />
          
          <!-- 错误提示 -->
          <div
            v-if="createDialogError"
            class="mt-2 text-xs px-2 py-1 rounded"
            style="background-color: rgba(239, 68, 68, 0.1); color: #ef4444;"
          >
            {{ createDialogError }}
          </div>
        </div>

        <!-- 对话框按钮 -->
        <div class="px-6 py-4 border-t-2 flex justify-end gap-3" style="border-color: #2a2a2a;">
          <button
            @click="cancelCreateDialog"
            class="px-4 py-2 rounded text-sm transition-colors"
            style="background-color: #2a2a2a; color: #a0a0a0;"
            @mouseenter="(e) => (e.target as HTMLElement).style.backgroundColor = '#3a3a3a'"
            @mouseleave="(e) => (e.target as HTMLElement).style.backgroundColor = '#2a2a2a'"
          >
            取消
          </button>
          <button
            @click="confirmCreate"
            class="px-4 py-2 rounded text-sm transition-colors"
            style="background-color: #3a3a3a; color: #e0e0e0;"
            @mouseenter="(e) => (e.target as HTMLElement).style.backgroundColor = '#4a4a4a'"
            @mouseleave="(e) => (e.target as HTMLElement).style.backgroundColor = '#3a3a3a'"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 行数栏样式 */
.line-numbers {
  scrollbar-width: none; /* Firefox */
  /* 禁用平滑滚动，确保立即同步 */
  scroll-behavior: auto;
}

.line-numbers::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}

.line-number:hover {
  color: #a0a0a0;
  background-color: rgba(255, 255, 255, 0.05);
}

.line-number.current-line {
  color: #e0e0e0;
  background-color: rgba(56, 189, 248, 0.1);
  border-right: 2px solid #38bdf8;
}

/* YAML语法高亮CSS变量 */
:root {
  --yaml-comment: #6a9955;
  --yaml-key: #4fc3f7;
  --yaml-value: #ce9178;
  --yaml-punctuation: #d4d4d4;
}

/* 拖动时的光标样式 */
.cursor-col-resize {
  cursor: col-resize;
}

/* 右键菜单项悬停效果 */
.context-menu-item {
  background-color: transparent;
}

/* 隐藏文件标签栏的滚动条 */
.scroll-smooth::-webkit-scrollbar {
  display: none;
}

.context-menu-item:hover {
  background-color: #3a3a3a;
}

/* 语法高亮编辑器样式 */
.text-transparent {
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.text-transparent::selection {
  background-color: rgba(56, 189, 248, 0.3);
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.caret-white {
  caret-color: #e0e0e0;
}

.highlight-layer {
  overflow: auto;
  scrollbar-width: none; /* Firefox */
  /* 确保字符宽度与textarea完全一致 */
  letter-spacing: 0;
  word-spacing: 0;
  tab-size: 4;
  -moz-tab-size: 4;
  /* 禁用字体连字和特性 */
  font-feature-settings: normal;
  font-variant-ligatures: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* 禁用平滑滚动，确保立即同步 */
  scroll-behavior: auto;
}

.highlight-layer :deep(.line-placeholder) {
  display: inline-block;
  width: 100%;
  height: 1.5em;
}

.highlight-layer::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}

.highlight-layer :deep(code) {
  /* 确保code标签不添加额外的样式 */
  display: block;
  letter-spacing: 0;
  word-spacing: 0;
  font-feature-settings: normal;
  font-variant-ligatures: none;
}

.highlight-layer :deep(.token) {
  /* 确保token不添加额外间距 */
  padding: 0;
  margin: 0;
  border: 0;
}

/* 确保高亮层和编辑器同步滚动 */
textarea {
  background-attachment: local;
  background-image:
    linear-gradient(to right, transparent 0%, transparent 100%);
  /* 确保字符宽度一致 */
  letter-spacing: 0;
  word-spacing: 0;
  tab-size: 4;
  -moz-tab-size: 4;
  /* 禁用字体连字和特性 */
  font-feature-settings: normal;
  font-variant-ligatures: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* 禁用平滑滚动，确保立即同步 */
  scroll-behavior: auto;
}

/* Prism 主题覆盖 - 适配 HOI4 深色主题 */
:deep(.token.comment),
:deep(.token.prolog),
:deep(.token.doctype),
:deep(.token.cdata) {
  color: #6a9955;
}

:deep(.token.punctuation) {
  color: #d4d4d4;
}

:deep(.token.property),
:deep(.token.tag),
:deep(.token.boolean),
:deep(.token.number),
:deep(.token.constant),
:deep(.token.symbol),
:deep(.token.deleted) {
  color: #b5cea8;
}

:deep(.token.selector),
:deep(.token.attr-name),
:deep(.token.string),
:deep(.token.char),
:deep(.token.builtin),
:deep(.token.inserted) {
  color: #ce9178;
}

:deep(.token.operator),
:deep(.token.entity),
:deep(.token.url),
:deep(.language-css .token.string),
:deep(.style .token.string) {
  color: #d4d4d4;
}

:deep(.token.atrule),
:deep(.token.attr-value),
:deep(.token.keyword) {
  color: #c586c0;
}

:deep(.token.function),
:deep(.token.class-name) {
  color: #dcdcaa;
}

:deep(.token.regex),
:deep(.token.important),
:deep(.token.variable) {
  color: #d16969;
}

/* MOD 文件特殊样式 */
:deep(.token.mod-key .token.keyword) {
  color: #4fc3f7; /* 蓝色 */
  font-weight: bold;
}

:deep(.token.mod-key .token.punctuation) {
  color: #d4d4d4;
}

/* HOI4 脚本文件特殊样式 */
:deep(.token.hoi4-key .token.property) {
  color: #4fc3f7; /* 天蓝色 - = 前面的键名 */
}

:deep(.token.hoi4-keyword-purple) {
  color: #c586c0; /* 紫色 - no/yes/true/false/if/limit */
}

:deep(.token.hoi4-value .token.keyword) {
  color: #dcdcaa; /* 黄色 - = 后面的值 */
}

:deep(.token.number) {
  color: #b5cea8; /* 浅绿色 - 数字 */
}

/* 分级括号高亮 */
:deep(.brace-bracket) {
  font-weight: bold;
}

:deep(.brace-depth-1) {
  color: #f97316;
  background: linear-gradient(180deg, #f97316 0%, #fb923c 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

:deep(.brace-depth-2) {
  color: #38bdf8;
  background: linear-gradient(180deg, #38bdf8 0%, #0ea5e9 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

:deep(.brace-depth-3) {
  color: #f472b6;
  background: linear-gradient(180deg, #f472b6 0%, #ec4899 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

:deep(.brace-depth-4) {
  color: #a3e635;
  background: linear-gradient(180deg, #a3e635 0%, #65a30d 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

:deep(.brace-depth-5) {
  color: #9d7bff;
  background: linear-gradient(180deg, #a855f7 0%, #7c3aed 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

:deep(.brace-depth-6) {
  color: #34d399;
  background: linear-gradient(180deg, #34d399 0%, #059669 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.error-line {
  border-bottom: 2px solid #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}
</style>

