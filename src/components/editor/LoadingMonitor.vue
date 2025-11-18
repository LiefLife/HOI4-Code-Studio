<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { TagEntry, IdeaEntry } from '../../api/tauri'

const props = defineProps<{
  visible: boolean
  tags: TagEntry[]
  ideas: IdeaEntry[]
  isLoadingTags: boolean
  isLoadingIdeas: boolean
}>()

const emit = defineEmits<{
  close: []
  refreshTags: []
  refreshIdeas: []
}>()

// 当前激活的标签页
const activeTab = ref<'tags' | 'ideas'>('tags')

// 搜索查询
const searchQuery = ref('')

// 自动刷新相关
const autoRefreshEnabled = ref(true)
const refreshInterval = ref<number | null>(null)
const nextRefreshIn = ref(30) // 倒计时（秒）
const countdownInterval = ref<number | null>(null)

// 过滤后的 Tag 列表
const filteredTags = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.tags
  }
  const query = searchQuery.value.toLowerCase()
  return props.tags.filter(tag => 
    tag.code.toLowerCase().includes(query) ||
    (tag.name && tag.name.toLowerCase().includes(query))
  )
})

// 过滤后的 Idea 列表
const filteredIdeas = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.ideas
  }
  const query = searchQuery.value.toLowerCase()
  return props.ideas.filter(idea => 
    idea.id.toLowerCase().includes(query)
  )
})

// 来源标签
function getSourceLabel(source?: string): { text: string; color: string } {
  if (!source) return { text: '未知', color: 'bg-hoi4-border/50 text-hoi4-text-dim' }
  
  if (source.includes('project') || source.includes('项目')) {
    return { text: '项目', color: 'bg-hoi4-accent/30 text-hoi4-accent' }
  } else if (source.includes('game') || source.includes('游戏')) {
    return { text: '游戏', color: 'bg-green-500/30 text-green-400' }
  } else if (source.includes('dependency') || source.includes('依赖')) {
    return { text: '依赖', color: 'bg-blue-500/30 text-blue-400' }
  }
  
  return { text: '其他', color: 'bg-hoi4-border/50 text-hoi4-text-dim' }
}

// 刷新当前标签页
function handleRefresh() {
  if (activeTab.value === 'tags') {
    emit('refreshTags')
  } else {
    emit('refreshIdeas')
  }
  // 重置倒计时
  resetCountdown()
}

// 刷新所有数据（Tags 和 Ideas）
function refreshAll() {
  emit('refreshTags')
  emit('refreshIdeas')
  resetCountdown()
}

// 重置倒计时
function resetCountdown() {
  nextRefreshIn.value = 30
}

// 切换自动刷新
function toggleAutoRefresh() {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
  if (autoRefreshEnabled.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

// 开始自动刷新
function startAutoRefresh() {
  stopAutoRefresh() // 先清除现有的定时器
  
  // 30秒自动刷新定时器
  refreshInterval.value = window.setInterval(() => {
    if (autoRefreshEnabled.value && props.visible) {
      refreshAll()
    }
  }, 30000) // 30秒
  
  // 倒计时定时器（每秒更新）
  countdownInterval.value = window.setInterval(() => {
    if (autoRefreshEnabled.value && props.visible) {
      nextRefreshIn.value -= 1
      if (nextRefreshIn.value <= 0) {
        nextRefreshIn.value = 30
      }
    }
  }, 1000)
}

// 停止自动刷新
function stopAutoRefresh() {
  if (refreshInterval.value !== null) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
  if (countdownInterval.value !== null) {
    clearInterval(countdownInterval.value)
    countdownInterval.value = null
  }
}

// 监听可见性变化
watch(() => props.visible, (newVal) => {
  if (newVal && autoRefreshEnabled.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

// 组件挂载时启动自动刷新
onMounted(() => {
  if (autoRefreshEnabled.value && props.visible) {
    startAutoRefresh()
  }
})

// 组件卸载时清除定时器
onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/50 flex items-center justify-end z-50 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div class="card h-full max-w-2xl w-full mx-0 rounded-none rounded-l-2xl flex flex-col animate-slide-in-right">
      <!-- 标题栏 -->
      <div class="flex items-center justify-between mb-4 pb-4 border-b border-hoi4-border">
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6 text-hoi4-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <h2 class="text-2xl font-bold text-hoi4-text">加载监控</h2>
        </div>
        <button
          @click="emit('close')"
          class="p-2 hover:bg-hoi4-border/40 rounded-lg transition-colors"
        >
          <svg class="w-6 h-6 text-hoi4-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- 标签页切换 -->
      <div class="flex gap-2 mb-4">
        <button
          @click="activeTab = 'tags'"
          class="flex-1 py-2 px-4 rounded-lg font-semibold transition-all"
          :class="activeTab === 'tags' 
            ? 'bg-hoi4-accent text-hoi4-text shadow-md' 
            : 'bg-hoi4-border/20 text-hoi4-text-dim hover:bg-hoi4-border/40'"
        >
          <div class="flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
            </svg>
            <span>Tag ({{ tags.length }})</span>
          </div>
        </button>
        <button
          @click="activeTab = 'ideas'"
          class="flex-1 py-2 px-4 rounded-lg font-semibold transition-all"
          :class="activeTab === 'ideas' 
            ? 'bg-hoi4-accent text-hoi4-text shadow-md' 
            : 'bg-hoi4-border/20 text-hoi4-text-dim hover:bg-hoi4-border/40'"
        >
          <div class="flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
            <span>Idea ({{ ideas.length }})</span>
          </div>
        </button>
      </div>

      <!-- 搜索框 -->
      <div class="mb-4">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="activeTab === 'tags' ? '搜索 Tag 代码或名称...' : '搜索 Idea ID...'"
            class="input-field pl-10 w-full"
          />
          <svg class="w-5 h-5 text-hoi4-text-dim absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
      </div>

      <!-- Tag 列表 -->
      <div v-if="activeTab === 'tags'" class="flex-1 overflow-y-auto mb-4">
        <div v-if="isLoadingTags" class="flex items-center justify-center py-12 text-hoi4-text-dim">
          <svg class="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <span class="ml-2">加载中...</span>
        </div>
        <div v-else-if="filteredTags.length === 0" class="text-center py-12 text-hoi4-text-dim">
          <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
          </svg>
          <p>{{ searchQuery ? '未找到匹配的 Tag' : '暂无 Tag 数据' }}</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="tag in filteredTags"
            :key="tag.code"
            class="bg-hoi4-border/20 rounded-lg p-3 border border-hoi4-border/40 hover:border-hoi4-accent/40 transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-hoi4-accent font-bold text-lg">{{ tag.code }}</span>
                  <span
                    v-if="tag.source"
                    class="text-xs px-2 py-0.5 rounded"
                    :class="getSourceLabel(tag.source).color"
                  >
                    {{ getSourceLabel(tag.source).text }}
                  </span>
                </div>
                <p class="text-hoi4-text text-sm">{{ tag.name }}</p>
                <p v-if="tag.source" class="text-hoi4-comment text-xs mt-1 truncate" :title="tag.source">
                  来源: {{ tag.source }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Idea 列表 -->
      <div v-if="activeTab === 'ideas'" class="flex-1 overflow-y-auto mb-4">
        <div v-if="isLoadingIdeas" class="flex items-center justify-center py-12 text-hoi4-text-dim">
          <svg class="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <span class="ml-2">加载中...</span>
        </div>
        <div v-else-if="filteredIdeas.length === 0" class="text-center py-12 text-hoi4-text-dim">
          <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
          <p>{{ searchQuery ? '未找到匹配的 Idea' : '暂无 Idea 数据' }}</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="idea in filteredIdeas"
            :key="idea.id"
            class="bg-hoi4-border/20 rounded-lg p-3 border border-hoi4-border/40 hover:border-hoi4-accent/40 transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-hoi4-text font-bold">{{ idea.id }}</span>
                  <span
                    class="text-xs px-2 py-0.5 rounded"
                    :class="getSourceLabel(idea.source).color"
                  >
                    {{ getSourceLabel(idea.source).text }}
                  </span>
                </div>
                <p class="text-hoi4-comment text-xs mt-1">
                  来源: {{ idea.source }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="pt-4 border-t border-hoi4-border space-y-3">
        <!-- 自动刷新设置 -->
        <div class="flex items-center justify-between p-3 bg-hoi4-border/20 rounded-lg">
          <div class="flex items-center gap-3">
            <button
              @click="toggleAutoRefresh"
              class="w-12 h-6 rounded-full transition-colors relative"
              :class="autoRefreshEnabled ? 'bg-hoi4-accent' : 'bg-hoi4-border'"
              :title="autoRefreshEnabled ? '点击禁用自动刷新' : '点击启用自动刷新'"
            >
              <span
                class="block w-4 h-4 rounded-full bg-hoi4-text absolute top-1 transition-transform"
                :class="autoRefreshEnabled ? 'translate-x-7' : 'translate-x-1'"
              ></span>
            </button>
            <div>
              <p class="text-hoi4-text text-sm font-semibold">自动刷新</p>
              <p class="text-hoi4-comment text-xs">
                {{ autoRefreshEnabled ? `下次刷新: ${nextRefreshIn}秒` : '已禁用' }}
              </p>
            </div>
          </div>
          <div class="text-hoi4-comment text-xs">
            每30秒
          </div>
        </div>

        <!-- 统计和刷新按钮 -->
        <div class="flex items-center justify-between">
          <div class="text-hoi4-text-dim text-sm">
            <span v-if="activeTab === 'tags'">
              共 {{ filteredTags.length }} / {{ tags.length }} 个 Tag
            </span>
            <span v-else>
              共 {{ filteredIdeas.length }} / {{ ideas.length }} 个 Idea
            </span>
          </div>
          <button
            @click="handleRefresh"
            class="btn-primary px-6"
            :disabled="(activeTab === 'tags' && isLoadingTags) || (activeTab === 'ideas' && isLoadingIdeas)"
          >
            <div class="flex items-center gap-2">
              <svg 
                class="w-4 h-4" 
                :class="{'animate-spin': (activeTab === 'tags' && isLoadingTags) || (activeTab === 'ideas' && isLoadingIdeas)}"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <span>手动刷新</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
</style>
