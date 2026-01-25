<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getRecentProjects, getRecentProjectStats, openProject, initializeProject, type RecentProject, type ProjectStats } from '../api/tauri'

const router = useRouter()

const projects = ref<RecentProject[]>([])
const loading = ref(true)
const projectStatsByPath = ref<Record<string, ProjectStats>>({})
const showStatus = ref(false)
const statusMessage = ref('')
const searchQuery = ref('')

// 过滤后的项目列表
const filteredProjects = computed(() => {
  if (!searchQuery.value.trim()) {
    return projects.value
  }
  
  const query = searchQuery.value.toLowerCase().trim()
  return projects.value.filter(project => {
    return (
      project.name.toLowerCase().includes(query) ||
      project.path.toLowerCase().includes(query)
    )
  })
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
    const paths = result.projects.map(p => p.path)
    const statsResult = await getRecentProjectStats(paths)
    if (statsResult.success) {
      const next: Record<string, ProjectStats> = {}
      for (const s of statsResult.stats) {
        next[s.path] = s
      }
      projectStatsByPath.value = next
    }
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

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return '-'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`
}

onMounted(async () => {
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

    <!-- 搜索栏 -->
    <div class="mb-[3vh] px-4">
      <div class="relative max-w-2xl">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="w-5 h-5 text-hoi4-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索项目名称或路径..."
          class="w-full pl-10 pr-4 py-2 bg-hoi4-gray border-2 border-hoi4-border rounded-lg text-hoi4-text placeholder-hoi4-text-dim focus:outline-none focus:border-hoi4-accent transition-colors"
        />
        <div v-if="searchQuery" class="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            @click="searchQuery = ''"
            class="text-hoi4-text-dim hover:text-hoi4-text transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      <div v-if="searchQuery" class="mt-2 text-sm text-hoi4-text-dim">
        找到 {{ filteredProjects.length }} 个项目
      </div>
    </div>

    <!-- 项目列表 -->
    <div class="flex-1 overflow-y-auto px-4">
      <div v-if="loading" class="text-center text-hoi4-text-dim py-12">
        加载中...
      </div>

      <div v-else-if="projects.length === 0" class="card text-center py-12 max-w-2xl mx-auto">
        <p class="text-hoi4-text-dim text-lg">暂无最近项目</p>
      </div>

      <div v-else-if="searchQuery && filteredProjects.length === 0" class="card text-center py-12 max-w-2xl mx-auto">
        <p class="text-hoi4-text-dim text-lg">未找到匹配的项目</p>
        <p class="text-hoi4-text-dim text-sm mt-2">尝试使用不同的关键词搜索</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="project in filteredProjects"
          :key="project.path"
          @click="handleOpenProject(project)"
          class="card cursor-pointer hover:border-hoi4-accent hover:shadow-xl hover:shadow-black/20 transition-all duration-200"
        >
          <div class="flex flex-col h-full">
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 min-w-0">
                  <h3 class="text-hoi4-text font-bold text-lg truncate" :title="project.name">
                    {{ project.name }}
                  </h3>
                  <span
                    class="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md border border-hoi4-border bg-hoi4-gray/60 text-hoi4-text-dim text-xs"
                    :title="projectStatsByPath[project.path]?.version ? `project.json 版本：${projectStatsByPath[project.path]?.version}` : '未找到 project.json 版本'"
                  >
                    v{{ projectStatsByPath[project.path]?.version ?? '-' }}
                  </span>
                </div>
              </div>
              <svg class="w-5 h-5 text-hoi4-text-dim flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>

            <p class="text-hoi4-text-dim text-sm break-all mb-3 font-mono" :title="project.path">
              {{ project.path }}
            </p>

            <div class="rounded-lg border border-hoi4-border bg-hoi4-gray/30 px-2 py-2 mb-2">
              <div class="flex items-center gap-1 text-hoi4-text-dim text-[11px] leading-none">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2v-8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>最后打开</span>
              </div>
              <div class="mt-1 text-hoi4-text text-xs leading-snug">
                {{ formatDate(project.last_opened) }}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 mb-3">
              <div class="rounded-lg border border-hoi4-border bg-hoi4-gray/40 px-2 py-2">
                <div class="flex items-center gap-1 text-hoi4-text-dim text-[11px] leading-none">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z" />
                  </svg>
                  <span>文件</span>
                </div>
                <div class="mt-1 text-hoi4-text font-semibold text-sm tabular-nums">
                  {{ projectStatsByPath[project.path]?.fileCount ?? '-' }}
                </div>
              </div>

              <div class="rounded-lg border border-hoi4-border bg-hoi4-gray/40 px-2 py-2">
                <div class="flex items-center gap-1 text-hoi4-text-dim text-[11px] leading-none">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                  <span>占用</span>
                </div>
                <div class="mt-1 text-hoi4-text font-semibold text-sm tabular-nums">
                  {{ projectStatsByPath[project.path] ? formatBytes(projectStatsByPath[project.path].totalSize) : '-' }}
                </div>
              </div>
            </div>
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
