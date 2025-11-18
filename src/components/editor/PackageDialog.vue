<script setup lang="ts">
import { ref, computed } from 'vue'
import { openFolder } from '../../api/tauri'

defineProps<{
  visible: boolean
  projectName?: string
}>()

const emit = defineEmits<{
  close: []
  confirm: [fileName: string]
}>()

const fileName = ref('project.zip')
const isPacking = ref(false)
const packProgress = ref('')
const packResult = ref<{ success: boolean; message: string; outputPath?: string } | null>(null)

// 验证文件名
const fileNameError = computed(() => {
  if (!fileName.value.trim()) {
    return '文件名不能为空'
  }
  // 检查非法字符
  const illegalChars = /[<>:"/\\|?*]/
  if (illegalChars.test(fileName.value)) {
    return '文件名包含非法字符'
  }
  // 确保以 .zip 结尾
  if (!fileName.value.toLowerCase().endsWith('.zip')) {
    return '文件名必须以 .zip 结尾'
  }
  return null
})

const canConfirm = computed(() => {
  return !isPacking.value && !fileNameError.value && fileName.value.trim()
})

// 确认打包
function handleConfirm() {
  if (!canConfirm.value) return
  emit('confirm', fileName.value.trim())
}

// 打开输出文件夹
async function openOutputFolder() {
  if (packResult.value?.outputPath) {
    // 提取目录路径（去掉文件名）
    const dirPath = packResult.value.outputPath.substring(0, packResult.value.outputPath.lastIndexOf('\\'))
    try {
      await openFolder(dirPath)
    } catch (error) {
      console.error('打开文件夹失败:', error)
    }
  }
}

// 重置状态
function resetState() {
  fileName.value = 'project.zip'
  packProgress.value = ''
  packResult.value = null
}

// 关闭对话框
function handleClose() {
  if (!isPacking.value) {
    resetState()
    emit('close')
  }
}

// 开始打包（由父组件调用）
function startPacking() {
  isPacking.value = true
  packProgress.value = '正在准备打包...'
  packResult.value = null
}

// 更新进度（由父组件调用）
function updateProgress(message: string) {
  packProgress.value = message
}

// 完成打包（由父组件调用）
function finishPacking(result: { success: boolean; message: string; outputPath?: string }) {
  isPacking.value = false
  packResult.value = result
  packProgress.value = ''
}

// 暴露方法给父组件
defineExpose({
  startPacking,
  updateProgress,
  finishPacking
})
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
    @click.self="handleClose"
  >
    <div class="card max-w-xl w-full mx-4">
      <!-- 标题栏 -->
      <div class="flex items-center justify-between mb-4 pb-4 border-b border-hoi4-border">
        <h2 class="text-2xl font-bold text-hoi4-text">
          {{ isPacking ? '正在打包...' : (packResult ? '打包结果' : '项目打包') }}
        </h2>
        <button
          v-if="!isPacking"
          @click="handleClose"
          class="p-2 hover:bg-hoi4-border/40 rounded-lg transition-colors"
        >
          <svg class="w-6 h-6 text-hoi4-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- 打包进度 -->
      <div v-if="isPacking" class="py-8">
        <div class="flex flex-col items-center gap-4">
          <svg class="w-16 h-16 text-hoi4-accent animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <p class="text-hoi4-text text-lg">{{ packProgress }}</p>
        </div>
      </div>

      <!-- 打包结果 -->
      <div v-else-if="packResult" class="py-4">
        <div class="flex items-start gap-4">
          <!-- 成功图标 -->
          <svg
            v-if="packResult.success"
            class="w-12 h-12 text-green-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <!-- 失败图标 -->
          <svg
            v-else
            class="w-12 h-12 text-red-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          
          <div class="flex-1">
            <h3 class="text-xl font-semibold mb-2" :class="packResult.success ? 'text-green-500' : 'text-red-500'">
              {{ packResult.success ? '打包成功！' : '打包失败' }}
            </h3>
            <p class="text-hoi4-text mb-3">{{ packResult.message }}</p>
            <div v-if="packResult.success && packResult.outputPath" class="bg-hoi4-border/20 p-3 rounded-lg">
              <p class="text-hoi4-comment text-sm mb-1">输出位置：</p>
              <p class="text-hoi4-text text-sm font-mono break-all">{{ packResult.outputPath }}</p>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex gap-3 mt-6">
          <button
            v-if="packResult.success && packResult.outputPath"
            @click="openOutputFolder"
            class="btn-primary flex-1"
          >
            <svg class="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path>
            </svg>
            打开输出文件夹
          </button>
          <button @click="handleClose" class="btn-secondary flex-1">
            关闭
          </button>
        </div>
      </div>

      <!-- 打包配置 -->
      <div v-else class="space-y-4">
        <!-- 项目名称 -->
        <div v-if="projectName" class="bg-hoi4-border/20 p-3 rounded-lg">
          <p class="text-hoi4-comment text-sm mb-1">项目名称：</p>
          <p class="text-hoi4-text font-semibold">{{ projectName }}</p>
        </div>

        <!-- 文件名输入 -->
        <div>
          <label class="block text-hoi4-text mb-2 text-sm font-semibold">
            打包文件名
          </label>
          <input
            v-model="fileName"
            type="text"
            placeholder="请输入文件名（如：project.zip）"
            class="input-field w-full"
            @keyup.enter="handleConfirm"
          />
          <p v-if="fileNameError" class="text-red-400 text-xs mt-1">{{ fileNameError }}</p>
          <p v-else class="text-hoi4-comment text-xs mt-1">
            输出位置：项目文件夹/package/{{ fileName || 'project.zip' }}
          </p>
        </div>

        <!-- 说明 -->
        <div class="bg-hoi4-border/20 p-3 rounded-lg">
          <div class="flex items-start gap-2 text-hoi4-comment text-sm">
            <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p class="mb-1">• 将打包项目文件夹下的所有文件</p>
              <p class="mb-1">• 不包含：.git 等开发文件</p>
              <p>• 不包含：依赖项目录（外部项目）</p>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex gap-3">
          <button
            @click="handleConfirm"
            :disabled="!canConfirm"
            class="btn-primary flex-1"
          >
            开始打包
          </button>
          <button @click="handleClose" class="btn-secondary flex-1">
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
