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
  if (isCreating.value) {
    return
  }
  
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
  <div class="h-full w-full flex flex-col p-[2vh] bg-onedark-bg create-page">
    <!-- 顶部栏 -->
    <div class="flex items-center mb-[3vh] gap-3 create-header">
      <button
        @click="goBack"
        class="flat-btn ghost flex items-center gap-2"
        title="返回主界面"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        <span>返回</span>
      </button>
      <div>
        <p class="text-onedark-comment text-sm leading-tight">创建新HOICS项目</p>
        <h1 class="font-bold text-onedark-fg leading-tight" style="font-size: clamp(1.25rem, 2.5vw, 2rem)">
          创建新项目
        </h1>
      </div>
    </div>

    <!-- 表单容器 -->
    <div class="flex-1 overflow-y-auto">
      <div class="create-card max-w-3xl mx-auto">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- 项目名称 -->
          <div class="field">
            <label for="project-name" class="field-label">
              项目名称 <span class="text-red-400">*</span>
            </label>
            <input
              v-model="projectName"
              type="text"
              id="project-name"
              required
              placeholder="例如: MyAwesomeMod"
              class="flat-input w-full"
            />
            <p class="field-tip">用于生成 mod 目录名与描述文件，可随时在 mod 内调整。</p>
          </div>

          <!-- 项目版本 -->
          <div class="field">
            <label for="project-version" class="field-label">
              版本 <span class="text-red-400">*</span>
            </label>
            <input
              v-model="version"
              type="text"
              id="project-version"
              required
              placeholder="例如: 1.0.0"
              class="flat-input w-full"
            />
            <p class="field-tip">建议与游戏版本保持一致，方便后续管理与发布。</p>
          </div>

          <!-- 项目路径 -->
          <div class="field">
            <label class="field-label">
              项目路径 <span class="text-red-400">*</span>
            </label>
            <div class="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                v-model="projectPath"
                type="text"
                readonly
                placeholder="点击选择项目保存位置"
                class="flat-input flex-1"
              />
              <button
                type="button"
                @click="selectProjectPath"
                class="flat-btn primary md:w-auto w-full"
              >
                浏览
              </button>
            </div>
            <p class="field-tip">请选择空文件夹或新建目录，避免覆盖已有内容。</p>
          </div>

          <!-- Replace Path 选项 -->
          <div class="field">
            <div class="flex items-center gap-2 mb-2">
              <label class="field-label mb-0">
                Replace Path 目录替换
              </label>
              <span class="text-onedark-comment text-xs">(可选，用于大型 Mod)</span>
            </div>
            <div class="replace-box">
              <label
                v-for="option in replacePathOptions"
                :key="option.value"
                class="replace-item"
              >
                <input
                  type="checkbox"
                  :value="option.value"
                  v-model="selectedReplacePaths"
                  class="checkbox"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
            <p class="field-tip">勾选后会在对应目录生成 replace_path，适合覆盖原版同名资源。</p>
          </div>

          <!-- 提交按钮 -->
          <div class="action-bar">
            <button
              type="button"
              @click="goBack"
              class="flat-btn ghost"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="isCreating"
              class="flat-btn primary"
              :class="{ 'disabled': isCreating }"
            >
              {{ isCreating ? '创建中...' : '创建项目' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 状态提示 -->
    <div v-if="showStatus" class="fixed bottom-[2vh] right-[2vw] z-50">
      <div class="toast">
        <p>{{ statusMessage }}</p>
      </div>
    </div>

    <!-- 错误对话框 -->
    <div v-if="showErrorDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" @click="closeErrorDialog">
      <div class="create-card max-w-md w-full mx-4 border border-red-500/60" @click.stop>
        <div class="flex items-start gap-3 mb-3">
          <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h2 class="text-onedark-fg font-bold text-lg mb-1">{{ errorTitle }}</h2>
            <p class="text-onedark-comment text-sm leading-6">{{ errorMessage }}</p>
          </div>
        </div>
        <button 
          @click="closeErrorDialog"
          class="flat-btn primary w-full"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.create-page {
  gap: 0.75rem;
}

.create-header svg {
  color: var(--onedark-fg);
}

.create-card {
  background: var(--onedark-bg-secondary);
  border: 1px solid #2a2f37;
  border-radius: 0.75rem;
  box-shadow: none;
  padding: clamp(1.25rem, 2vw, 1.75rem);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  color: var(--onedark-fg);
  font-weight: 700;
  font-size: clamp(0.95rem, 1.1vw, 1.05rem);
  margin-bottom: 0.25rem;
}

.field-tip {
  color: var(--onedark-comment);
  font-size: 0.85rem;
  line-height: 1.6;
}

.flat-input {
  background: var(--onedark-bg);
  border: 1px solid #2f343d;
  border-radius: 0.6rem;
  padding: 0.75rem 0.9rem;
  color: var(--onedark-fg);
  font-size: 0.95rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.flat-input:focus {
  outline: none;
  border-color: var(--onedark-accent);
  background: var(--onedark-bg-secondary);
}

.flat-btn {
  border: 1px solid #2f343d;
  border-radius: 0.6rem;
  padding: 0.75rem 1.2rem;
  background: var(--onedark-bg-secondary);
  color: var(--onedark-fg);
  font-weight: 700;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  text-align: center;
}

.flat-btn:hover {
  background: var(--onedark-selection);
  border-color: var(--onedark-accent);
}

.flat-btn:active {
  transform: translateY(1px);
}

.flat-btn.primary {
  background: var(--onedark-accent);
  border-color: var(--onedark-accent);
  color: var(--onedark-bg);
}

.flat-btn.primary:hover {
  background: var(--onedark-keyword);
  border-color: var(--onedark-keyword);
}

.flat-btn.ghost {
  background: var(--onedark-bg);
  border-color: #2f343d;
  color: var(--onedark-fg);
}

.flat-btn.disabled,
.flat-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.replace-box {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.5rem;
  background: var(--onedark-bg);
  border: 1px solid #2f343d;
  border-radius: 0.75rem;
  padding: 0.75rem;
}

.replace-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  border-radius: 0.6rem;
  color: var(--onedark-fg);
  border: 1px solid transparent;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.replace-item:hover {
  background: var(--onedark-selection);
  border-color: var(--onedark-accent);
}

.replace-item span {
  font-size: 0.9rem;
}

.checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: var(--onedark-accent);
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.toast {
  background: var(--onedark-bg-secondary);
  border: 1px solid #2a2f37;
  border-radius: 0.75rem;
  padding: 0.75rem 1.25rem;
  color: var(--onedark-fg);
  font-size: 0.9rem;
  box-shadow: none;
}

@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
  }

  .action-bar .flat-btn {
    width: 100%;
  }
}
</style>
