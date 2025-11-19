<script setup lang="ts">
import { ref } from 'vue'
import EditorPane from './EditorPane.vue'
import { useEditorGroups } from '../../composables/useEditorGroups'
import type { FileNode } from '../../composables/useFileManager'

const props = defineProps<{
  projectPath: string
  gameDirectory: string
}>()

const emit = defineEmits<{
  contextMenu: [event: MouseEvent, paneId: string, fileIndex: number]
  openFile: [node: FileNode, paneId?: string]
  errorsChange: [paneId: string, errors: Array<{line: number, msg: string, type: string}>]
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
function handleCloseFile(paneId: string, index: number) {
  const pane = panes.value.find(p => p.id === paneId)
  if (!pane) return
  
  const file = pane.openFiles[index]
  
  // 检查未保存更改
  if (file.hasUnsavedChanges) {
    if (!confirm(`文件 "${file.node.name}" 有未保存的更改，是否放弃更改？`)) {
      return
    }
  }
  
  // 从列表中移除
  pane.openFiles.splice(index, 1)
  
  // 调整活动文件索引
  if (pane.openFiles.length === 0) {
    pane.activeFileIndex = -1
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

// 暴露方法供父组件使用
defineExpose({
  panes,
  activePaneId,
  activePane,
  openFileInPane,
  splitPane,
  closePane
})
</script>

<template>
  <div class="editor-group-container flex-1 flex overflow-hidden">
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
          :pane="pane"
          :is-active="pane.id === activePaneId"
          :project-path="projectPath"
          :game-directory="gameDirectory"
          :is-read-only="isPaneReadOnly(pane.id)"
          @switch-file="handleSwitchFile"
          @close-file="handleCloseFile"
          @context-menu="handleContextMenu"
          @content-change="handleContentChange"
          @cursor-change="handleCursorChange"
          @save-file="handleSaveFile"
          @activate="handleActivate"
          @split-pane="handleSplitPane"
          @errors-change="handleErrorsChange"
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