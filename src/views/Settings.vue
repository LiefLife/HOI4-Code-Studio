<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { loadSettings, saveSettings, validateGameDirectory, openFileDialog, openUrl } from '../api/tauri'
import { checkForUpdates } from '../utils/version'
import { useTheme, themes } from '../composables/useTheme'

// 主题系统
const { currentThemeId, setTheme } = useTheme()

const router = useRouter()

// 设置数据
const gameDirectory = ref('')
const checkForUpdatesOnStartup = ref(true)
const recentProjectsLayout = ref<'four-columns' | 'three-columns' | 'two-columns' | 'one-column' | 'masonry'>('four-columns')
const configLocation = ref<'appdata' | 'portable'>('appdata')
const autoSave = ref(true)

// 游戏启动设置
const useSteamVersion = ref(true)
const usePirateVersion = ref(false)
const pirateExecutable = ref<'dowser' | 'hoi4'>('dowser')

// 状态
const showStatus = ref(false)
const statusMessage = ref('')
const isSaving = ref(false)

// 版本信息
const CURRENT_VERSION = 'v0.2.5-dev'
const currentVersion = ref(CURRENT_VERSION)
const githubVersion = ref('检查中...')
const isCheckingUpdate = ref(false)

// 更新对话框
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

// 加载设置
async function loadUserSettings() {
  const result = await loadSettings()
  if (result.success && result.data) {
    const data = result.data as any
    gameDirectory.value = data.gameDirectory || ''
    checkForUpdatesOnStartup.value = data.checkForUpdates !== false
    recentProjectsLayout.value = data.recentProjectsLayout || 'four-columns'
    configLocation.value = data.configLocation || 'appdata'
    useSteamVersion.value = data.useSteamVersion !== false
    usePirateVersion.value = data.usePirateVersion || false
    pirateExecutable.value = data.pirateExecutable || 'dowser'
    autoSave.value = data.autoSave !== false
    // 加载主题设置
    if (data.theme && themes.some(t => t.id === data.theme)) {
      currentThemeId.value = data.theme
    }
  }
}

// 选择游戏目录
async function selectGameDirectory() {
  const result = await openFileDialog('directory')
  if (result.success && result.path) {
    const validation = await validateGameDirectory(result.path)
    if (validation.valid) {
      gameDirectory.value = result.path
      displayStatus('游戏目录验证成功', 2000)
    } else {
      displayStatus(`无效的游戏目录: ${validation.message}`, 3000)
    }
  }
}

// 清除游戏目录
function clearGameDirectory() {
  gameDirectory.value = ''
  displayStatus('游戏目录已清除', 2000)
}

// 保存设置（静默保存，仅在失败时提示）
async function handleSave() {
  isSaving.value = true
  
  const settings = {
    gameDirectory: gameDirectory.value,
    checkForUpdates: checkForUpdatesOnStartup.value,
    recentProjectsLayout: recentProjectsLayout.value,
    configLocation: configLocation.value,
    useSteamVersion: useSteamVersion.value,
    usePirateVersion: usePirateVersion.value,
    pirateExecutable: pirateExecutable.value,
    autoSave: autoSave.value,
    theme: currentThemeId.value
  }
  
  const result = await saveSettings(settings)
  
  // 只在保存失败时显示提示
  if (!result.success) {
    displayStatus(`保存失败: ${result.message}`, 3000)
  }
  
  isSaving.value = false
}

// 手动检查更新
async function handleCheckUpdate() {
  isCheckingUpdate.value = true
  githubVersion.value = '检查中...'
  
  try {
    // 使用未认证访问
    const result = await checkForUpdates(CURRENT_VERSION, '', false)
    
    if (result.error) {
      githubVersion.value = '检查失败'
      displayStatus(`检查更新失败: ${result.error}`, 3000)
    } else if (result.latestVersion) {
      githubVersion.value = result.latestVersion
      
      if (result.hasUpdate && result.releaseUrl) {
        updateInfo.value = {
          version: result.latestVersion,
          url: result.releaseUrl
        }
        showUpdateDialog.value = true
      } else {
        displayStatus('当前已是最新版本', 2000)
      }
    }
  } catch (error) {
    githubVersion.value = '检查失败'
    displayStatus('检查更新失败', 3000)
  } finally {
    isCheckingUpdate.value = false
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

// 返回主界面（自动保存）
async function goBack() {
  // 自动保存设置
  await handleSave()
  router.push('/')
}

// 监听自动保存开关变化，立即保存
watch(autoSave, async () => {
  await handleSave()
})

onMounted(async () => {
  await loadUserSettings()
  // 自动检查一次GitHub版本
  handleCheckUpdate()
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
        设置
      </h1>
    </div>

    <!-- 设置表单 -->
    <div class="flex-1 overflow-y-auto">
      <div class="card max-w-3xl mx-auto space-y-6">
        <!-- 游戏目录 -->
        <div>
          <label class="block text-hoi4-text mb-2 text-lg font-semibold">
            HOI4 游戏目录
          </label>
          <div class="flex space-x-2">
            <input
              v-model="gameDirectory"
              type="text"
              readonly
              placeholder="选择 Hearts of Iron IV 游戏目录"
              class="input-field flex-1"
            />
            <button
              type="button"
              @click="selectGameDirectory"
              class="btn-primary px-6"
            >
              浏览
            </button>
            <button
              v-if="gameDirectory"
              type="button"
              @click="clearGameDirectory"
              class="btn-secondary px-4"
              title="清除游戏目录"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- 游戏启动设置 -->
        <div class="space-y-4">
          <h2 class="text-hoi4-text text-lg font-semibold">游戏启动设置</h2>
          
          <label class="flex items-center space-x-3 cursor-pointer">
            <input
              v-model="useSteamVersion"
              type="radio"
              name="gameVersion"
              :value="true"
              @change="usePirateVersion = false"
              class="w-5 h-5 border-2 border-hoi4-border"
            />
            <span class="text-hoi4-text">使用 Steam 版本启动</span>
          </label>

          <label class="flex items-center space-x-3 cursor-pointer">
            <input
              v-model="usePirateVersion"
              type="radio"
              name="gameVersion"
              :value="true"
              @change="useSteamVersion = false"
              class="w-5 h-5 border-2 border-hoi4-border"
            />
            <span class="text-hoi4-text">使用学习版启动</span>
          </label>

          <div v-if="usePirateVersion" class="ml-8 space-y-3">
            <!-- 启动程序选择 -->
            <div>
              <label class="block text-hoi4-text mb-2 text-sm font-semibold">
                选择启动程序
              </label>
              <div class="flex space-x-3">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input
                    v-model="pirateExecutable"
                    type="radio"
                    value="dowser"
                    class="w-4 h-4 border-2 border-hoi4-border"
                  />
                  <span class="text-hoi4-text">dowser.exe</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input
                    v-model="pirateExecutable"
                    type="radio"
                    value="hoi4"
                    class="w-4 h-4 border-2 border-hoi4-border"
                  />
                  <span class="text-hoi4-text">hoi4.exe</span>
                </label>
              </div>
            </div>
            <!-- 提示信息 -->
            <div class="p-3 bg-hoi4-gray rounded-lg border border-hoi4-border">
              <div class="flex items-start space-x-2">
                <svg class="w-5 h-5 text-hoi4-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div class="text-hoi4-comment text-sm">
                  <strong class="text-hoi4-text">提示：</strong>学习版启动将使用上方设置的 HOI4 游戏目录，请确保该目录包含 {{ pirateExecutable }}.exe 文件。
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 应用设置 -->
        <div class="space-y-4">
          <h2 class="text-hoi4-text text-lg font-semibold">应用设置</h2>

          <!-- 主题选择 -->
          <div>
            <label class="block text-hoi4-text mb-2 text-base font-semibold">
              界面主题
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                v-for="theme in themes"
                :key="theme.id"
                @click="setTheme(theme.id)"
                class="relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-[1.02]"
                :class="[
                  currentThemeId === theme.id
                    ? 'border-hoi4-accent ring-2 ring-hoi4-accent ring-opacity-50'
                    : 'border-hoi4-border hover:border-hoi4-accent'
                ]"
                :style="{ backgroundColor: theme.colors.bgSecondary }"
              >
                <!-- 主题预览色块 -->
                <div class="flex space-x-1 mb-2 justify-center">
                  <div
                    class="w-3 h-3 rounded"
                    :style="{ backgroundColor: theme.colors.accent }"
                  ></div>
                  <div
                    class="w-3 h-3 rounded"
                    :style="{ backgroundColor: theme.colors.success }"
                  ></div>
                  <div
                    class="w-3 h-3 rounded"
                    :style="{ backgroundColor: theme.colors.warning }"
                  ></div>
                  <div
                    class="w-3 h-3 rounded"
                    :style="{ backgroundColor: theme.colors.error }"
                  ></div>
                </div>
                <!-- 主题名称 -->
                <div
                  class="text-xs font-medium text-center"
                  :style="{ color: theme.colors.fg }"
                >
                  {{ theme.name }}
                </div>
                <!-- 当前选中标记 -->
                <div
                  v-if="currentThemeId === theme.id"
                  class="absolute top-1 right-1"
                >
                  <svg
                    class="w-4 h-4"
                    :style="{ color: theme.colors.accent }"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </div>
              </button>
            </div>
            <p class="text-hoi4-comment text-sm mt-2">
              在编辑器中可按 <kbd class="px-1.5 py-0.5 rounded bg-hoi4-gray border border-hoi4-border text-hoi4-text">Ctrl+Shift+T</kbd> 快速切换主题
            </p>
          </div>
          
          <label class="flex items-center space-x-3 cursor-pointer">
            <input
              v-model="checkForUpdatesOnStartup"
              type="checkbox"
              class="w-5 h-5 rounded border-2 border-hoi4-border bg-hoi4-accent"
            />
            <span class="text-hoi4-text">启动时检查更新</span>
          </label>

          <label class="flex items-center space-x-3 cursor-pointer">
            <input
              v-model="autoSave"
              type="checkbox"
              class="w-5 h-5 rounded border-2 border-hoi4-border bg-hoi4-accent"
            />
            <div class="flex-1">
              <span class="text-hoi4-text">启用自动保存</span>
              <p class="text-hoi4-comment text-sm mt-1">编辑文件时自动保存更改</p>
            </div>
          </label>

          <!-- 配置文件保存位置 -->
          <div>
            <label class="block text-hoi4-text mb-3 text-base font-semibold">
              配置文件保存位置
            </label>
            <div class="space-y-3">
              <label 
                class="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-colors"
                :class="configLocation === 'appdata' ? 'border-hoi4-accent bg-hoi4-gray' : 'border-hoi4-border hover:border-hoi4-accent'"
              >
                <input
                  type="radio"
                  v-model="configLocation"
                  value="appdata"
                  class="mt-1 w-5 h-5 flex-shrink-0"
                />
                <div class="flex-1">
                  <div class="text-hoi4-text font-semibold mb-1">AppData（推荐）</div>
                  <div class="text-hoi4-comment text-sm">
                    保存到系统配置目录，适合单用户使用。配置文件不会随程序移动而丢失。
                  </div>
                  <div class="text-hoi4-text-dim text-xs mt-1 font-mono">
                    Windows: %APPDATA%\HOI4_GUI_Editor\
                  </div>
                </div>
              </label>

              <label 
                class="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-colors"
                :class="configLocation === 'portable' ? 'border-hoi4-accent bg-hoi4-gray' : 'border-hoi4-border hover:border-hoi4-accent'"
              >
                <input
                  type="radio"
                  v-model="configLocation"
                  value="portable"
                  class="mt-1 w-5 h-5 flex-shrink-0"
                />
                <div class="flex-1">
                  <div class="text-hoi4-text font-semibold mb-1">便携模式</div>
                  <div class="text-hoi4-comment text-sm">
                    保存到程序所在目录，适合U盘等便携设备。移动程序时配置会一起移动。
                  </div>
                  <div class="text-hoi4-text-dim text-xs mt-1 font-mono">
                    程序目录\config\settings.json
                  </div>
                </div>
              </label>
            </div>
            <div class="mt-2 p-3 bg-hoi4-gray rounded-lg border border-hoi4-border">
              <div class="flex items-start space-x-2">
                <svg class="w-5 h-5 text-hoi4-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div class="text-hoi4-comment text-sm">
                  <strong class="text-hoi4-text">注意：</strong>更改此设置需要重启应用才能生效。现有配置文件不会自动迁移。
                </div>
              </div>
            </div>
          </div>

          <!-- 版本信息区域 -->
          <div class="border-2 border-hoi4-border rounded-lg p-4 bg-hoi4-gray">
            <div class="flex items-start space-x-4">
              <!-- 左侧：手动检查更新按钮 -->
              <button
                @click="handleCheckUpdate"
                :disabled="isCheckingUpdate"
                class="btn-primary px-4 py-2 flex-shrink-0"
                :class="{ 'opacity-50 cursor-not-allowed': isCheckingUpdate }"
              >
                <div class="flex items-center space-x-2">
                  <svg 
                    v-if="!isCheckingUpdate"
                    class="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  <svg 
                    v-else
                    class="w-5 h-5 animate-spin" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  <span>{{ isCheckingUpdate ? '检查中...' : '检查更新' }}</span>
                </div>
              </button>

              <!-- 右侧：版本信息 -->
              <div class="flex-1 space-y-2">
                <div class="flex items-center space-x-2">
                  <span class="text-hoi4-comment">当前版本:</span>
                  <span class="text-hoi4-text font-semibold">{{ currentVersion }}</span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-hoi4-comment">GitHub版本:</span>
                  <span class="text-hoi4-text font-semibold">{{ githubVersion }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 最近项目显示方式 -->
          <div>
            <label class="block text-hoi4-text mb-3 text-base font-semibold">
              最近项目显示方式
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <label 
                class="relative cursor-pointer"
                :class="{ 'ring-2 ring-hoi4-accent': recentProjectsLayout === 'four-columns' }"
              >
                <input
                  type="radio"
                  v-model="recentProjectsLayout"
                  value="four-columns"
                  class="sr-only"
                />
                <div class="card p-3 text-center hover:border-hoi4-accent transition-colors">
                  <svg class="w-8 h-8 mx-auto mb-2 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
                  </svg>
                  <span class="text-hoi4-text text-sm">四列</span>
                  <span v-if="recentProjectsLayout === 'four-columns'" class="block text-hoi4-accent text-xs mt-1">默认</span>
                </div>
              </label>

              <label 
                class="relative cursor-pointer"
                :class="{ 'ring-2 ring-hoi4-accent': recentProjectsLayout === 'three-columns' }"
              >
                <input
                  type="radio"
                  v-model="recentProjectsLayout"
                  value="three-columns"
                  class="sr-only"
                />
                <div class="card p-3 text-center hover:border-hoi4-accent transition-colors">
                  <svg class="w-8 h-8 mx-auto mb-2 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z"></path>
                  </svg>
                  <span class="text-hoi4-text text-sm">三列</span>
                </div>
              </label>

              <label 
                class="relative cursor-pointer"
                :class="{ 'ring-2 ring-hoi4-accent': recentProjectsLayout === 'two-columns' }"
              >
                <input
                  type="radio"
                  v-model="recentProjectsLayout"
                  value="two-columns"
                  class="sr-only"
                />
                <div class="card p-3 text-center hover:border-hoi4-accent transition-colors">
                  <svg class="w-8 h-8 mx-auto mb-2 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z"></path>
                  </svg>
                  <span class="text-hoi4-text text-sm">二列</span>
                </div>
              </label>

              <label 
                class="relative cursor-pointer"
                :class="{ 'ring-2 ring-hoi4-accent': recentProjectsLayout === 'one-column' }"
              >
                <input
                  type="radio"
                  v-model="recentProjectsLayout"
                  value="one-column"
                  class="sr-only"
                />
                <div class="card p-3 text-center hover:border-hoi4-accent transition-colors">
                  <svg class="w-8 h-8 mx-auto mb-2 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                  </svg>
                  <span class="text-hoi4-text text-sm">一列</span>
                </div>
              </label>

              <label 
                class="relative cursor-pointer"
                :class="{ 'ring-2 ring-hoi4-accent': recentProjectsLayout === 'masonry' }"
              >
                <input
                  type="radio"
                  v-model="recentProjectsLayout"
                  value="masonry"
                  class="sr-only"
                />
                <div class="card p-3 text-center hover:border-hoi4-accent transition-colors">
                  <svg class="w-8 h-8 mx-auto mb-2 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"></path>
                  </svg>
                  <span class="text-hoi4-text text-sm">磁吸</span>
                </div>
              </label>
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

    <!-- 更新提示对话框 -->
    <div 
      v-if="showUpdateDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeUpdateDialog"
    >
      <div class="card max-w-md mx-4">
        <div class="space-y-4">
          <div class="flex items-start space-x-3">
            <svg class="w-8 h-8 text-hoi4-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <div class="flex-1">
              <h3 class="text-xl font-bold text-hoi4-text mb-2">发现新版本</h3>
              <p class="text-hoi4-comment mb-1">当前版本: {{ currentVersion }}</p>
              <p class="text-hoi4-accent font-semibold">最新版本: {{ updateInfo?.version }}</p>
            </div>
          </div>
          
          <p class="text-hoi4-text">
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
