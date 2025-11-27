<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import EditorTabs from './EditorTabs.vue'
import CodeMirrorEditor from './CodeMirrorEditor.vue'
import ContextMenu from './ContextMenu.vue'
import EventGraphViewer from './EventGraphViewer.vue'
import FocusTreeViewer from './FocusTreeViewer.vue'
import type { EditorPane } from '../../composables/useEditorGroups'
import { useSyntaxHighlight } from '../../composables/useSyntaxHighlight'
import { collectErrors } from '../../utils/ErrorTip'

const props = defineProps<{
  pane: EditorPane
  isActive: boolean
  projectPath: string
  gameDirectory: string
  isReadOnly: boolean
  disableErrorHandling?: boolean
}>()

const emit = defineEmits<{
  switchFile: [paneId: string, index: number]
  closeFile: [paneId: string, index: number]
  contextMenu: [event: MouseEvent, paneId: string, index: number]
  contentChange: [paneId: string, content: string]
  cursorChange: [paneId: string, line: number, column: number]
  saveFile: [paneId: string]
  activate: [paneId: string]
  splitPane: [paneId: string, fileIndex?: number]
  errorsChange: [paneId: string, errors: Array<{line: number, msg: string, type: string}>]
  editorContextMenuAction: [action: string, paneId: string]
  previewEvent: [paneId: string]
  previewFocus: [paneId: string]
}>()

const editorRef = ref<InstanceType<typeof CodeMirrorEditor> | null>(null)
const fileContent = ref('')
const currentLine = ref(1)
const currentColumn = ref(1)
const hasUnsavedChanges = ref(false)
const txtErrors = ref<{line: number, msg: string, type: string}[]>([])
const isLoadingFile = ref(false)  // 标记是否正在加载文件

// 编辑器右键菜单状态
const editorContextMenuVisible = ref(false)
const editorContextMenuX = ref(0)
const editorContextMenuY = ref(0)

const { highlightCode, getLanguage } = useSyntaxHighlight()

// 当前活动文件
const currentFile = computed(() => {
  if (props.pane.activeFileIndex >= 0 && props.pane.openFiles[props.pane.activeFileIndex]) {
    return props.pane.openFiles[props.pane.activeFileIndex]
  }
  return null
})

// 当前文件是否为图片
const isCurrentFileImage = computed(() => {
  return currentFile.value?.isImage === true
})

// 当前文件是否为事件关系图
const isCurrentFileEventGraph = computed(() => {
  return currentFile.value?.isEventGraph === true
})

// 当前文件是否为事件文件（路径包含 /events/）
const isEventFile = computed(() => {
  if (!currentFile.value?.node.path) return false
  const normalizedPath = currentFile.value.node.path.replace(/\\/g, '/')
  return normalizedPath.includes('/events/') && !isCurrentFileImage.value && !isCurrentFileEventGraph.value
})

// 当前文件是否为国策树预览
const isCurrentFileFocusTree = computed(() => {
  return currentFile.value?.isFocusTree === true
})

// 当前文件是否为国策文件（路径包含 /common/national_focus/）
const isFocusFile = computed(() => {
  if (!currentFile.value?.node.path) return false
  const normalizedPath = currentFile.value.node.path.replace(/\\/g, '/')
  return (normalizedPath.includes('/common/national_focus/') || 
          normalizedPath.includes('\\common\\national_focus\\')) &&
         !isCurrentFileImage.value && 
         !isCurrentFileEventGraph.value &&
         !isCurrentFileFocusTree.value
})

// 图片 URL (使用 base64 数据)
const imageUrl = computed(() => {
  if (isCurrentFileImage.value && currentFile.value && currentFile.value.content) {
    // content 存储的是 base64 字符串，需要添加 data URI 前缀
    const ext = currentFile.value.node.name.split('.').pop()?.toLowerCase() || ''
    let mimeType = 'image/png'
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        mimeType = 'image/jpeg'
        break
      case 'gif':
        mimeType = 'image/gif'
        break
      case 'bmp':
        mimeType = 'image/bmp'
        break
      case 'webp':
        mimeType = 'image/webp'
        break
      case 'tga':
        mimeType = 'image/x-tga'
        break
    }
    return `data:${mimeType};base64,${currentFile.value.content}`
  }
  return ''
})

// 监听活动文件变化
watch(currentFile, (file) => {
  if (file) {
    // 标记正在加载文件，避免触发 hasUnsavedChanges
    isLoadingFile.value = true
    fileContent.value = file.content
    hasUnsavedChanges.value = file.hasUnsavedChanges
    currentLine.value = file.cursorLine
    currentColumn.value = file.cursorColumn
    
    nextTick(() => {
      if (file.node) {
          const language = getLanguage(file.node.name)
          if (language === 'hoi4') {
            txtErrors.value = collectErrors(fileContent.value, { 
              filePath: file.node.path, 
              projectRoot: props.projectPath, 
              gameDirectory: props.gameDirectory,
              disableErrorHandling: props.disableErrorHandling
            })
          } else {
            txtErrors.value = []
          }
          highlightCode(fileContent.value, file.node.name, txtErrors.value)
          // 触发错误变化事件
          emit('errorsChange', props.pane.id, txtErrors.value)
        }
      // 文件加载完成，可以开始追踪修改
      isLoadingFile.value = false
    })
  } else {
    isLoadingFile.value = true
    fileContent.value = ''
    hasUnsavedChanges.value = false
    txtErrors.value = []
    // 触发错误变化事件（清空错误）
    emit('errorsChange', props.pane.id, [])
    nextTick(() => {
      isLoadingFile.value = false
    })
  }
}, { immediate: true })

// 监听当前文件内容变化（用于预览文件同步更新）
watch(() => currentFile.value?.content, (newContent, oldContent) => {
  if (currentFile.value && newContent !== oldContent && newContent !== fileContent.value) {
    console.log(`[EditorPane] 检测到文件内容变化，更新内容: ${currentFile.value.node.name}`)
    if (newContent !== undefined) {
      fileContent.value = newContent
    }
    hasUnsavedChanges.value = currentFile.value.hasUnsavedChanges
    
    // 如果是预览文件，重新高亮和解析错误
    if (currentFile.value.node) {
      const language = getLanguage(currentFile.value.node.name)
      if (language === 'hoi4') {
        txtErrors.value = collectErrors(fileContent.value, { 
          filePath: currentFile.value.node.path, 
          projectRoot: props.projectPath, 
          gameDirectory: props.gameDirectory,
          disableErrorHandling: props.disableErrorHandling
        })
      }
      highlightCode(fileContent.value, currentFile.value.node.name, txtErrors.value)
      // 触发错误变化事件
      emit('errorsChange', props.pane.id, txtErrors.value)
    }
  }
})

function handleSwitchFile(index: number) {
  emit('switchFile', props.pane.id, index)
}

function handleCloseFile(index: number) {
  emit('closeFile', props.pane.id, index)
}

function handleContextMenu(event: MouseEvent, index: number) {
  emit('contextMenu', event, props.pane.id, index)
}

function handleContentChange(content: string) {
  fileContent.value = content
  // 只有在不是加载文件时才标记为已修改和触发事件
  if (!isLoadingFile.value) {
    hasUnsavedChanges.value = true
    emit('contentChange', props.pane.id, content)
  }
  
  if (currentFile.value?.node) {
    const language = getLanguage(currentFile.value.node.name)
    if (language === 'hoi4') {
      txtErrors.value = collectErrors(content, { 
        filePath: currentFile.value.node.path, 
        projectRoot: props.projectPath, 
        gameDirectory: props.gameDirectory,
        disableErrorHandling: props.disableErrorHandling
      })
      // 触发错误变化事件
      emit('errorsChange', props.pane.id, txtErrors.value)
    }
    highlightCode(content, currentFile.value.node.name, txtErrors.value)
  }
}

function handleCursorChange(line: number, column: number) {
  currentLine.value = line
  currentColumn.value = column
  emit('cursorChange', props.pane.id, line, column)
}

function handleSaveFile() {
  emit('saveFile', props.pane.id)
}

function handleActivate() {
  emit('activate', props.pane.id)
}

function handleSplitPane() {
  emit('splitPane', props.pane.id, props.pane.activeFileIndex)
}

function handlePreviewEvent() {
  emit('previewEvent', props.pane.id)
}

function handlePreviewFocus() {
  emit('previewFocus', props.pane.id)
}

function handleJumpToEvent(eventId: string, line: number) {
  console.log('Jump to event:', eventId, 'at line:', line)
  // 这里可以跳转到源文件的对应位置
  jumpToLine(line)
}

function handleJumpToFocus(focusId: string, line: number) {
  console.log('Jump to focus:', focusId, 'at line:', line)
  jumpToLine(line)
}

/**
 * 跳转到指定行并高亮显示
 */
function jumpToLine(line: number) {
  console.log('[EditorPane] jumpToLine called with line:', line)
  console.log('[EditorPane] editorRef.value:', editorRef.value)
  
  // 通过 getEditorView() 方法获取 editorView
  const view = (editorRef.value as any)?.getEditorView?.()
  if (!view) {
    console.warn('[EditorPane] Editor view not available')
    return
  }
  
  console.log('[EditorPane] Got editor view, doc lines:', view.state.doc.lines)
  const doc = view.state.doc
  
  // 确保行号在有效范围内
  const targetLine = Math.max(1, Math.min(line, doc.lines))
  console.log('[EditorPane] Target line (clamped):', targetLine)
  
  const lineInfo = doc.line(targetLine)
  console.log('[EditorPane] Line info:', { from: lineInfo.from, to: lineInfo.to })
  
  // 滚动到该行并设置光标位置
  view.dispatch({
    selection: { anchor: lineInfo.from, head: lineInfo.to },
    scrollIntoView: true
  })
  
  console.log('[EditorPane] Dispatched selection and scroll')
  
  // 确保编辑器获得焦点
  view.focus()
  console.log('[EditorPane] Focused editor')
}

// 处理编辑器右键菜单
function handleEditorContextMenu(event: MouseEvent) {
  const menuWidth = 200  // 菜单宽度
  const menuHeight = 250 // 菜单高度（估计值）
  
  let x = event.clientX
  let y = event.clientY
  
  // 检查右侧边界
  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 10
  }
  
  // 检查底部边界
  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - 10
  }
  
  // 确保不会超出左侧和顶部
  x = Math.max(10, x)
  y = Math.max(10, y)
  
  editorContextMenuX.value = x
  editorContextMenuY.value = y
  editorContextMenuVisible.value = true
}

// 关闭编辑器右键菜单
function closeEditorContextMenu() {
  editorContextMenuVisible.value = false
}

// 处理编辑器右键菜单操作
function handleEditorContextMenuAction(action: string) {
  closeEditorContextMenu()
  emit('editorContextMenuAction', action, props.pane.id)
}

// 获取编辑器实例的方法
function getEditorMethods() {
  return editorRef.value
}

// 暴露方法供父组件调用
defineExpose({
  jumpToLine,
  getEditorMethods
})
</script>

<template>
  <div 
    class="h-full flex flex-col bg-hoi4-gray/70 border border-hoi4-border/60 rounded-2xl shadow-lg overflow-hidden transition-all duration-200"
    :class="{ 'ring-2 ring-hoi4-selected/80 shadow-xl': isActive }"
    @click="handleActivate"
  >
    <!-- 文件标签栏 -->
    <div v-if="pane.openFiles.length > 0" class="bg-hoi4-gray/80 border-b border-hoi4-border/60 backdrop-blur-sm">
      <EditorTabs
        :open-files="pane.openFiles"
        :active-file-index="pane.activeFileIndex"
        @switch-file="handleSwitchFile"
        @close-file="handleCloseFile"
        @context-menu="handleContextMenu"
      />
      
      <!-- 编辑器工具栏 -->
      <div class="px-4 py-2 flex items-center justify-between bg-hoi4-accent/70 border-t border-hoi4-border/40 backdrop-blur-sm">
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
          
          <button
            v-if="pane.openFiles.length > 0"
            @click="handleSplitPane"
            class="px-3 py-1 bg-hoi4-gray hover:bg-hoi4-border rounded text-hoi4-text text-xs transition-colors flex items-center space-x-1"
            title="向右分割"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4v16m6-16v16"></path>
            </svg>
            <span>分割</span>
          </button>
          
          <button
            v-if="isEventFile"
            @click="handlePreviewEvent"
            class="px-3 py-1 bg-hoi4-gray hover:bg-hoi4-border rounded text-hoi4-text text-xs transition-colors flex items-center space-x-1"
            title="预览事件关系图"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <span>预览</span>
          </button>
          
          <button
            v-if="isFocusFile"
            @click="handlePreviewFocus"
            class="px-3 py-1 bg-hoi4-gray hover:bg-hoi4-border rounded text-hoi4-text text-xs transition-colors flex items-center space-x-1"
            title="预览国策树"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
            </svg>
            <span>预览</span>
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

    <!-- 编辑器 / 图片预览 / 事件关系图预览 -->
    <div v-if="currentFile" class="flex-1 overflow-hidden relative">
      <!-- 图片预览 -->
      <div v-if="isCurrentFileImage" class="w-full h-full overflow-auto bg-hoi4-gray/50 flex items-center justify-center p-4">
        <div class="max-w-full max-h-full flex flex-col items-center gap-4">
          <div class="bg-hoi4-border/20 p-4 rounded-lg">
            <img 
              :src="imageUrl" 
              :alt="currentFile.node.name"
              class="max-w-full max-h-[calc(100vh-300px)] object-contain rounded shadow-lg"
              @error="(e) => { (e.target as HTMLImageElement).src = '' }"
            />
          </div>
          <div class="bg-hoi4-border/20 p-3 rounded-lg">
            <div class="text-hoi4-text text-sm space-y-1">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-hoi4-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span class="font-semibold">{{ currentFile.node.name }}</span>
              </div>
              <div class="text-hoi4-comment text-xs font-mono">
                {{ currentFile.node.path }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 事件关系图预览 -->
      <EventGraphViewer
        v-else-if="isCurrentFileEventGraph"
        :content="currentFile.content"
        :file-path="currentFile.node.path"
        @jump-to-event="handleJumpToEvent"
      />
      
      <!-- 国策树预览 -->
      <FocusTreeViewer
        v-else-if="isCurrentFileFocusTree"
        :content="currentFile.content"
        :file-path="currentFile.node.path"
        :game-directory="gameDirectory"
        :project-path="projectPath"
        @jump-to-focus="handleJumpToFocus"
      />
      
      <!-- 代码编辑器 -->
      <CodeMirrorEditor
        v-else
        ref="editorRef"
        :content="fileContent"
        :is-read-only="isReadOnly"
        :file-name="currentFile.node.name"
        :file-path="currentFile.node.path"
        :project-root="projectPath"
        :game-directory="gameDirectory"
        @update:content="handleContentChange"
        @cursor-change="handleCursorChange"
        @contextmenu="handleEditorContextMenu"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <h2 class="text-hoi4-text text-xl font-bold mb-2">编辑器窗格</h2>
        <p class="text-hoi4-text-dim text-sm">点击左侧文件树中的文件进行编辑</p>
      </div>
    </div>

    <!-- 编辑器右键菜单 -->
    <ContextMenu
      :visible="editorContextMenuVisible"
      :x="editorContextMenuX"
      :y="editorContextMenuY"
      menu-type="editor"
      :current-file-path="currentFile?.node.path"
      @action="handleEditorContextMenuAction"
      @close="closeEditorContextMenu"
    />
  </div>
  
  <!-- 全局点击关闭菜单 -->
  <Teleport to="body">
    <div
      v-if="editorContextMenuVisible"
      class="fixed inset-0 z-40"
      @click="closeEditorContextMenu"
      @contextmenu.prevent="closeEditorContextMenu"
    ></div>
  </Teleport>
</template>

<style scoped>
</style>
