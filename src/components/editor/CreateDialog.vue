<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  type: 'file' | 'folder'
}>()

const emit = defineEmits<{
  confirm: [name: string]
  cancel: []
}>()

const input = ref('')
const error = ref('')

// 监听 visible 变化，重置状态
watch(() => props.visible, (newVal) => {
  if (newVal) {
    input.value = ''
    error.value = ''
  }
})

function handleConfirm() {
  const name = input.value.trim()
  
  // 验证输入
  if (!name) {
    error.value = '名称不能为空'
    return
  }
  
  // 验证文件名合法性
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(name)) {
    error.value = '名称包含非法字符: < > : " / \\ | ? *'
    return
  }
  
  emit('confirm', name)
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
    style="background-color: rgba(0, 0, 0, 0.7);"
    @click.self="handleCancel"
  >
    <div
      class="border-2 rounded-lg shadow-2xl"
      style="background-color: #1a1a1a; border-color: #2a2a2a; width: 400px; max-width: 90vw;"
      @click.stop
    >
      <!-- 对话框标题 -->
      <div class="px-6 py-4 border-b-2" style="border-color: #2a2a2a;">
        <h3 class="text-lg font-bold" style="color: #e0e0e0;">
          {{ type === 'file' ? '📄 新建文件' : '📁 新建文件夹' }}
        </h3>
      </div>

      <!-- 对话框内容 -->
      <div class="px-6 py-4">
        <label class="block mb-2 text-sm" style="color: #a0a0a0;">
          {{ type === 'file' ? '文件名' : '文件夹名' }}
        </label>
        <input
          v-model="input"
          type="text"
          class="create-dialog-input w-full px-3 py-2 rounded border-2 text-sm focus:outline-none transition-colors"
          style="background-color: #0a0a0a; color: #e0e0e0; border-color: #2a2a2a;"
          :placeholder="type === 'file' ? '例如: main.txt' : '例如: scripts'"
          @keydown="handleKeydown"
          @focus="(e) => (e.target as HTMLInputElement).style.borderColor = '#3a3a3a'"
          @blur="(e) => (e.target as HTMLInputElement).style.borderColor = '#2a2a2a'"
        />
        
        <!-- 错误提示 -->
        <div
          v-if="error"
          class="mt-2 text-xs px-2 py-1 rounded"
          style="background-color: rgba(239, 68, 68, 0.1); color: #ef4444;"
        >
          {{ error }}
        </div>
      </div>

      <!-- 对话框按钮 -->
      <div class="px-6 py-4 border-t-2 flex justify-end gap-3" style="border-color: #2a2a2a;">
        <button
          @click="handleCancel"
          class="px-4 py-2 rounded text-sm transition-colors"
          style="background-color: #2a2a2a; color: #a0a0a0;"
          @mouseenter="(e) => (e.target as HTMLElement).style.backgroundColor = '#3a3a3a'"
          @mouseleave="(e) => (e.target as HTMLElement).style.backgroundColor = '#2a2a2a'"
        >
          取消
        </button>
        <button
          @click="handleConfirm"
          class="px-4 py-2 rounded text-sm transition-colors"
          style="background-color: #3a3a3a; color: #e0e0e0;"
          @mouseenter="(e) => (e.target as HTMLElement).style.backgroundColor = '#4a4a4a'"
          @mouseleave="(e) => (e.target as HTMLElement).style.backgroundColor = '#3a3a3a'"
        >
          创建
        </button>
      </div>
    </div>
  </div>
</template>
