<template>
  <div class="border-2 border-hoi4-border rounded-lg p-4 bg-hoi4-gray">
    <div class="flex items-start space-x-4">
      <!-- 左侧：手动检查更新按钮 -->
      <button
        @click="handleCheckUpdate"
        :disabled="props.isCheckingUpdate"
        class="btn-primary px-4 py-2 flex-shrink-0"
        :class="{ 'opacity-50 cursor-not-allowed': props.isCheckingUpdate }"
      >
        <div class="flex items-center space-x-2">
          <svg 
            v-if="!props.isCheckingUpdate"
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
          <span>{{ props.isCheckingUpdate ? '检查中...' : '检查更新' }}</span>
        </div>
      </button>

      <!-- 右侧：版本信息 -->
      <div class="flex-1 space-y-2">
        <div class="flex items-center space-x-2">
          <span class="text-hoi4-comment">当前版本:</span>
          <span class="text-hoi4-text font-semibold">{{ props.currentVersion }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-hoi4-comment">GitHub版本:</span>
          <span class="text-hoi4-text font-semibold">{{ props.githubVersion }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { checkForUpdates } from '../../utils/version'

interface Props {
  currentVersion: string
  githubVersion: string
  isCheckingUpdate: boolean
}

interface Emits {
  (e: 'update:githubVersion', value: string): void
  (e: 'update:isCheckingUpdate', value: boolean): void
  (e: 'status-message', message: string): void
  (e: 'show-update-dialog', info: { version: string; url: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const CURRENT_VERSION = 'v0.2.8-dev'

// 手动检查更新
async function handleCheckUpdate() {
  emit('update:isCheckingUpdate', true)
  emit('update:githubVersion', '检查中...')
  
  try {
    // 使用未认证访问
    const result = await checkForUpdates(CURRENT_VERSION, '', false)
    
    if (result.error) {
      emit('update:githubVersion', '检查失败')
      emit('status-message', `检查更新失败: ${result.error}`)
    } else if (result.latestVersion) {
      emit('update:githubVersion', result.latestVersion)
      
      if (result.hasUpdate && result.releaseUrl) {
        emit('show-update-dialog', {
          version: result.latestVersion,
          url: result.releaseUrl
        })
      } else {
        emit('status-message', '当前已是最新版本')
      }
    }
  } catch (error) {
    emit('update:githubVersion', '检查失败')
    emit('status-message', '检查更新失败')
  } finally {
    emit('update:isCheckingUpdate', false)
  }
}
</script>