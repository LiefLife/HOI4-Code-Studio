<script setup lang="ts">
import { ref } from 'vue'
import ProjectInfo from './ProjectInfo.vue'
import GameDirectory from './GameDirectory.vue'
import ErrorList from './ErrorList.vue'
import type { FileNode } from '../../composables/useFileManager'

defineProps<{
  projectInfo: any
  gameDirectory: string
  gameFileTree: FileNode[]
  isLoadingGameTree: boolean
  txtErrors: Array<{line: number, msg: string, type: string}>
  width: number
}>()

const emit = defineEmits<{
  close: []
  resize: [event: MouseEvent]
  jumpToError: [error: {line: number, msg: string, type: string}]
  toggleGameFolder: [node: FileNode]
  openFile: [node: FileNode]
}>()

const activeTab = ref<'info' | 'game' | 'errors'>('info')
</script>

<template>
  <div
    class="bg-hoi4-gray/80 border border-hoi4-border/60 flex-shrink-0 overflow-hidden flex flex-col shadow-lg rounded-2xl my-2 mr-2"
    :style="{ width: width + 'px' }"
  >
    <!-- 标签栏 -->
    <div class="bg-hoi4-gray/90 border-b border-hoi4-border/60 flex items-center justify-between backdrop-blur-sm rounded-t-2xl">
      <div class="flex gap-1 p-1">
        <button
          @click="activeTab = 'info'"
          class="p-2 transition-all rounded-lg"
          :class="activeTab === 'info' ? 'bg-hoi4-accent text-hoi4-text shadow-md' : 'text-hoi4-text-dim hover:text-hoi4-text hover:bg-hoi4-border/40'"
          title="项目信息"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </button>
        <button
          @click="activeTab = 'game'"
          class="p-2 transition-all rounded-lg"
          :class="activeTab === 'game' ? 'bg-hoi4-accent text-hoi4-text shadow-md' : 'text-hoi4-text-dim hover:text-hoi4-text hover:bg-hoi4-border/40'"
          title="游戏目录"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
          </svg>
        </button>
        <button
          @click="activeTab = 'errors'"
          class="p-2 transition-all rounded-lg"
          :class="activeTab === 'errors' ? 'bg-hoi4-accent text-hoi4-text shadow-md' : 'text-hoi4-text-dim hover:text-hoi4-text hover:bg-hoi4-border/40'"
          title="错误列表"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </button>
      </div>
      <button
        @click="emit('close')"
        class="px-3 text-hoi4-text-dim hover:text-hoi4-text rounded-full hover:bg-hoi4-border/60 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-hidden">
      <ProjectInfo
        v-if="activeTab === 'info'"
        :project-info="projectInfo"
      />
      
      <GameDirectory
        v-else-if="activeTab === 'game'"
        :game-directory="gameDirectory"
        :game-file-tree="gameFileTree"
        :is-loading="isLoadingGameTree"
        @toggle-folder="emit('toggleGameFolder', $event)"
        @open-file="emit('openFile', $event)"
      />
      
      <ErrorList
        v-else-if="activeTab === 'errors'"
        :errors="txtErrors"
        @jump-to-error="emit('jumpToError', $event)"
      />
    </div>
  </div>
</template>
