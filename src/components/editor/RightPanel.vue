<script setup lang="ts">
import { ref, watch } from 'vue'
import ProjectInfo from './ProjectInfo.vue'
import GameDirectory from './GameDirectory.vue'
import ErrorList from './ErrorList.vue'
import SearchPanel from './SearchPanel.vue'
import AIPanel from './AIPanel.vue'
import type { FileNode } from '../../composables/useFileManager'
import type { SearchResult } from '../../composables/useSearch'

const props = withDefaults(defineProps<{
  projectInfo: any
  gameDirectory: string
  gameFileTree: FileNode[]
  isLoadingGameTree: boolean
  txtErrors: Array<{line: number, msg: string, type: string}>
  width: number
  searchQuery: string
  searchResults: SearchResult[]
  isSearching: boolean
  searchCaseSensitive: boolean
  searchRegex: boolean
  searchScope: string
  includeAllFiles: boolean
  projectPath: string
  activeTab?: 'info' | 'game' | 'errors' | 'search' | 'ai'
}>(), {
  activeTab: 'info'
})

const emit = defineEmits<{
  close: []
  resize: [event: MouseEvent]
  jumpToError: [error: {line: number, msg: string, type: string}]
  toggleGameFolder: [node: FileNode]
  openFile: [node: FileNode]
  'update:searchQuery': [value: string]
  'update:searchCaseSensitive': [value: boolean]
  'update:searchRegex': [value: boolean]
  'update:searchScope': [value: string]
  'update:includeAllFiles': [value: boolean]
  performSearch: []
  jumpToSearchResult: [result: SearchResult]
  'update:activeTab': [value: 'info' | 'game' | 'errors' | 'search' | 'ai']
}>()

const localActiveTab = ref<'info' | 'game' | 'errors' | 'search' | 'ai'>(props.activeTab)

// 监听props.activeTab变化，更新本地状态
watch(() => props.activeTab, (newTab) => {
  if (newTab) {
    localActiveTab.value = newTab
  }
})

// 监听本地activeTab变化，通知父组件
watch(localActiveTab, (newTab) => {
  emit('update:activeTab', newTab)
})
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
          @click="localActiveTab = 'info'"
          class="p-2 transition-all rounded-lg hover-scale"
          :class="localActiveTab === 'info' ? 'bg-hoi4-accent text-hoi4-text shadow-md' : 'text-hoi4-text-dim hover:text-hoi4-text hover:bg-hoi4-border/40'"
          title="项目信息"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </button>
        <button
          @click="localActiveTab = 'game'"
          class="p-2 transition-all rounded-lg hover-scale"
          :class="localActiveTab === 'game' ? 'bg-hoi4-accent text-hoi4-text shadow-md' : 'text-hoi4-text-dim hover:text-hoi4-text hover:bg-hoi4-border/40'"
          title="游戏目录"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
          </svg>
        </button>
        <button
          @click="localActiveTab = 'errors'"
          class="p-2 transition-all rounded-lg hover-scale"
          :class="localActiveTab === 'errors' ? 'bg-hoi4-accent text-hoi4-text shadow-md' : 'text-hoi4-text-dim hover:text-hoi4-text hover:bg-hoi4-border/40'"
          title="错误列表"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </button>
        <button
          @click="localActiveTab = 'search'"
          class="p-2 transition-all rounded-lg hover-scale"
          :class="localActiveTab === 'search' ? 'bg-hoi4-accent text-hoi4-text shadow-md' : 'text-hoi4-text-dim hover:text-hoi4-text hover:bg-hoi4-border/40'"
          title="搜索"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </button>
        <button
          @click="localActiveTab = 'ai'"
          class="px-3 py-2 transition-all rounded-lg hover-scale text-sm font-bold"
          :class="localActiveTab === 'ai' ? 'bg-hoi4-accent text-hoi4-text shadow-md' : 'text-hoi4-text-dim hover:text-hoi4-text hover:bg-hoi4-border/40'"
          title="AI"
        >
          AI
        </button>
      </div>
      <button
        @click="emit('close')"
        class="px-3 text-hoi4-text-dim hover:text-hoi4-text rounded-full hover:bg-hoi4-border/60 transition-colors hover-scale"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-hidden">
      <Transition name="sidebar-fade-slide" mode="out-in">
        <ProjectInfo
          v-if="localActiveTab === 'info'"
          :key="'info'"
          :project-info="projectInfo"
        />
        
        <GameDirectory
          v-else-if="localActiveTab === 'game'"
          :key="'game'"
          :game-directory="gameDirectory"
          :game-file-tree="gameFileTree"
          :is-loading="isLoadingGameTree"
          @toggle-folder="emit('toggleGameFolder', $event)"
          @open-file="emit('openFile', $event)"
        />
        
        <ErrorList
          v-else-if="localActiveTab === 'errors'"
          :key="'errors'"
          :errors="txtErrors"
          @jump-to-error="emit('jumpToError', $event)"
        />
        
        <div
          v-else-if="localActiveTab === 'search'"
          :key="'search'"
          class="h-full overflow-hidden flex flex-col"
        >
          <SearchPanel
            :search-query="searchQuery"
            :search-results="searchResults"
            :is-searching="isSearching"
            :search-case-sensitive="searchCaseSensitive"
            :search-regex="searchRegex"
            :search-scope="searchScope"
            :include-all-files="includeAllFiles"
            :project-path="projectPath"
            :game-directory="gameDirectory"
            @jump-to-result="emit('jumpToSearchResult', $event)"
            @update:search-query="emit('update:searchQuery', $event)"
            @update:search-case-sensitive="emit('update:searchCaseSensitive', $event)"
            @update:search-regex="emit('update:searchRegex', $event)"
            @update:search-scope="emit('update:searchScope', $event)"
            @update:include-all-files="emit('update:includeAllFiles', $event)"
            @perform-search="emit('performSearch')"
          />
        </div>

        <AIPanel
          v-else-if="localActiveTab === 'ai'"
          :key="'ai'"
        />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* 悬停放大动画 */
.hover-scale {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hover-scale:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.hover-scale:active {
  transform: scale(0.95);
  transition: transform 0.1s ease;
}
</style>
