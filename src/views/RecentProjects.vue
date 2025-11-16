<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getRecentProjects, openProject, initializeProject, loadSettings, type RecentProject } from '../api/tauri'

const router = useRouter()

const projects = ref<RecentProject[]>([])
const loading = ref(true)
const showStatus = ref(false)
const statusMessage = ref('')
const layoutMode = ref<'four-columns' | 'three-columns' | 'two-columns' | 'one-column' | 'masonry'>('four-columns')

// 计算网格布局类
const gridClass = computed(() => {
  switch (layoutMode.value) {
    case 'four-columns':
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
    case 'three-columns':
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
    case 'two-columns':
      return 'grid grid-cols-1 md:grid-cols-2 gap-4'
    case 'one-column':
      return 'flex flex-col space-y-4'
    case 'masonry':
      return 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4'
    default:
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
  }
})

// 项目卡片样式
const cardClass = computed(() => {
  if (layoutMode.value === 'masonry') {
    return 'break-inside-avoid mb-4'
  }
  return ''
})

function displayStatus(message: string, duration: number = 3000) {
  statusMessage.value = message
  showStatus.value = true
  
  setTimeout(() => {
    showStatus.value = false
  }, duration)
}

async function loadRecentProjects() {
  loading.value = true
  const result = await getRecentProjects()
  
  if (result.success) {
    projects.value = result.projects
  }
  
  loading.value = false
}

async function handleOpenProject(project: RecentProject) {
  const result = await openProject(project.path)
  
  if (result.success) {
    displayStatus('项目打开成功', 2000)
    setTimeout(() => {
      router.push({ name: 'editor', query: { path: project.path } })
    }, 500)
  } else {
    // 检查是否是需要初始化的项目
    if (result.message.includes('检测到此文件夹不是HOI4 Code Studio项目')) {
      const shouldInitialize = confirm(result.message)
      
      if (shouldInitialize) {
        const initResult = await initializeProject(project.path)
        
        if (initResult.success) {
          displayStatus(initResult.message, 2000)
          setTimeout(() => {
            router.push({ name: 'editor', query: { path: project.path } })
          }, 500)
        } else {
          displayStatus(`项目初始化失败: ${initResult.message}`, 3000)
        }
      }
      // 如果用户选择不初始化，不做任何操作
    } else {
      displayStatus(`打开失败: ${result.message}`, 3000)
    }
  }
}

function goBack() {
  router.push('/')
}

function formatDate(dateString: string) {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN')
  } catch {
    return dateString
  }
}

onMounted(async () => {
  // 加载布局设置
  const settings = await loadSettings()
  if (settings.success && settings.data) {
    const data = settings.data as any
    layoutMode.value = data.recentProjectsLayout || 'four-columns'
  }
  
  // 加载项目列表
  loadRecentProjects()
})
</script>

<template>
  <div class="h-full w-full flex flex-col p-[2vh] bg-hoi4-dark">
    <!-- 顶部栏 -->
    <div class="flex items-center mb-[3vh]">
      <button
        @click="goBack"
        class="btn-secondary flex items-center space-x-2"
        style="padding: clamp(0.5rem, 1vh, 0.75rem) clamp(1rem, 2vw, 1.5rem)"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        <span>返回</span>
      </button>
      <h1 class="ml-[3vw] font-bold text-hoi4-text" style="font-size: clamp(1.25rem, 2.5vw, 2rem)">
        最近项目
      </h1>
    </div>

    <!-- 项目列表 -->
    <div class="flex-1 overflow-y-auto px-4">
      <div v-if="loading" class="text-center text-hoi4-text-dim py-12">
        加载中...
      </div>

      <div v-else-if="projects.length === 0" class="card text-center py-12 max-w-2xl mx-auto">
        <p class="text-hoi4-text-dim text-lg">暂无最近项目</p>
      </div>

      <div
        v-else
        :class="gridClass"
      >
        <div
          v-for="project in projects"
          :key="project.path"
          @click="handleOpenProject(project)"
          :class="['card cursor-pointer hover:border-hoi4-accent transition-colors', cardClass]"
        >
          <div class="flex flex-col h-full">
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1 min-w-0">
                <h3 class="text-hoi4-text font-bold text-lg mb-1 truncate" :title="project.name">
                  {{ project.name }}
                </h3>
              </div>
              <svg class="w-5 h-5 text-hoi4-text-dim flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
            <p class="text-hoi4-text-dim text-sm break-all mb-2" :title="project.path">
              {{ project.path }}
            </p>
            <p class="text-hoi4-text-dim text-xs mt-auto">
              最后打开: {{ formatDate(project.last_opened) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态提示 -->
    <div v-if="showStatus" class="fixed bottom-[2vh] right-[2vw] z-50">
      <div class="bg-hoi4-gray border-2 border-hoi4-border rounded-lg shadow-lg p-4">
        <p class="text-hoi4-text">{{ statusMessage }}</p>
      </div>
    </div>
  </div>
</template>
