<script setup lang="ts">
defineProps<{
  projectName?: string
  rightPanelExpanded: boolean
  isLaunchingGame?: boolean
}>()

const emit = defineEmits<{
  goBack: []
  toggleRightPanel: []
  launchGame: []
}>()
</script>

<template>
  <div class="flex items-center justify-between px-4 py-2 bg-hoi4-gray/90 border-b border-hoi4-border/60 shadow-md backdrop-blur-sm">
    <div class="flex items-center space-x-4">
      <button
        @click="emit('goBack')"
        class="p-2 bg-hoi4-accent/80 hover:bg-hoi4-border/80 active:scale-95 rounded-full transition-all shadow-sm"
        title="返回主页"
      >
        <svg class="w-5 h-5 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
      </button>
      <h1 class="text-hoi4-text font-bold text-lg">{{ projectName || '项目编辑器' }}</h1>
    </div>
    
    <div class="flex items-center space-x-2">
      <button
        @click="emit('launchGame')"
        :disabled="isLaunchingGame"
        class="p-2 bg-hoi4-accent/80 hover:bg-hoi4-border/80 active:scale-95 active:bg-hoi4-border rounded-full transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        :title="isLaunchingGame ? '启动中...' : '启动游戏'"
      >
        <svg 
          class="w-5 h-5 text-hoi4-text" 
          :class="{ 'animate-spin': isLaunchingGame }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path v-if="!isLaunchingGame" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
          <path v-if="!isLaunchingGame" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          <path v-if="isLaunchingGame" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
      </button>
      <button
        @click="emit('toggleRightPanel')"
        class="p-2 bg-hoi4-accent/80 hover:bg-hoi4-border/80 active:scale-95 rounded-full transition-all shadow-sm"
        :title="rightPanelExpanded ? '隐藏侧边栏' : '显示侧边栏'"
      >
        <svg v-if="rightPanelExpanded" class="w-5 h-5 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
        </svg>
        <svg v-else class="w-5 h-5 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
        </svg>
      </button>
    </div>
  </div>
</template>
