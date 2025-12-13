<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { openFileDialog, openProject, initializeProject, loadSettings, openUrl } from '../api/tauri'
import { checkForUpdates } from '../utils/version'
import ChangelogPanel from '../components/ChangelogPanel.vue'

const router = useRouter()
const statusMessage = ref('')
const showStatus = ref(false)

// 当前版本
const CURRENT_VERSION = 'v0.2.11-dev'

// 更新提示
const showUpdateDialog = ref(false)
const updateInfo = ref<{ version: string; url: string } | null>(null)

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

// 处理最近项目
function handleRecentProjects() {
  router.push('/recent-projects')
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
})
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center p-[2vh] bg-onedark-bg">
    <!-- 标题区域 -->
    <div class="text-center mb-[3vh]">
      <!-- 应用图标 -->
      <div class="flex justify-center mb-[2vh]">
        <img 
          src="/HOICS.png" 
          alt="HOI4 Code Studio" 
          class="w-[clamp(4rem,10vw,8rem)] h-[clamp(4rem,10vw,8rem)] drop-shadow-lg"
        />
      </div>
      <h1 class="font-bold text-onedark-fg text-shadow mb-[1vh]" style="font-size: clamp(1.5rem, 4vw, 3rem);">
        Hearts of Iron IV
      </h1>
      <h2 class="font-light text-onedark-comment text-shadow" style="font-size: clamp(1rem, 2.5vw, 1.875rem);">
        Code Studio
      </h2>
      <div class="mt-[1vh] text-onedark-comment" style="font-size: clamp(0.75rem, 1vw, 0.875rem);">
        v0.2.11-dev
      </div>
    </div>

    <!-- 磁铁式按钮布局 -->
    <div class="w-full max-w-[90vw] sm:max-w-2xl">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 左侧按钮组 -->
        <div class="card flex flex-col gap-4">
          <h3 class="text-lg font-bold text-onedark-fg text-center mb-2">项目操作</h3>

          <div class="grid grid-cols-2 gap-3">
            <!-- 创建新项目按钮（占两列，视觉上作为主入口） -->
            <button
              @click="handleNewProject"
              class="btn-primary w-full hover-scale tile-button col-span-2"
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
              class="btn-secondary w-full hover-scale tile-button"
              title="打开已存在的 GUI Mod 项目"
            >
              <div class="flex flex-col items-center justify-center gap-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path>
                </svg>
                <span class="text-sm font-semibold">打开项目</span>
              </div>
            </button>

            <!-- 最近项目按钮 -->
            <button
              @click="handleRecentProjects"
              class="btn-secondary w-full hover-scale tile-button"
              title="查看最近打开的项目"
            >
              <div class="flex flex-col items-center justify-center gap-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-sm font-semibold">最近项目</span>
              </div>
            </button>
          </div>
        </div>

        <!-- 右侧按钮组 -->
        <div class="card flex flex-col gap-4">
          <h3 class="text-lg font-bold text-onedark-fg text-center mb-2">应用功能</h3>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <!-- 文档按钮 -->
            <button
              @click="handleDocumentation"
              class="btn-secondary w-full hover-scale tile-button"
              title="查看使用文档"
            >
              <div class="flex flex-col items-center justify-center gap-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 4h.01M8 4h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
                </svg>
                <span class="text-sm font-semibold">文档</span>
              </div>
            </button>

            <button
              @click="handleContribute"
              class="btn-secondary w-full hover-scale tile-button"
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
              class="btn-secondary w-full hover-scale tile-button"
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
              class="btn-secondary w-full hover-scale tile-button"
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
              class="btn-secondary w-full hover-scale tile-button"
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
/* 悬停放大动画 */
.hover-scale {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hover-scale:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.hover-scale:active {
  transform: scale(0.98);
  transition: transform 0.1s ease;
}

.tile-button {
  min-height: 5.5rem;
  padding-top: 0.875rem;
  padding-bottom: 0.875rem;
}
</style>
