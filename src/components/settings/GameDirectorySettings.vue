<template>
  <div class="settings-form-group">
    <div class="flex space-x-2">
      <input
        :value="gameDirectory"
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { validateGameDirectory, openFileDialog } from '../../api/tauri'

interface Props {
  modelValue: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'status-message', message: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const gameDirectory = ref(props.modelValue)

// 选择游戏目录
async function selectGameDirectory() {
  const result = await openFileDialog('directory')
  if (result.success && result.path) {
    const validation = await validateGameDirectory(result.path)
    if (validation.valid) {
      gameDirectory.value = result.path
      emit('update:modelValue', result.path)
      emit('status-message', '游戏目录验证成功')
    } else {
      emit('status-message', `无效的游戏目录: ${validation.message}`)
    }
  }
}

// 清除游戏目录
function clearGameDirectory() {
  gameDirectory.value = ''
  emit('update:modelValue', '')
  emit('status-message', '游戏目录已清除')
}

// 监听外部变化
watch(() => props.modelValue, (newValue) => {
  gameDirectory.value = newValue
})
</script>