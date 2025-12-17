<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTheme } from '../../composables/useTheme'

const props = withDefaults(defineProps<{
  visible: boolean
  type: 'file' | 'folder'
  initialValue?: string
  mode?: 'create' | 'rename'
}>(), {
  mode: 'create',
  initialValue: ''
})

const emit = defineEmits<{
  confirm: [name: string, useBom?: boolean]
  cancel: []
}>()

// 获取当前主题
const { currentTheme } = useTheme()

const input = ref('')
const error = ref('')
const useBom = ref(false)

// 监听 visible 变化，重置状态
watch(() => props.visible, (newVal) => {
  if (newVal) {
    input.value = props.initialValue || ''
    error.value = ''
    useBom.value = false
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
  
  emit('confirm', name, useBom.value)
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
  >
    <div
      class="border rounded-2xl shadow-2xl overflow-hidden"
      :style="{
        backgroundColor: currentTheme.colors.bgSecondary,
        borderColor: currentTheme.colors.border,
        width: '400px',
        maxWidth: '90vw'
      }"
      @click.stop
    >
      <!-- 对话框标题 -->
      <div class="px-6 py-4 border-b-2" :style="{ borderColor: currentTheme.colors.border }">
        <h3 class="text-lg font-bold" :style="{ color: currentTheme.colors.fg }">
          {{ mode === 'rename'
              ? (type === 'file' ? '✏️ 重命名文件' : '✏️ 重命名文件夹')
              : (type === 'file' ? '📄 新建文件' : '📁 新建文件夹')
          }}
        </h3>
      </div>

      <!-- 对话框内容 -->
      <div class="px-6 py-4">
        <label class="block mb-2 text-sm" :style="{ color: currentTheme.colors.comment }">
          {{ type === 'file' ? '文件名' : '文件夹名' }}
        </label>
        <input
          v-model="input"
          type="text"
          class="create-dialog-input w-full px-3 py-2 rounded border-2 text-sm focus:outline-none transition-colors"
          :style="{ backgroundColor: currentTheme.colors.bg, color: currentTheme.colors.fg, borderColor: currentTheme.colors.border }"
          :placeholder="type === 'file' ? '例如: main.txt' : '例如: scripts'"
          @keydown="handleKeydown"
          @focus="(e) => (e.target as HTMLInputElement).style.borderColor = currentTheme.colors.accent"
          @blur="(e) => (e.target as HTMLInputElement).style.borderColor = currentTheme.colors.border"
        />

        <div
          v-if="mode !== 'rename' && type === 'file'"
          class="mt-3 flex items-center gap-2"
        >
          <input
            id="create-use-bom"
            v-model="useBom"
            type="checkbox"
            class="h-4 w-4"
          />
          <label
            for="create-use-bom"
            class="text-sm"
            :style="{ color: currentTheme.colors.fg }"
          >
            UTF-8 with BOM
          </label>
        </div>
        
        <!-- 错误提示 -->
        <div
          v-if="error"
          class="mt-2 text-xs px-2 py-1 rounded"
          :style="{ backgroundColor: currentTheme.colors.error + '1a', color: currentTheme.colors.error }"
        >
          {{ error }}
        </div>
      </div>

      <!-- 对话框按钮 -->
      <div class="px-6 py-4 border-t-2 flex justify-end gap-3" :style="{ borderColor: currentTheme.colors.border }">
        <button
          @click="handleCancel"
          class="px-4 py-2 rounded text-sm transition-colors"
          :style="{ backgroundColor: currentTheme.colors.selection, color: currentTheme.colors.fg }"
          @mouseenter="(e) => (e.target as HTMLElement).style.backgroundColor = currentTheme.colors.border"
          @mouseleave="(e) => (e.target as HTMLElement).style.backgroundColor = currentTheme.colors.selection"
        >
          取消
        </button>
        <button
          @click="handleConfirm"
          class="px-4 py-2 rounded text-sm transition-colors"
          :style="{ backgroundColor: currentTheme.colors.bg, color: currentTheme.colors.fg, border: '1px solid ' + currentTheme.colors.border }"
          @mouseenter="(e) => (e.target as HTMLElement).style.backgroundColor = currentTheme.colors.selection"
          @mouseleave="(e) => (e.target as HTMLElement).style.backgroundColor = currentTheme.colors.bg"
        >
          {{ mode === 'rename' ? '重命名' : '创建' }}
        </button>
      </div>
    </div>
  </div>
</template>
