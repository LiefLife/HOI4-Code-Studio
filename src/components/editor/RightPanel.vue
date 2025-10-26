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
    class="bg-hoi4-gray border-l-2 border-hoi4-border flex-shrink-0 overflow-hidden flex flex-col"
    :style="{ width: width + 'px' }"
  >
    <!-- 标签栏 -->
    <div class="bg-hoi4-accent border-b border-hoi4-border flex items-center justify-between">
      <div class="flex">
        <button
          @click="activeTab = 'info'"
          class="px-4 py-2 text-sm transition-colors border-r border-hoi4-border"
          :class="activeTab === 'info' ? 'bg-hoi4-gray text-hoi4-text' : 'text-hoi4-text-dim hover:text-hoi4-text'"
        >
          项目信息
        </button>
        <button
          @click="activeTab = 'game'"
          class="px-4 py-2 text-sm transition-colors"
          :class="activeTab === 'game' ? 'bg-hoi4-gray text-hoi4-text' : 'text-hoi4-text-dim hover:text-hoi4-text'"
        >
          游戏目录
        </button>
        <button
          @click="activeTab = 'errors'"
          class="px-4 py-2 text-sm transition-colors"
          :class="activeTab === 'errors' ? 'bg-hoi4-gray text-hoi4-text' : 'text-hoi4-text-dim hover:text-hoi4-text'"
        >
          错误列表
        </button>
      </div>
      <button
        @click="emit('close')"
        class="px-3 text-hoi4-text-dim hover:text-hoi4-text"
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
