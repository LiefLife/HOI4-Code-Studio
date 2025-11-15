<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import EditorTabs from './EditorTabs.vue'
import CodeMirrorEditor from './CodeMirrorEditor.vue'
import type { EditorPane } from '../../composables/useEditorGroups'
import type { FileNode } from '../../composables/useFileManager'
import { useSyntaxHighlight } from '../../composables/useSyntaxHighlight'
import { collectErrors } from '../../utils/ErrorTip'

const props = defineProps<{
  pane: EditorPane
  isActive: boolean
  projectPath: string
  gameDirectory: string
  isReadOnly: boolean
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
}>()

const editorRef = ref<InstanceType<typeof CodeMirrorEditor> | null>(null)
const fileContent = ref('')
const currentLine = ref(1)
const currentColumn = ref(1)
const hasUnsavedChanges = ref(false)
const txtErrors = ref<{line: number, msg: string, type: string}[]>([])

const { highlightCode, getLanguage } = useSyntaxHighlight()

// 当前活动文件
const currentFile = computed(() => {
  if (props.pane.activeFileIndex >= 0 && props.pane.openFiles[props.pane.activeFileIndex]) {
    return props.pane.openFiles[props.pane.activeFileIndex]
  }
  return null
})

// 监听活动文件变化
watch(currentFile, (file) => {
  if (file) {
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
            gameDirectory: props.gameDirectory 
          })
        } else {
          txtErrors.value = []
        }
        highlightCode(fileContent.value, file.node.name, txtErrors.value)
      }
    })
  } else {
    fileContent.value = ''
    hasUnsavedChanges.value = false
    txtErrors.value = []
  }
}, { immediate: true })

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
  hasUnsavedChanges.value = true
  emit('contentChange', props.pane.id, content)
  
  if (currentFile.value?.node) {
    const language = getLanguage(currentFile.value.node.name)
    if (language === 'hoi4') {
      txtErrors.value = collectErrors(content, { 
        filePath: currentFile.value.node.path, 
        projectRoot: props.projectPath, 
        gameDirectory: props.gameDirectory 
      })
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
</script>

<template>
  <div 
    class="h-full flex flex-col bg-hoi4-dark border-r-2 border-hoi4-border overflow-hidden"
    :class="{ 'ring-2 ring-hoi4-accent': isActive }"
    @click="handleActivate"
  >
    <!-- 文件标签栏 -->
    <div v-if="pane.openFiles.length > 0" class="bg-hoi4-gray border-b-2 border-hoi4-border">
      <EditorTabs
        :open-files="pane.openFiles"
        :active-file-index="pane.activeFileIndex"
        @switch-file="handleSwitchFile"
        @close-file="handleCloseFile"
        @context-menu="handleContextMenu"
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
        :file-name="currentFile.node.name"
        :file-path="currentFile.node.path"
        :project-root="projectPath"
        :game-directory="gameDirectory"
        @update:content="handleContentChange"
        @cursor-change="handleCursorChange"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <h2 class="text-hoi4-text text-xl font-bold mb-2">编辑器窗格</h2>
        <p class="text-hoi4-text-dim text-sm">点击左侧文件树中的文件进行编辑</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
