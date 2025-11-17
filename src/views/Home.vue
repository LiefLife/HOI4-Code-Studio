<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { openFileDialog, openProject, initializeProject, loadSettings, openUrl } from '../api/tauri'
import { checkForUpdates } from '../utils/version'

const router = useRouter()
const statusMessage = ref('')
const showStatus = ref(false)

// 当前版本
const CURRENT_VERSION = 'v0.1.3-dev'

// 更新提示
const showUpdateDialog = ref(false)
const updateInfo = ref<{ version: string; url: string } | null>(null)

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

// 处理最近项目
function handleRecentProjects() {
  router.push('/recent-projects')
}

// 处理设置
function handleSettings() {
  router.push('/settings')
}

// 检查更新
async function checkAppUpdates() {
  try {
    // 使用未认证访问
    const result = await checkForUpdates(CURRENT_VERSION, '')
    
    if (result.hasUpdate && result.latestVersion && result.releaseUrl) {
      updateInfo.value = {
        version: result.latestVersion,
        url: result.releaseUrl
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

// 组件挂载后显示欢迎消息并检查更新
onMounted(async () => {
  setTimeout(() => {
    displayStatus('欢迎使用 Hearts of Iron IV GUI Mod Editor', 3000)
  }, 500)
  
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
})
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center p-[2vh] bg-onedark-bg">
    <!-- 标题区域 -->
    <div class="text-center mb-[3vh]">
      <h1 class="font-bold text-onedark-fg text-shadow mb-[1vh]" style="font-size: clamp(1.5rem, 4vw, 3rem);">
        Hearts of Iron IV
      </h1>
      <h2 class="font-light text-onedark-comment text-shadow" style="font-size: clamp(1rem, 2.5vw, 1.875rem);">
        Code Studio
      </h2>
      <div class="mt-[1vh] text-onedark-comment" style="font-size: clamp(0.75rem, 1vw, 0.875rem);">
        v0.1.3-dev
      </div>
    </div>

    <!-- 主菜单卡片 -->
    <div class="card w-full max-w-[90vw] sm:max-w-md" style="display: flex; flex-direction: column; gap: clamp(0.5rem, 1.5vh, 1rem);">
      <!-- 创建新项目按钮 -->
      <button 
        @click="handleNewProject"
        class="btn-primary w-full text-lg"
        title="创建一个新的 GUI Mod 项目"
      >
        <div class="flex items-center justify-center space-x-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          <span>创建新项目</span>
        </div>
      </button>

      <!-- 打开现有项目按钮 -->
      <button 
        @click="handleOpenProject"
        class="btn-secondary w-full text-lg"
        title="打开已存在的 GUI Mod 项目"
      >
        <div class="flex items-center justify-center space-x-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path>
          </svg>
          <span>打开项目</span>
        </div>
      </button>

      <!-- 最近项目按钮 -->
      <button 
        @click="handleRecentProjects"
        class="btn-secondary w-full text-lg"
        title="查看最近打开的项目"
      >
        <div class="flex items-center justify-center space-x-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>最近项目</span>
        </div>
      </button>

      <!-- 分隔线 -->
      <div class="border-t border-onedark-border my-4"></div>

      <!-- 设置按钮 -->
      <button 
        @click="handleSettings"
        class="btn-secondary w-full"
        title="应用程序设置"
      >
        <div class="flex items-center justify-center space-x-3">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <span>设置</span>
        </div>
      </button>
    </div>

    <!-- 底部信息 -->
    <div class="mt-[3vh] text-center text-onedark-comment" style="font-size: clamp(0.625rem, 1vw, 0.875rem);">
      <p class="mt-[0.5vh]">基于 Tauri + Vue 3 构建</p>
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
  </div>
</template>

<style scoped>
/* 组件特定样式 */
</style>
