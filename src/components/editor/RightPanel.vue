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
          class="px-3 py-1.5 text-xs transition-all rounded-lg"
          :class="activeTab === 'info' ? 'bg-hoi4-accent text-hoi4-text shadow-md font-semibold' : 'text-hoi4-text-dim hover:text-hoi4-text hover:bg-hoi4-border/40'"
        >
          项目信息
        </button>
        <button
          @click="activeTab = 'game'"
          class="px-3 py-1.5 text-xs transition-all rounded-lg"
          :class="activeTab === 'game' ? 'bg-hoi4-accent text-hoi4-text shadow-md font-semibold' : 'text-hoi4-text-dim hover:text-hoi4-text hover:bg-hoi4-border/40'"
        >
          游戏目录
        </button>
        <button
          @click="activeTab = 'errors'"
          class="px-3 py-1.5 text-xs transition-all rounded-lg"
          :class="activeTab === 'errors' ? 'bg-hoi4-accent text-hoi4-text shadow-md font-semibold' : 'text-hoi4-text-dim hover:text-hoi4-text hover:bg-hoi4-border/40'"
        >
          错误列表
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
