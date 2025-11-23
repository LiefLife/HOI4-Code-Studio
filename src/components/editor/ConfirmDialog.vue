<script setup lang="ts">
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
      style="background-color: #101010; border-color: #333333; width: 450px; max-width: 90vw;"
      @click.stop
    >
      <!-- 对话框标题 -->
      <div class="px-6 py-4 border-b-2" style="border-color: #2a2a2a;">
        <h3 class="text-lg font-bold" style="color: #e0e0e0;">
          {{ title }}
        </h3>
      </div>

      <!-- 对话框内容 -->
      <div class="px-6 py-5">
        <p class="text-sm leading-relaxed whitespace-pre-line" style="color: #c0c0c0;">
          {{ message }}
        </p>
      </div>

      <!-- 对话框按钮 -->
      <div class="px-6 py-4 border-t-2 flex justify-end gap-3" style="border-color: #2a2a2a;">
        <button
          @click="handleCancel"
          class="px-5 py-2 rounded text-sm transition-colors font-medium"
          style="background-color: #2a2a2a; color: #a0a0a0;"
          @mouseenter="(e) => (e.target as HTMLElement).style.backgroundColor = '#3a3a3a'"
          @mouseleave="(e) => (e.target as HTMLElement).style.backgroundColor = '#2a2a2a'"
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
              (e.target as HTMLElement).style.backgroundColor = '#4a4a4a'
            }
          }"
          @mouseleave="(e) => {
            if (type === 'danger') {
              (e.target as HTMLElement).style.backgroundColor = '#ef4444'
            } else if (type === 'warning') {
              (e.target as HTMLElement).style.backgroundColor = '#f59e0b'
            } else {
              (e.target as HTMLElement).style.backgroundColor = '#3a3a3a'
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
  background-color: #3a3a3a;
  color: #e0e0e0;
}
</style>
