<script setup lang="ts">
defineProps<{
  projectName?: string
  rightPanelExpanded: boolean
}>()

const emit = defineEmits<{
  goBack: []
  toggleRightPanel: []
}>()
</script>

<template>
  <div class="flex items-center justify-between px-4 py-2 bg-hoi4-gray border-b-2 border-hoi4-border">
    <div class="flex items-center space-x-4">
      <button
        @click="emit('goBack')"
        class="flex items-center space-x-2 px-3 py-1 bg-hoi4-accent hover:bg-hoi4-border rounded transition-colors"
      >
        <svg class="w-4 h-4 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        <span class="text-hoi4-text text-sm">返回</span>
      </button>
      <h1 class="text-hoi4-text font-bold text-lg">{{ projectName || '项目编辑器' }}</h1>
    </div>
    
    <button
      @click="emit('toggleRightPanel')"
      class="flex items-center space-x-2 px-3 py-1 bg-hoi4-accent hover:bg-hoi4-border rounded transition-colors"
    >
      <svg class="w-4 h-4 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span class="text-hoi4-text text-sm">{{ rightPanelExpanded ? '隐藏' : '显示' }}侧边栏</span>
    </button>
  </div>
</template>
