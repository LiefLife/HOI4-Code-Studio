<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SearchResult } from '../../composables/useSearch'

const props = defineProps<{
  visible: boolean
  searchQuery: string
  searchResults: SearchResult[]
  isSearching: boolean
  searchCaseSensitive: boolean
  searchRegex: boolean
  searchScope: string
  projectPath: string
  gameDirectory: string
}>()

const emit = defineEmits<{
  close: []
  jumpToResult: [result: SearchResult]
  'update:searchQuery': [value: string]
  'update:searchCaseSensitive': [value: boolean]
  'update:searchRegex': [value: boolean]
  'update:searchScope': [value: string]
  performSearch: []
}>()

// 键盘导航
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, props.searchResults.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter' && props.searchResults[selectedIndex.value]) {
    emit('jumpToResult', props.searchResults[selectedIndex.value])
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

// 监听搜索参数变化（1 秒防抖）
const debounceTimer = ref<number | null>(null)
watch([() => props.searchQuery, () => props.searchCaseSensitive, () => props.searchRegex, () => props.searchScope], () => {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
    debounceTimer.value = null
  }
  if (!props.searchQuery.trim()) return
  debounceTimer.value = window.setTimeout(() => {
    emit('performSearch')
  }, 1000)
}, { flush: 'post' })

// 当面板打开时聚焦输入框
watch(() => props.visible, (visible) => {
  if (visible) {
    setTimeout(() => {
      inputRef.value?.focus()
    }, 100)
    selectedIndex.value = 0
  }
})
</script>

<template>
  <!-- 遮罩层 -->
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/50 z-40"
    @click="emit('close')"
  ></div>
  
  <!-- 搜索面板 -->
  <div
    v-if="visible"
    class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] max-h-[70vh] bg-onedark-bg border-2 border-onedark-border rounded-lg shadow-2xl flex flex-col z-50"
    @keydown="handleKeyDown"
    @click.stop
  >
    <!-- 搜索输入区 -->
    <div class="p-4 border-b border-onedark-border">
      <input
        ref="inputRef"
        :value="searchQuery"
        @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="搜索..."
        class="w-full px-3 py-2 bg-onedark-bg text-onedark-fg border border-onedark-border rounded focus:outline-none focus:border-onedark-accent"
      />
      
      <!-- 选项 -->
      <div class="flex items-center gap-4 mt-3 text-sm flex-wrap">
        <label class="flex items-center gap-2 text-onedark-fg cursor-pointer">
          <input 
            :checked="searchCaseSensitive" 
            @change="emit('update:searchCaseSensitive', ($event.target as HTMLInputElement).checked)"
            type="checkbox" 
            class="accent-onedark-accent" 
          />
          <span>大小写敏感</span>
        </label>
        <label class="flex items-center gap-2 text-onedark-fg cursor-pointer">
          <input 
            :checked="searchRegex" 
            @change="emit('update:searchRegex', ($event.target as HTMLInputElement).checked)"
            type="checkbox" 
            class="accent-onedark-accent" 
          />
          <span>正则表达式</span>
        </label>
        <label class="flex items-center gap-2 text-onedark-fg cursor-pointer">
          <input 
            :checked="searchScope === 'game'" 
            @change="emit('update:searchScope', ($event.target as HTMLInputElement).checked ? 'game' : 'project')"
            type="checkbox" 
            class="accent-onedark-accent" 
          />
          <span>游戏目录</span>
        </label>
      </div>
    </div>
    
    <!-- 搜索结果列表 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="isSearching" class="p-4 text-center text-onedark-comment">
        搜索中...
      </div>
      <div v-else-if="searchResults.length === 0 && searchQuery" class="p-4 text-center text-onedark-comment">
        未找到结果
      </div>
      <div v-else-if="searchResults.length > 0" class="p-2">
        <div class="text-xs text-onedark-comment px-2 mb-2">
          找到 {{ searchResults.length }} 个结果
        </div>
        <div
          v-for="(result, index) in searchResults"
          :key="`${result.file.path}-${result.line}-${index}`"
          :class="[
            'px-3 py-2 rounded cursor-pointer transition-colors',
            index === selectedIndex
              ? 'bg-onedark-selection'
              : 'hover:bg-onedark-selection/50'
          ]"
          @click="emit('jumpToResult', result)"
        >
          <div class="text-xs font-semibold text-onedark-accent mb-1">
            {{ result.file.name }}:{{ result.line }}
          </div>
          <div class="text-xs text-onedark-fg font-mono truncate">
            {{ result.content }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 关闭按钮 -->
    <button
      @click="emit('close')"
      class="absolute top-2 right-2 p-1 text-onedark-comment hover:text-onedark-fg transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>
