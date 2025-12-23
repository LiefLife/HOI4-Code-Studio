<script setup lang="ts">
import { ref } from 'vue'

interface OpenFile {
  node: {
    name: string
    path: string
  }
  hasUnsavedChanges: boolean
}

defineProps<{
  openFiles: OpenFile[]
  activeFileIndex: number
}>()

const emit = defineEmits<{
  switchFile: [index: number]
  closeFile: [index: number]
  contextMenu: [event: MouseEvent, index: number]
}>()

const fileTabsRef = ref<HTMLElement | null>(null)

// 处理文件标签栏的滚轮事件
function handleTabsWheel(event: WheelEvent) {
  if (!fileTabsRef.value) return
  
  // 阻止默认的垂直滚动
  event.preventDefault()
  
  // 将垂直滚动转换为水平滚动
  fileTabsRef.value.scrollLeft += event.deltaY
}
</script>

<template>
  <div 
    v-if="openFiles.length > 0" 
    ref="fileTabsRef"
    @wheel="handleTabsWheel"
    class="flex items-center space-x-2 px-2 py-1 overflow-x-auto scroll-smooth"
    style="scrollbar-width: none; -ms-overflow-style: none;"
  >
    <div
      v-for="(file, index) in openFiles"
      :key="file.node.path"
      @click="emit('switchFile', index)"
      @contextmenu.prevent="emit('contextMenu', $event, index)"
      class="flex items-center px-3 py-1 rounded-xl cursor-pointer transition-all duration-150 whitespace-nowrap ui-surface-2 hover:bg-hoi4-accent/70 shadow-sm"
      :class="{ 'bg-hoi4-accent/90 shadow-md': index === activeFileIndex }"
    >
      <span class="text-hoi4-text text-sm whitespace-nowrap">{{ file.node.name }}</span>
      <span v-if="file.hasUnsavedChanges" class="text-red-400 text-xs ml-1">●</span>
      <button
        @click.stop="emit('closeFile', index)"
        class="text-hoi4-text-dim hover:text-hoi4-text transition-colors ml-2"
        title="关闭"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.scroll-smooth::-webkit-scrollbar {
  display: none;
}
</style>
