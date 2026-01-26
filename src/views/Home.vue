<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  openFileDialog,
  openProject,
  initializeProject,
  loadSettings,
  openUrl,
  getRecentProjects,
  getRecentProjectStats,
  type RecentProject,
  type ProjectStats
} from '../api/tauri'
import { checkForUpdates } from '../utils/version'
import ChangelogPanel from '../components/ChangelogPanel.vue'
import MarkdownIt from 'markdown-it'

const router = useRouter()
const statusMessage = ref('')
const showStatus = ref(false)

const projects = ref<RecentProject[]>([])
const projectStatsByPath = ref<Record<string, ProjectStats>>({})
const loadingRecent = ref(true)
const searchQuery = ref('')

// 当前版本
const CURRENT_VERSION = '2026.1.26-dev'

// 更新提示
const showUpdateDialog = ref(false)
const updateInfo = ref<{ version: string; url: string; releaseNotes?: string } | null>(null)

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

function updateNotesHtml() {
  const notes = updateInfo.value?.releaseNotes
  if (!notes || !notes.trim()) return ''
  return md.render(notes)
}

// 游戏目录提醒
const showGameDirDialog = ref(false)
const isFirstTime = ref(false)

// 更新日志面板
const showChangelogPanel = ref(false)

// 显示状态消息
function displayStatus(message: string, duration: number = 3000) {
  statusMessage.value = message
  showStatus.value = true
  
  setTimeout(() => {
    showStatus.value = false
  }, duration)
}

// 处理创建新项目
function handleNewProject() {
  router.push('/create-project')
}

// 处理打开项目
async function handleOpenProject() {
  const dialogResult = await openFileDialog('directory')
  
  if (dialogResult.success && dialogResult.path) {
    const result = await openProject(dialogResult.path)
    
    if (result.success) {
      displayStatus(result.message, 2000)
      setTimeout(() => {
        router.push({ name: 'editor', query: { path: dialogResult.path } })
      }, 500)
    } else {
      // 检查是否是需要初始化的项目
      if (result.message.includes('检测到此文件夹不是HOI4 Code Studio项目')) {
        const shouldInitialize = confirm(result.message)
        
        if (shouldInitialize) {
          const initResult = await initializeProject(dialogResult.path)
          
          if (initResult.success) {
            displayStatus(initResult.message, 2000)
            setTimeout(() => {
              router.push({ name: 'editor', query: { path: dialogResult.path } })
            }, 500)
          } else {
            displayStatus(`项目初始化失败: ${initResult.message}`, 3000)
          }
        }
        // 如果用户选择不初始化，不做任何操作
      } else {
        displayStatus(`错误: ${result.message}`, 3000)
      }
    }
  }
}

// 处理设置
function handleSettings() {
  router.push('/settings')
}

function handleDocumentation() {
  router.push('/documentation')
}

async function handleContribute() {
  await openUrl('https://github.com/LiefLife/HOI4-Code-Studio/pulls')
}

async function handleReportIssue() {
  await openUrl('https://github.com/LiefLife/HOI4-Code-Studio/issues')
}

// 打开更新日志面板
function handleChangelog() {
  showChangelogPanel.value = true
}

// 关闭更新日志面板
function closeChangelogPanel() {
  showChangelogPanel.value = false
}

// 检查更新
async function checkAppUpdates() {
  try {
    // 使用未认证访问
    const result = await checkForUpdates(CURRENT_VERSION, '')
    
    if (result.hasUpdate && result.latestVersion && result.releaseUrl) {
      updateInfo.value = {
        version: result.latestVersion,
        url: result.releaseUrl,
        releaseNotes: result.releaseNotes
      }
      showUpdateDialog.value = true
    }
  } catch (error) {
    console.error('检查更新失败:', error)
  }
}

// 打开更新页面
async function openUpdatePage() {
  if (updateInfo.value?.url) {
    await openUrl(updateInfo.value.url)
    showUpdateDialog.value = false
  }
}

// 关闭更新对话框
function closeUpdateDialog() {
  showUpdateDialog.value = false
}

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

async function loadRecentProjects() {
  loadingRecent.value = true
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

  loadingRecent.value = false
}

async function handleOpenRecentProject(project: RecentProject) {
  const result = await openProject(project.path)

  if (result.success) {
    displayStatus('项目打开成功', 2000)
    setTimeout(() => {
      router.push({ name: 'editor', query: { path: project.path } })
    }, 500)
  } else {
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
    } else {
      displayStatus(`打开失败: ${result.message}`, 3000)
    }
  }
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

// 检查游戏目录设置
async function checkGameDirectory() {
  const settings = await loadSettings()
  
  if (settings.success && settings.data) {
    const data = settings.data as any
    const gameDir = data.gameDirectory || ''
    
    // 检查是否是首次启动（通过检查是否有任何配置）
    const hasAnyConfig = Object.keys(data).length > 0 && 
                        Object.values(data).some(v => v !== '' && v !== null && v !== undefined)
    
    // 如果没有任何配置或者只有默认配置，认为是首次启动
    isFirstTime.value = !hasAnyConfig || (gameDir === '' && !data.lastProjectPath)
    
    // 如果游戏目录未设置，显示提醒
    if (!gameDir || gameDir.trim() === '') {
      // 延迟显示，让界面先加载
      setTimeout(() => {
        showGameDirDialog.value = true
      }, 800)
    }
  } else {
    // 无法加载设置，认为是首次启动
    isFirstTime.value = true
    setTimeout(() => {
      showGameDirDialog.value = true
    }, 800)
  }
}

// 关闭游戏目录提醒
function closeGameDirDialog() {
  showGameDirDialog.value = false
}

// 跳转到设置页面
function goToSettings() {
  showGameDirDialog.value = false
  router.push('/settings')
}

// 组件挂载后显示欢迎消息并检查更新
onMounted(() => {
  setTimeout(() => {
    displayStatus('欢迎使用 Hearts of Iron IV GUI Mod Editor', 3000)
  }, 500)
  
  // 延迟执行耗时操作，避免阻塞UI渲染
  setTimeout(async () => {
    // 检查游戏目录设置
    await checkGameDirectory()
    
    // 检查是否启用了自动更新检测
    const settings = await loadSettings()
    if (settings.success && settings.data) {
      const data = settings.data as any
      const shouldCheckUpdates = data.checkForUpdates !== false
      
      if (shouldCheckUpdates) {
        // 延迟检查更新，避免影响启动体验
        setTimeout(() => {
          checkAppUpdates()
        }, 1000)
      }
    }
  }, 100)

  loadRecentProjects()
})
</script>


<template>
  <div class="h-full w-full grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-8 p-[2.5vh] bg-onedark-bg home-hero">
    <div class="flex flex-col items-center justify-center">
      <!-- 标题区域 -->
      <div class="card home-panel home-title-card w-full max-w-[90vw] sm:max-w-2xl mb-[3vh]">
        <div class="flex items-center gap-5">
          <div class="home-title-icon">
            <img
              src="/HOICS.png"
              alt="HOI4 Code Studio"
              class="w-[clamp(3.5rem,7vw,6.5rem)] h-[clamp(3.5rem,7vw,6.5rem)]"
            />
          </div>
          <div class="home-title text-left">
            <h1 class="font-bold text-onedark-fg mb-1" style="font-size: clamp(1.4rem, 3.5vw, 2.8rem);">
              Hearts of Iron IV
            </h1>
            <h2 class="font-light text-onedark-comment" style="font-size: clamp(1rem, 2.2vw, 1.7rem);">
              Code Studio
            </h2>
            <div class="mt-1 text-onedark-comment" style="font-size: clamp(0.75rem, 1vw, 0.875rem);">
              {{ CURRENT_VERSION }}
            </div>
          </div>
        </div>
      </div>

      <!-- 磁铁式按钮布局 -->
      <div class="w-full max-w-[90vw] sm:max-w-2xl">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 左侧按钮组 -->
          <div class="card home-panel flex flex-col gap-5">
            <h3 class="text-lg font-bold text-onedark-fg text-center mb-2">项目操作</h3>

            <div class="grid grid-cols-2 gap-3">
              <!-- 创建新项目按钮（占两列，视觉上作为主入口） -->
              <button
                @click="handleNewProject"
                class="home-btn home-primary w-full tile-button col-span-2"
                title="创建一个新的 GUI Mod 项目"
              >
                <div class="flex items-center justify-center space-x-3">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  <span class="text-base font-semibold">创建新项目</span>
                </div>
              </button>

              <!-- 打开现有项目按钮 -->
              <button
                @click="handleOpenProject"
                class="home-btn home-ghost w-full tile-button col-span-2"
                title="打开已存在的 GUI Mod 项目"
              >
                <div class="flex flex-col items-center justify-center gap-2">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path>
                  </svg>
                  <span class="text-sm font-semibold">打开项目</span>
                </div>
              </button>
            </div>
          </div>

          <!-- 右侧按钮组 -->
          <div class="card home-panel flex flex-col gap-5">
            <h3 class="text-lg font-bold text-onedark-fg text-center mb-2">应用功能</h3>

            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <!-- 文档按钮 -->
              <button
                @click="handleDocumentation"
                class="home-btn home-ghost w-full tile-button"
                title="查看使用文档"
              >
                <div class="flex flex-col items-center justify-center gap-2">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                  <span class="text-sm font-semibold">文档</span>
                </div>
              </button>

              <button
                @click="handleContribute"
                class="home-btn home-ghost w-full tile-button"
                title="前往 GitHub 参与贡献"
              >
                <div class="flex flex-col items-center justify-center gap-2">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-3-3h-1M9 20H4v-2a3 3 0 013-3h1m8-5a4 4 0 10-8 0 4 4 0 008 0z"></path>
                  </svg>
                  <span class="text-sm font-semibold">做出贡献</span>
                </div>
              </button>

              <button
                @click="handleReportIssue"
                class="home-btn home-ghost w-full tile-button"
                title="前往 GitHub 报告问题"
              >
                <div class="flex flex-col items-center justify-center gap-2">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
                  </svg>
                  <span class="text-sm font-semibold">报告问题</span>
                </div>
              </button>

              <!-- 更新日志按钮 -->
              <button
                @click="handleChangelog"
                class="home-btn home-ghost w-full tile-button"
                title="查看版本更新日志"
              >
                <div class="flex flex-col items-center justify-center gap-2">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <span class="text-sm font-semibold">更新日志</span>
                </div>
              </button>

              <!-- 设置按钮 -->
              <button
                @click="handleSettings"
                class="home-btn home-ghost w-full tile-button"
                title="应用程序设置"
              >
                <div class="flex flex-col items-center justify-center gap-2">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572-1.065c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <span class="text-sm font-semibold">设置</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部信息 -->
      <div class="mt-[3.5vh] text-center text-onedark-comment" style="font-size: clamp(0.625rem, 1vw, 0.875rem);">
        <p class="mt-[0.5vh]">基于 Tauri + Vue 3 构建</p>
      </div>
    </div>

    <div class="card home-panel flex flex-col h-full overflow-hidden p-5">
      <div class="flex items-center justify-between gap-4 mb-5">
        <div>
          <h3 class="text-lg font-bold text-onedark-fg">最近项目</h3>
          <p class="text-onedark-comment text-xs">快速打开最近使用的工程</p>
        </div>
        <button
          class="btn-secondary text-sm"
          @click="loadRecentProjects"
        >
          刷新
        </button>
      </div>

      <div class="mb-5">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="w-4 h-4 text-onedark-comment" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索项目名称或路径..."
            class="w-full pl-9 pr-3 py-2 bg-onedark-bg border border-onedark-border rounded-lg text-onedark-fg placeholder-onedark-comment focus:outline-none focus:border-onedark-accent transition-colors"
          />
        </div>
        <div v-if="searchQuery" class="mt-2 text-xs text-onedark-comment">
          找到 {{ filteredProjects.length }} 个项目
        </div>
      </div>

      <div class="flex-1 overflow-y-auto pr-1">
        <div v-if="loadingRecent" class="text-center text-onedark-comment py-10">
          加载中...
        </div>

        <div v-else-if="projects.length === 0" class="card text-center py-10">
          <p class="text-onedark-comment">暂无最近项目</p>
        </div>

        <div v-else-if="searchQuery && filteredProjects.length === 0" class="card text-center py-10">
          <p class="text-onedark-comment">未找到匹配的项目</p>
          <p class="text-onedark-comment text-xs mt-2">尝试使用不同的关键词搜索</p>
        </div>

        <div v-else class="space-y-4">
          <button
            v-for="project in filteredProjects"
            :key="project.path"
            @click="handleOpenRecentProject(project)"
            class="card w-full text-left border-transparent shadow-2xl shadow-black/40 hover:shadow-[0_28px_60px_-24px_rgba(0,0,0,0.6)] hover:border-transparent transition-all duration-200 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h4 class="text-onedark-fg font-semibold text-base truncate" :title="project.name">
                  {{ project.name }}
                </h4>
                <p class="text-onedark-comment text-xs mt-1 break-all font-mono" :title="project.path">
                  {{ project.path }}
                </p>
              </div>
              <span
                class="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md border border-onedark-border bg-onedark-bg text-onedark-comment text-xs"
                :title="projectStatsByPath[project.path]?.version ? `project.json 版本：${projectStatsByPath[project.path]?.version}` : '未找到 project.json 版本'"
              >
                v{{ projectStatsByPath[project.path]?.version ?? '-' }}
              </span>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div class="rounded-md bg-onedark-bg-secondary px-2 py-1 shadow-md shadow-black/40">
                <div class="text-onedark-comment">最后打开</div>
                <div class="text-onedark-fg mt-1">{{ formatDate(project.last_opened) }}</div>
              </div>
              <div class="rounded-md bg-onedark-bg-secondary px-2 py-1 shadow-md shadow-black/40">
                <div class="text-onedark-comment">占用 / 文件</div>
                <div class="text-onedark-fg mt-1">
                  {{ projectStatsByPath[project.path] ? formatBytes(projectStatsByPath[project.path].totalSize) : '-' }}
                  · {{ projectStatsByPath[project.path]?.fileCount ?? '-' }}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- 状态提示 -->
    <div 
      v-if="showStatus"
      class="fixed bottom-[2vh] right-[2vw] z-50"
    >
      <div class="bg-onedark-bg-secondary border-2 border-onedark-border rounded-lg shadow-lg" style="padding: clamp(0.5rem, 1.5vh, 0.75rem) clamp(1rem, 3vw, 1.5rem); max-width: min(90vw, 24rem);">
        <p class="text-onedark-fg" style="font-size: clamp(0.75rem, 1.2vw, 0.875rem);">{{ statusMessage }}</p>
      </div>
    </div>

    <!-- 更新提示对话框 -->
    <div 
      v-if="showUpdateDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeUpdateDialog"
    >
      <div class="card max-w-md mx-4">
        <div class="space-y-4">
          <div class="flex items-start space-x-3">
            <svg class="w-8 h-8 text-onedark-green flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <div class="flex-1">
              <h3 class="text-xl font-bold text-onedark-fg mb-2">发现新版本</h3>
              <p class="text-onedark-comment mb-1">当前版本: {{ CURRENT_VERSION }}</p>
              <p class="text-onedark-green font-semibold">最新版本: {{ updateInfo?.version }}</p>
            </div>
          </div>
          
          <p class="text-onedark-fg">
            新版本已发布，建议更新以获得最新功能和修复。
          </p>

          <div v-if="updateInfo?.releaseNotes" class="rounded-lg border border-onedark-border bg-onedark-bg-secondary/60 p-3 max-h-56 overflow-auto">
            <div class="ai-markdown text-sm text-onedark-fg" v-html="updateNotesHtml()"></div>
          </div>
          <div v-else class="rounded-lg border border-onedark-border bg-onedark-bg-secondary/60 p-3">
            <div class="text-xs text-onedark-comment">暂无更新内容</div>
          </div>
          
          <div class="flex space-x-3 pt-2">
            <button
              @click="openUpdatePage"
              class="btn-primary flex-1"
            >
              查看更新
            </button>
            <button
              @click="closeUpdateDialog"
              class="btn-secondary flex-1"
            >
              稍后提醒
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 游戏目录提醒对话框 -->
    <div 
      v-if="showGameDirDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style="backdrop-filter: blur(4px);"
      @click.self="closeGameDirDialog"
    >
      <div class="card max-w-md mx-4">
        <div class="space-y-4">
          <div class="flex items-start space-x-3">
            <svg class="w-8 h-8 text-onedark-yellow flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <div class="flex-1">
              <h3 class="text-xl font-bold text-onedark-fg mb-2">
                {{ isFirstTime ? '🎉 欢迎使用' : '⚠️ 未设置游戏目录' }}
              </h3>
              <p class="text-onedark-fg leading-relaxed" v-if="isFirstTime">
                感谢您使用 HOI4 Code Studio！<br/>
                为了更好地使用本工具，建议您先设置钢铁雄心4的游戏目录。<br/>
                <span class="text-onedark-comment text-sm mt-2 block">设置游戏目录后，您可以：</span>
                <span class="text-onedark-green text-sm block">✓ 浏览游戏原版文件</span>
                <span class="text-onedark-green text-sm block">✓ 查看游戏标签和国策</span>
                <span class="text-onedark-green text-sm block">✓ 获得更好的代码提示</span>
              </p>
              <p class="text-onedark-fg leading-relaxed" v-else>
                检测到您还未设置钢铁雄心4的游戏目录。<br/>
                设置后可以浏览游戏原版文件、查看标签和国策等。
              </p>
            </div>
          </div>
          
          <div class="flex space-x-3 pt-2">
            <button
              @click="goToSettings"
              class="btn-primary flex-1"
            >
              {{ isFirstTime ? '立即设置' : '前往设置' }}
            </button>
            <button
              @click="closeGameDirDialog"
              class="btn-secondary flex-1"
            >
              稍后设置
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 更新日志侧边面板 -->
    <ChangelogPanel 
      :visible="showChangelogPanel" 
      @close="closeChangelogPanel" 
    />
  </div>
</template>

<style scoped>
.home-hero {
  background-color: var(--onedark-bg);
}

.home-title h1,
.home-title h2 {
  letter-spacing: 0.02em;
}

.home-title-card {
  padding: clamp(1.5rem, 3vh, 2.25rem);
}

.home-title-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(4.5rem, 9vw, 7.5rem);
  height: clamp(4.5rem, 9vw, 7.5rem);
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.home-title div {
  color: var(--onedark-comment);
}

.home-panel {
  background-color: var(--onedark-bg-secondary);
  border: 1px solid #2a2f37;
  box-shadow: none;
}

.home-btn {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid #30353f;
  background: var(--onedark-bg);
  color: var(--onedark-fg);
  transition: background-color 0.16s ease, border-color 0.16s ease, transform 0.12s ease;
  font-weight: 600;
}

.home-btn:hover {
  background: var(--onedark-selection);
  border-color: var(--onedark-accent);
}

.home-btn:active {
  transform: translateY(1px);
}

.home-primary {
  background: var(--onedark-accent);
  border-color: var(--onedark-accent);
  color: var(--onedark-bg);
  font-weight: 700;
}

.home-primary:hover {
  background: var(--onedark-keyword);
  border-color: var(--onedark-keyword);
}

.home-ghost {
  background: var(--onedark-bg-secondary);
  border-color: #30353f;
}

.tile-button {
  min-height: 5.25rem;
  padding-top: 0.875rem;
  padding-bottom: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.ai-markdown :deep(h1) {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0.5rem 0 0.25rem;
}

.ai-markdown :deep(h2) {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0.5rem 0 0.25rem;
}

.ai-markdown :deep(h3) {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0.5rem 0 0.25rem;
}

.ai-markdown :deep(p) {
  margin: 0.25rem 0;
}

.ai-markdown :deep(blockquote) {
  margin: 0.35rem 0;
  padding: 0.35rem 0.6rem;
  border-left: 3px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 0.5rem;
}

.ai-markdown :deep(a) {
  color: rgba(140, 200, 255, 0.95);
  text-decoration: underline;
}
</style>
