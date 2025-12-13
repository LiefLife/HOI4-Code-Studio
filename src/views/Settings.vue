<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { loadSettings, saveSettings, openUrl } from '../api/tauri'
import { useTheme, themes } from '../composables/useTheme'
import { useFileTreeIcons, iconSets } from '../composables/useFileTreeIcons'
import { getDefaultMenuItem } from '../data/settingsMenu'

// 导入子组件
import SettingsSidebar from '../components/settings/SettingsSidebar.vue'
import SettingsCard from '../components/settings/SettingsCard.vue'
import GameDirectorySettings from '../components/settings/GameDirectorySettings.vue'
import GameLaunchSettings from '../components/settings/GameLaunchSettings.vue'
import RecentProjectsSettings from '../components/settings/RecentProjectsSettings.vue'
import EditorFontSettings from '../components/settings/EditorFontSettings.vue'
import EditorSaveSettings from '../components/settings/EditorSaveSettings.vue'
import ThemeSettings from '../components/settings/ThemeSettings.vue'
import IconSettings from '../components/settings/IconSettings.vue'
import UpdateSettings from '../components/settings/UpdateSettings.vue'
import VersionInfoSettings from '../components/settings/VersionInfoSettings.vue'

// 主题系统
const { currentThemeId } = useTheme()

// 图标系统
const { currentIconSetId } = useFileTreeIcons()

const router = useRouter()

// 当前选中的菜单项
const activeMenuItem = ref(getDefaultMenuItem())

// 处理菜单点击
function handleMenuItemClick(itemId: string) {
  activeMenuItem.value = itemId
}

// 设置数据
const gameDirectory = ref('')
const checkForUpdatesOnStartup = ref(true)
const recentProjectsLayout = ref<'four-columns' | 'three-columns' | 'two-columns' | 'one-column' | 'masonry'>('four-columns')

const autoSave = ref(true)
const disableErrorHandling = ref(false)
const enableRGBColorDisplay = ref(true)

// 编辑器字体设置
import { useEditorFont } from '../composables/useEditorFont'
const { 
  fontConfig, 
  setFontConfig 
} = useEditorFont()



// 游戏启动设置
const useSteamVersion = ref(true)
const usePirateVersion = ref(false)
const pirateExecutable = ref<'dowser' | 'hoi4'>('dowser')
const launchWithDebug = ref(false)

// 状态
const showStatus = ref(false)
const statusMessage = ref('')
const isSaving = ref(false)
// 确认提示
const showConfirmDialog = ref(false)
const pendingDisableErrorHandling = ref(false)

// 版本信息
const CURRENT_VERSION = 'v0.2.11-dev'
const currentVersion = ref(CURRENT_VERSION)
const githubVersion = ref('检查中...')
const isCheckingUpdate = ref(false)
const isInitializing = ref(true)

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
    useSteamVersion.value = data.useSteamVersion !== false
    usePirateVersion.value = data.usePirateVersion || false
    pirateExecutable.value = data.pirateExecutable || 'dowser'
    launchWithDebug.value = data.launchWithDebug || false
    autoSave.value = data.autoSave !== false
    disableErrorHandling.value = data.disableErrorHandling || false
    enableRGBColorDisplay.value = data.enableRGBColorDisplay !== false
    // 加载编辑器字体设置
    if (data.editorFont) {
      setFontConfig(data.editorFont)
    } else {
      // 兼容旧的字体设置格式
      setFontConfig({
        family: data.editorFontFamily || 'Consolas',
        size: data.editorFontSize || 14,
        weight: data.editorFontWeight || '400'
      })
    }
    // 加载主题设置
    if (data.theme && themes.some(t => t.id === data.theme)) {
      currentThemeId.value = data.theme
    }
    
    // 加载图标设置
    if (data.iconSet && iconSets.some(set => set.id === data.iconSet)) {
      currentIconSetId.value = data.iconSet
    }
  }
}



// 保存设置（静默保存，仅在失败时提示）
async function handleSave() {
  isSaving.value = true
  
  const settings = {
    gameDirectory: gameDirectory.value,
    checkForUpdates: checkForUpdatesOnStartup.value,
    recentProjectsLayout: recentProjectsLayout.value,
    useSteamVersion: useSteamVersion.value,
    usePirateVersion: usePirateVersion.value,
    pirateExecutable: pirateExecutable.value,
    launchWithDebug: launchWithDebug.value,
    autoSave: autoSave.value,
    disableErrorHandling: disableErrorHandling.value,
    enableRGBColorDisplay: enableRGBColorDisplay.value,
    theme: currentThemeId.value,
    iconSet: currentIconSetId.value,
    editorFont: fontConfig.value
  }
  
  const result = await saveSettings(settings)
  
  // 只在保存失败时显示提示
  if (!result.success) {
    displayStatus(`保存失败: ${result.message}`, 3000)
  }
  
  isSaving.value = false
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

// 监听错误处理开关变化，需要确认
watch(disableErrorHandling, async (newValue, oldValue) => {
  // 忽略初始加载时的变化（从undefined到具体值）
  if (oldValue === undefined) {
    return
  }
  
  // 如果正在初始化，不触发任何操作
  if (isInitializing.value) {
    return
  }
  
  // 如果当前正在处理确认对话框，不重复触发
  if (pendingDisableErrorHandling.value) {
    return
  }
  
  if (newValue && !oldValue) {
    // 用户尝试启用（关闭错误处理），显示确认提示
    pendingDisableErrorHandling.value = true
    showConfirmDialog.value = true
  } else {
    // 直接保存
    await handleSave()
  }
})

// 确认禁用错误处理
async function confirmDisableErrorHandling() {
  disableErrorHandling.value = true
  pendingDisableErrorHandling.value = false
  showConfirmDialog.value = false
  await handleSave()
}

// 取消禁用错误处理
function cancelDisableErrorHandling() {
  disableErrorHandling.value = false
  pendingDisableErrorHandling.value = false
  showConfirmDialog.value = false
}

onMounted(async () => {
  await loadUserSettings()
  // 初始化完成后，标记为false
  isInitializing.value = false
})
</script>

<template>
  <div class="settings-container">
    <!-- 左侧菜单 -->
    <div class="settings-sidebar">
      <SettingsSidebar 
        :active-item="activeMenuItem"
        @item-click="handleMenuItemClick"
      />
    </div>

    <!-- 右侧内容区 -->
    <div class="settings-main">
      <!-- 顶部栏 -->
      <div class="settings-header">
        <button
          @click="goBack"
          class="btn-secondary flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          <span>返回</span>
        </button>
        <h1 class="ml-6 font-bold text-hoi4-text text-2xl">
          设置
        </h1>
      </div>

      <!-- 设置内容 -->
      <div class="settings-content">
        <div class="settings-content-inner">
          <!-- 游戏目录设置 -->
          <SettingsCard 
            v-if="activeMenuItem === 'game-directory'"
            title="HOI4 游戏目录"
            description="选择 Hearts of Iron IV 游戏安装目录"
          >
            <GameDirectorySettings 
              v-model="gameDirectory"
              @status-message="displayStatus"
            />
          </SettingsCard>

          <!-- 游戏启动设置 -->
          <SettingsCard 
            v-if="activeMenuItem === 'game-launch'"
            title="游戏启动设置"
            description="配置游戏启动方式和参数"
          >
            <GameLaunchSettings 
              :use-steam-version="useSteamVersion"
              :use-pirate-version="usePirateVersion"
              :pirate-executable="pirateExecutable"
              :launch-with-debug="launchWithDebug"
              @update:useSteamVersion="useSteamVersion = $event"
              @update:usePirateVersion="usePirateVersion = $event"
              @update:pirateExecutable="pirateExecutable = $event"
              @update:launchWithDebug="launchWithDebug = $event"
              @save="handleSave"
            />
          </SettingsCard>

          <!-- 最近项目设置 -->
          <SettingsCard 
            v-if="activeMenuItem === 'recent-projects'"
            title="最近项目显示"
            description="设置最近项目的布局方式"
          >
            <RecentProjectsSettings 
              v-model="recentProjectsLayout"
              @save="handleSave"
            />
          </SettingsCard>

          <!-- 编辑器字体设置 -->
          <SettingsCard 
            v-if="activeMenuItem === 'editor-font'"
            title="编辑器字体设置"
            description="自定义编辑器字体样式"
          >
            <EditorFontSettings 
              @save="handleSave"
            />
          </SettingsCard>

          <!-- 保存设置 -->
          <SettingsCard 
            v-if="activeMenuItem === 'editor-save'"
            title="保存设置"
            description="配置自动保存和错误处理"
          >
            <EditorSaveSettings 
              :autoSave="autoSave"
              :disableErrorHandling="disableErrorHandling"
              :enableRGBColorDisplay="enableRGBColorDisplay"
              @update:autoSave="autoSave = $event"
              @update:disableErrorHandling="disableErrorHandling = $event"
              @update:enableRGBColorDisplay="enableRGBColorDisplay = $event"
              @save="handleSave"
              @confirm-disable-error-handling="showConfirmDialog = true"
            />
          </SettingsCard>

          <!-- 主题设置 -->
          <SettingsCard 
            v-if="activeMenuItem === 'theme'"
            title="界面主题"
            description="选择应用界面主题"
          >
            <ThemeSettings />
          </SettingsCard>

          <!-- 图标设置 -->
          <SettingsCard 
            v-if="activeMenuItem === 'icons'"
            title="文件树图标"
            description="选择文件树图标样式"
          >
            <IconSettings />
          </SettingsCard>

          <!-- 更新设置 -->
          <SettingsCard 
            v-if="activeMenuItem === 'update-settings'"
            title="更新设置"
            description="配置应用更新选项"
          >
            <UpdateSettings 
              :check-for-updates-on-startup="checkForUpdatesOnStartup"
              @update:checkForUpdatesOnStartup="checkForUpdatesOnStartup = $event"
              @save="handleSave"
            />
          </SettingsCard>

          <!-- 版本信息 -->
          <SettingsCard 
            v-if="activeMenuItem === 'version-info'"
            title="版本信息"
            description="查看当前版本和检查更新"
          >
            <VersionInfoSettings 
              :current-version="currentVersion"
              :github-version="githubVersion"
              :is-checking-update="isCheckingUpdate"
              @update:githubVersion="githubVersion = $event"
              @update:isCheckingUpdate="isCheckingUpdate = $event"
              @status-message="displayStatus"
              @show-update-dialog="(info) => { updateInfo = info; showUpdateDialog = true }"
            />
          </SettingsCard>
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

    <!-- 确认提示对话框 -->
    <div 
      v-if="showConfirmDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="cancelDisableErrorHandling"
    >
      <div class="card max-w-md mx-4">
        <div class="space-y-4">
          <div class="flex items-start space-x-3">
            <svg class="w-8 h-8 text-hoi4-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <div class="flex-1">
              <h3 class="text-xl font-bold text-hoi4-text mb-2">确认禁用错误处理</h3>
            </div>
          </div>
          
          <p class="text-hoi4-text">
            禁用错误处理功能将关闭所有错误检查和提示，可能导致代码质量问题。确定要继续吗？
          </p>
          
          <div class="flex space-x-3 pt-2">
            <button
              @click="confirmDisableErrorHandling"
              class="btn-primary flex-1"
            >
              确定
            </button>
            <button
              @click="cancelDisableErrorHandling"
              class="btn-secondary flex-1"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
