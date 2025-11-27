<script setup lang="ts">
import { ref } from 'vue'
import EditorPane from './EditorPane.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { useEditorGroups } from '../../composables/useEditorGroups'
import type { FileNode } from '../../composables/useFileManager'

const props = defineProps<{
  projectPath: string
  gameDirectory: string
  autoSave?: boolean
  disableErrorHandling?: boolean
}>()

const emit = defineEmits<{
  contextMenu: [event: MouseEvent, paneId: string, fileIndex: number]
  openFile: [node: FileNode, paneId?: string]
  errorsChange: [paneId: string, errors: Array<{line: number, msg: string, type: string}>]
  editorContextMenuAction: [action: string, paneId: string]
  previewEvent: [paneId: string]
  previewFocus: [paneId: string]
  contentChange: [paneId: string, content: string]
}>()

const {
  panes,
  activePaneId,
  activePane,
  splitPane,
  closePane,
  setActivePane
} = useEditorGroups()

const resizingPaneIndex = ref<number | null>(null)
const resizeStartX = ref(0)
const resizeStartWidths = ref<number[]>([])

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

// EditorPane 引用 Map
const paneRefs = ref<Map<string, InstanceType<typeof EditorPane>>>(new Map())

// 自动保存防抖计时器
const autoSaveTimers = ref<Map<string, number>>(new Map())
const AUTO_SAVE_DELAY = 100 // 0.1秒防抖

// 计算每个窗格是否只读
function isPaneReadOnly(paneId: string): boolean {
  const pane = panes.value.find(p => p.id === paneId)
  if (!pane || pane.activeFileIndex === -1) return false
  
  const file = pane.openFiles[pane.activeFileIndex]
  if (!file) return false
  
  return !!props.gameDirectory && file.node.path.startsWith(props.gameDirectory)
}

// 处理文件切换
function handleSwitchFile(paneId: string, index: number) {
  const pane = panes.value.find(p => p.id === paneId)
  if (!pane) return
  
  pane.activeFileIndex = index
  setActivePane(paneId)
}

// 处理文件关闭
async function handleCloseFile(paneId: string, index: number) {
  const pane = panes.value.find(p => p.id === paneId)
  if (!pane) return
  
  const file = pane.openFiles[index]
  
  // 检查未保存更改
  if (file.hasUnsavedChanges) {
    const confirmed = await showConfirmDialog(
      `文件 "${file.node.name}" 有未保存的更改，是否放弃更改？`,
      '⚠️ 未保存的更改',
      'warning'
    )
    if (!confirmed) {
      return
    }
  }
  
  // 从列表中移除
  pane.openFiles.splice(index, 1)
  
  // 调整活动文件索引
  if (pane.openFiles.length === 0) {
    pane.activeFileIndex = -1
    
    // 如果窗格为空且有多个窗格，自动删除该窗格（至少保留一个窗格）
    if (panes.value.length > 1) {
      // 延迟一下执行，确保 UI 更新
      setTimeout(() => {
        closePane(paneId)
      }, 100)
    }
  } else if (index === pane.activeFileIndex) {
    pane.activeFileIndex = Math.min(index, pane.openFiles.length - 1)
  } else if (index < pane.activeFileIndex) {
    pane.activeFileIndex--
  }
}

// 处理右键菜单
function handleContextMenu(event: MouseEvent, paneId: string, index: number) {
  emit('contextMenu', event, paneId, index)
}

// 处理内容变化
function handleContentChange(paneId: string, content: string) {
  const pane = panes.value.find(p => p.id === paneId)
  if (!pane || pane.activeFileIndex === -1) return
  
  const file = pane.openFiles[pane.activeFileIndex]
  if (file) {
    // 只有内容真的改变时才标记为已修改
    if (file.content !== content) {
      file.content = content
      file.hasUnsavedChanges = true
      
      // 发射内容变化事件，让父组件可以同步预览文件
      emit('contentChange', paneId, content)
      
      // 如果启用了自动保存，设置防抖计时器
      if (props.autoSave) {
        // 清除旧的计时器
        const existingTimer = autoSaveTimers.value.get(paneId)
        if (existingTimer) {
          clearTimeout(existingTimer)
        }
        
        // 设置新的计时器
        const timer = window.setTimeout(() => {
          handleSaveFile(paneId)
          autoSaveTimers.value.delete(paneId)
        }, AUTO_SAVE_DELAY)
        
        autoSaveTimers.value.set(paneId, timer)
      }
    }
  }
}

// 处理光标变化
function handleCursorChange(paneId: string, line: number, column: number) {
  const pane = panes.value.find(p => p.id === paneId)
  if (!pane || pane.activeFileIndex === -1) return
  
  const file = pane.openFiles[pane.activeFileIndex]
  if (file) {
    file.cursorLine = line
    file.cursorColumn = column
  }
}

// 处理保存文件
async function handleSaveFile(paneId: string) {
  const pane = panes.value.find(p => p.id === paneId)
  if (!pane || pane.activeFileIndex === -1) return
  
  const file = pane.openFiles[pane.activeFileIndex]
  if (!file || !file.hasUnsavedChanges) return
  
  try {
    const { writeFileContent } = await import('../../api/tauri')
    const result = await writeFileContent(file.node.path, file.content)
    if (result.success) {
      file.hasUnsavedChanges = false
    } else {
      alert(`保存失败: ${result.message}`)
    }
  } catch (error) {
    console.error('保存文件失败:', error)
    alert(`保存失败: ${error}`)
  }
}

// 处理窗格激活
function handleActivate(paneId: string) {
  setActivePane(paneId)
}

// 处理分割窗格
function handleSplitPane(paneId: string, fileIndex?: number) {
  splitPane(paneId, fileIndex)
}

// 处理错误变化
function handleErrorsChange(paneId: string, errors: Array<{line: number, msg: string, type: string}>) {
  emit('errorsChange', paneId, errors)
}

// 处理编辑器右键菜单操作
function handleEditorContextMenuAction(action: string, paneId: string) {
  emit('editorContextMenuAction', action, paneId)
}

// 处理预览事件
function handlePreviewEvent(paneId: string) {
  emit('previewEvent', paneId)
}

// 处理预览国策树
function handlePreviewFocus(paneId: string) {
  emit('previewFocus', paneId)
}

// 处理关闭窗格
function handleClosePane(paneId: string) {
  closePane(paneId)
}

// 开始调整窗格大小
function startResize(index: number, event: MouseEvent) {
  if (index >= panes.value.length - 1) return
  
  resizingPaneIndex.value = index
  resizeStartX.value = event.clientX
  resizeStartWidths.value = panes.value.map(p => p.width)
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  event.preventDefault()
}

// 调整窗格大小
function handleResize(event: MouseEvent) {
  if (resizingPaneIndex.value === null) return
  
  const containerWidth = document.querySelector('.editor-group-container')?.clientWidth || 1000
  const deltaX = event.clientX - resizeStartX.value
  const deltaPercent = (deltaX / containerWidth) * 100
  
  const index = resizingPaneIndex.value
  const newWidth1 = Math.max(10, Math.min(90, resizeStartWidths.value[index] + deltaPercent))
  const newWidth2 = Math.max(10, Math.min(90, resizeStartWidths.value[index + 1] - deltaPercent))
  
  // 确保总宽度不变
  if (newWidth1 >= 10 && newWidth2 >= 10) {
    panes.value[index].width = newWidth1
    panes.value[index + 1].width = newWidth2
  }
}

// 停止调整大小
function stopResize() {
  resizingPaneIndex.value = null
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// 打开文件到指定窗格
function openFileInPane(node: FileNode, paneId?: string) {
  const targetPaneId = paneId || activePaneId.value
  const pane = panes.value.find(p => p.id === targetPaneId)
  if (!pane) return
  
  emit('openFile', node, targetPaneId)
}

/**
 * 设置 EditorPane 引用
 */
function setPaneRef(paneId: string, el: any) {
  if (el) {
    paneRefs.value.set(paneId, el)
  } else {
    paneRefs.value.delete(paneId)
  }
}

/**
 * 跳转到错误行（在当前活动的 Pane 中）
 */
function jumpToErrorLine(line: number) {
  console.log('[EditorGroup] jumpToErrorLine called with line:', line)
  console.log('[EditorGroup] activePaneId:', activePaneId.value)
  console.log('[EditorGroup] paneRefs size:', paneRefs.value.size)
  console.log('[EditorGroup] paneRefs keys:', Array.from(paneRefs.value.keys()))
  
  if (!activePaneId.value) {
    console.warn('[EditorGroup] No active pane')
    return
  }
  
  const paneRef = paneRefs.value.get(activePaneId.value)
  if (!paneRef) {
    console.warn('[EditorGroup] Active pane ref not found for id:', activePaneId.value)
    return
  }
  
  console.log('[EditorGroup] Calling jumpToLine on pane')
  paneRef.jumpToLine(line)
}

/**
 * 保存当前活动窗格的文件
 */
async function saveCurrentFile(): Promise<boolean> {
  if (!activePaneId.value) return false
  
  const pane = panes.value.find(p => p.id === activePaneId.value)
  if (!pane || pane.activeFileIndex === -1) return false
  
  const file = pane.openFiles[pane.activeFileIndex]
  if (!file || !file.hasUnsavedChanges) return false
  
  await handleSaveFile(activePaneId.value)
  return true
}

// 暴露方法供父组件使用
defineExpose({
  panes,
  activePaneId,
  activePane,
  openFileInPane,
  splitPane,
  closePane,
  setActivePane,
  jumpToErrorLine,
  saveCurrentFile,
  paneRefs
})
</script>

<template>
  <div class="editor-group-container flex-1 flex overflow-hidden">
    <!-- 确认对话框 -->
    <ConfirmDialog
      :visible="confirmDialogVisible"
      :title="confirmDialogTitle"
      :message="confirmDialogMessage"
      :type="confirmDialogType"
      @confirm="handleConfirmDialogConfirm"
      @cancel="handleConfirmDialogCancel"
    />
    <template v-for="(pane, index) in panes" :key="pane.id">
      <!-- 编辑器窗格 -->
      <div 
        class="editor-pane-wrapper relative px-1 py-1"
        :style="{ width: pane.width + '%' }"
      >
        <!-- 关闭按钮（当有多个窗格时显示） -->
        <button
          v-if="panes.length > 1"
          @click="handleClosePane(pane.id)"
          class="absolute top-2 right-2 z-10 p-1 bg-hoi4-gray hover:bg-red-600 rounded text-hoi4-text transition-colors"
          title="关闭窗格"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        
        <EditorPane
          :ref="(el) => setPaneRef(pane.id, el)"
          :pane="pane"
          :is-active="pane.id === activePaneId"
          :project-path="projectPath"
          :game-directory="gameDirectory"
          :is-read-only="isPaneReadOnly(pane.id)"
          :disable-error-handling="props.disableErrorHandling"
          @switch-file="handleSwitchFile"
          @close-file="handleCloseFile"
          @context-menu="handleContextMenu"
          @content-change="handleContentChange"
          @cursor-change="handleCursorChange"
          @save-file="handleSaveFile"
          @activate="handleActivate"
          @split-pane="handleSplitPane"
          @errors-change="handleErrorsChange"
          @editor-context-menu-action="handleEditorContextMenuAction"
          @preview-event="handlePreviewEvent"
          @preview-focus="handlePreviewFocus"
        />
      </div>
      
      <!-- 拖动分隔条 -->
      <div
        v-if="index < panes.length - 1"
        class="w-1 bg-hoi4-border/60 hover:bg-hoi4-accent/80 cursor-col-resize flex-shrink-0 transition-colors"
        @mousedown="startResize(index, $event)"
      ></div>
    </template>
  </div>
</template>

<style scoped>
.cursor-col-resize {
  cursor: col-resize;
}

.editor-pane-wrapper {
  min-width: 10%;
  max-width: 100%;
}
</style>