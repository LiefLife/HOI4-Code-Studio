<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { createNewProject, openFileDialog, loadSettings, saveSettings } from '../api/tauri'
import { logger } from '../utils/logger'

const router = useRouter()

// 表单数据
const projectName = ref('')
const version = ref('1.0.0')
const projectPath = ref('')

// Replace Path 选项（使用复选框）
const replacePathOptions = [
  { value: 'common', label: 'common' },
  { value: 'history/states', label: 'history/states' },
  { value: 'history/units', label: 'history/units' },
  { value: 'history/countries', label: 'history/countries' },
  { value: 'events', label: 'events' },
  { value: 'music', label: 'music' }
]
const selectedReplacePaths = ref<string[]>([])

// 状态
const showStatus = ref(false)
const statusMessage = ref('')
const isCreating = ref(false)

// 错误对话框
const showErrorDialog = ref(false)
const errorTitle = ref('')
const errorMessage = ref('')

// 显示状态消息
function displayStatus(message: string, duration: number = 3000) {
  statusMessage.value = message
  showStatus.value = true
  
  if (duration > 0) {
    setTimeout(() => {
      showStatus.value = false
    }, duration)
  }
}

// 显示错误对话框
function displayErrorDialog(title: string, message: string) {
  errorTitle.value = title
  errorMessage.value = message
  showErrorDialog.value = true
}

// 关闭错误对话框
function closeErrorDialog() {
  showErrorDialog.value = false
}

// 加载上次使用的项目路径
async function loadLastProjectPath() {
  try {
    const result = await loadSettings()
    if (result.success && result.data && typeof result.data === 'object' && 'lastProjectPath' in result.data) {
      projectPath.value = result.data.lastProjectPath as string
    }
  } catch (error) {
    logger.error('加载上次路径失败:', error)
  }
}

// 保存最后使用的项目路径
async function saveLastProjectPath(path: string) {
  try {
    const loadResult = await loadSettings()
    const settings = (loadResult.data as Record<string, unknown>) || {}
    settings.lastProjectPath = path
    await saveSettings(settings as any)
  } catch (error) {
    logger.error('保存路径失败:', error)
  }
}

// 选择项目路径
async function selectProjectPath() {
  const result = await openFileDialog('directory')
  if (result.success && result.path) {
    projectPath.value = result.path
    await saveLastProjectPath(result.path)
  }
}

// 提交表单
async function handleSubmit() {
  if (!projectName.value.trim()) {
    displayStatus('请填写所有必填项', 3000)
    return
  }
  
  if (!version.value.trim()) {
    displayStatus('请填写所有必填项', 3000)
    return
  }
  
  if (!projectPath.value) {
    displayStatus('请填写所有必填项', 3000)
    return
  }
  
  isCreating.value = true
  displayStatus('正在创建项目...', 0)
  
  try {
    const result = await createNewProject(
      projectName.value,
      version.value,
      projectPath.value,
      selectedReplacePaths.value
    )
    
    if (result.success) {
      await saveLastProjectPath(projectPath.value)
      displayStatus(result.message, 2000)
      setTimeout(() => {
        router.push({ name: 'editor', query: { path: result.project_path } })
      }, 2000)
    } else {
      displayErrorDialog('创建项目失败', result.message)
    }
  } catch (error) {
    displayErrorDialog('创建项目失败', String(error))
  } finally {
    isCreating.value = false
  }
}

// 返回主界面
function goBack() {
  router.push('/')
}

onMounted(() => {
  loadLastProjectPath()
})
</script>

<template>
  <div class="h-full w-full flex flex-col p-[2vh] bg-onedark-bg">
    <!-- 顶部栏 -->
    <div class="flex items-center mb-[3vh]">
      <button
        @click="goBack"
        class="btn-secondary flex items-center space-x-2"
        style="padding: clamp(0.5rem, 1vh, 0.75rem) clamp(1rem, 2vw, 1.5rem)"
        title="返回主界面"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        <span>返回</span>
      </button>
      <h1 class="ml-[3vw] font-bold text-onedark-fg" style="font-size: clamp(1.25rem, 2.5vw, 2rem)">
        创建新项目
      </h1>
    </div>

    <!-- 表单容器 -->
    <div class="flex-1 overflow-y-auto">
      <div class="card max-w-3xl mx-auto">
        <form @submit.prevent="handleSubmit" class="space-y-[2vh]">
          <!-- 项目名称 -->
          <div>
            <label for="project-name" class="block text-onedark-fg mb-[1vh]" style="font-size: clamp(0.875rem, 1.2vw, 1rem)">
              项目名称 <span class="text-red-400">*</span>
            </label>
            <input
              v-model="projectName"
              type="text"
              id="project-name"
              required
              placeholder="例如: MyAwesomeMod"
              class="input-field w-full"
              style="padding: clamp(0.5rem, 1vh, 0.75rem) clamp(0.75rem, 1.5vw, 1rem); font-size: clamp(0.875rem, 1.2vw, 1rem);"
            />
          </div>

          <!-- 项目版本 -->
          <div>
            <label for="project-version" class="block text-onedark-fg mb-[1vh]" style="font-size: clamp(0.875rem, 1.2vw, 1rem)">
              版本 <span class="text-red-400">*</span>
            </label>
            <input
              v-model="version"
              type="text"
              id="project-version"
              required
              placeholder="例如: 1.0.0"
              class="input-field w-full"
              style="padding: clamp(0.5rem, 1vh, 0.75rem) clamp(0.75rem, 1.5vw, 1rem); font-size: clamp(0.875rem, 1.2vw, 1rem);"
            />
          </div>

          <!-- 项目路径 -->
          <div>
            <label class="block text-onedark-fg mb-[1vh]" style="font-size: clamp(0.875rem, 1.2vw, 1rem)">
              项目路径 <span class="text-red-400">*</span>
            </label>
            <div class="flex space-x-2">
              <input
                v-model="projectPath"
                type="text"
                readonly
                placeholder="点击选择项目保存位置"
                class="input-field flex-1"
                style="padding: clamp(0.5rem, 1vh, 0.75rem) clamp(0.75rem, 1.5vw, 1rem); font-size: clamp(0.875rem, 1.2vw, 1rem);"
              />
              <button
                type="button"
                @click="selectProjectPath"
                class="btn-primary"
                style="padding: clamp(0.5rem, 1vh, 0.75rem) clamp(1rem, 2vw, 1.5rem)"
              >
                浏览
              </button>
            </div>
          </div>

          <!-- Replace Path 选项 -->
          <div>
            <label class="block text-onedark-fg mb-[1vh]" style="font-size: clamp(0.875rem, 1.2vw, 1rem)">
              Replace Path 目录替换
              <span class="text-onedark-comment text-xs ml-2">(可选，用于大型 Mod)</span>
            </label>
            <div class="space-y-[1vh] bg-onedark-bg-secondary p-[1.5vh] rounded-lg border-2 border-onedark-border">
              <label
                v-for="option in replacePathOptions"
                :key="option.value"
                class="flex items-center space-x-3 cursor-pointer hover:bg-onedark-selection p-[1vh] rounded transition-colors">
              >
                <input
                  type="checkbox"
                  :value="option.value"
                  v-model="selectedReplacePaths"
                  class="w-4 h-4 accent-onedark-accent">
                />
                <span style="font-size: clamp(0.75rem, 1vw, 0.875rem)">{{ option.label }}</span>
              </label>
            </div>
          </div>

          <!-- 提交按钮 -->
          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="goBack"
              class="btn-secondary"
              style="padding: clamp(0.75rem, 1.5vh, 1rem) clamp(1.5rem, 3vw, 2rem)"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="isCreating"
              class="btn-primary"
              :class="{ 'opacity-50 cursor-not-allowed': isCreating }"
              style="padding: clamp(0.75rem, 1.5vh, 1rem) clamp(1.5rem, 3vw, 2rem)"
            >
              {{ isCreating ? '创建中...' : '创建项目' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 状态提示 -->
    <div v-if="showStatus" class="fixed bottom-[2vh] right-[2vw] z-50">
      <div class="bg-onedark-bg-secondary border-2 border-onedark-border rounded-lg shadow-lg" style="padding: clamp(0.5rem, 1.5vh, 0.75rem) clamp(1rem, 3vw, 1.5rem); max-width: min(90vw, 24rem);">
        <p class="text-onedark-fg" style="font-size: clamp(0.75rem, 1.2vw, 0.875rem);">{{ statusMessage }}</p>
      </div>
    </div>

    <!-- 错误对话框 -->
    <div v-if="showErrorDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" @click="closeErrorDialog">
      <div class="bg-onedark-bg-secondary border-4 border-red-600 rounded-lg shadow-2xl max-w-md w-full mx-4" style="padding: clamp(1.5rem, 3vh, 2rem);" @click.stop>
        <div class="flex items-center mb-4">
          <svg class="w-8 h-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h2 class="text-onedark-fg font-bold" style="font-size: clamp(1.25rem, 2vw, 1.5rem);">{{ errorTitle }}</h2>
        </div>
        <p class="text-onedark-comment mb-6" style="font-size: clamp(0.875rem, 1.2vw, 1rem); line-height: 1.6;">{{ errorMessage }}</p>
        <button 
          @click="closeErrorDialog"
          class="w-full bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors" 
          style="padding: clamp(0.75rem, 1.5vh, 1rem); font-size: clamp(0.875rem, 1.2vw, 1rem);"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 组件特定样式 */
</style>
