<script setup lang="ts">
import { useTheme } from '../../composables/useTheme'

withDefaults(defineProps<{
  visible: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger' | 'info'
}>(), {
  title: '⚠️ 确认操作',
  confirmText: '确定',
  cancelText: '取消',
  type: 'warning'
})

// 获取当前主题
const { currentTheme } = useTheme()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    handleConfirm()
  } else if (event.key === 'Escape') {
    handleCancel()
  }
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 flex items-center justify-center z-50"
    style="background-color: rgba(0, 0, 0, 0.55); backdrop-filter: blur(4px);"
    @click.self="handleCancel"
    @keydown="handleKeydown"
    tabindex="-1"
  >
    <div
      class="border rounded-2xl shadow-2xl overflow-hidden"
      :style="{
        backgroundColor: currentTheme.colors.bgSecondary,
        borderColor: currentTheme.colors.border,
        width: '450px',
        maxWidth: '90vw'
      }"
      @click.stop
    >
      <!-- 对话框标题 -->
      <div class="px-6 py-4 border-b-2" :style="{ borderColor: currentTheme.colors.border }">
        <h3 class="text-lg font-bold" :style="{ color: currentTheme.colors.fg }">
          {{ title }}
        </h3>
      </div>

      <!-- 对话框内容 -->
      <div class="px-6 py-5">
        <p class="text-sm leading-relaxed whitespace-pre-line" :style="{ color: currentTheme.colors.fg }">
          {{ message }}
        </p>
      </div>

      <!-- 对话框按钮 -->
      <div class="px-6 py-4 border-t-2 flex justify-end gap-3" :style="{ borderColor: currentTheme.colors.border }">
        <button
          @click="handleCancel"
          class="px-5 py-2 rounded text-sm transition-colors font-medium"
          :style="{ backgroundColor: currentTheme.colors.selection, color: currentTheme.colors.fg }"
          @mouseenter="(e) => (e.target as HTMLElement).style.backgroundColor = currentTheme.colors.border"
          @mouseleave="(e) => (e.target as HTMLElement).style.backgroundColor = currentTheme.colors.selection"
        >
          {{ cancelText }}
        </button>
        <button
          @click="handleConfirm"
          class="px-5 py-2 rounded text-sm transition-colors font-medium"
          :class="{
            'confirm-warning': type === 'warning',
            'confirm-danger': type === 'danger',
            'confirm-info': type === 'info'
          }"
          @mouseenter="(e) => {
            if (type === 'danger') {
              (e.target as HTMLElement).style.backgroundColor = '#dc2626'
            } else if (type === 'warning') {
              (e.target as HTMLElement).style.backgroundColor = '#d97706'
            } else {
              (e.target as HTMLElement).style.backgroundColor = currentTheme.colors.border
            }
          }"
          @mouseleave="(e) => {
            if (type === 'danger') {
              (e.target as HTMLElement).style.backgroundColor = '#ef4444'
            } else if (type === 'warning') {
              (e.target as HTMLElement).style.backgroundColor = '#f59e0b'
            } else {
              (e.target as HTMLElement).style.backgroundColor = currentTheme.colors.selection
            }
          }"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-warning {
  background-color: #f59e0b;
  color: #ffffff;
}

.confirm-danger {
  background-color: #ef4444;
  color: #ffffff;
}

.confirm-info {
  background-color: var(--theme-selection);
  color: var(--theme-fg);
}
</style>
