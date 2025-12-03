<template>
  <div class="space-y-4">
    <!-- 自动保存 -->
    <div class="settings-option">
      <div class="settings-option-control">
        <input
          :checked="autoSave"
          type="checkbox"
          @change="handleAutoSaveChange"
          class="w-5 h-5 rounded border-2 border-hoi4-border bg-hoi4-accent"
        />
      </div>
      <div class="settings-option-content">
        <div class="settings-option-title">启用自动保存</div>
        <div class="settings-option-description">编辑文件时自动保存更改</div>
      </div>
    </div>

    <!-- RGB颜色显示 -->
    <div class="settings-option">
      <div class="settings-option-control">
        <input
          :checked="enableRGBColorDisplay"
          type="checkbox"
          @change="handleRGBColorDisplayChange"
          class="w-5 h-5 rounded border-2 border-hoi4-border bg-hoi4-accent"
        />
      </div>
      <div class="settings-option-content">
        <div class="settings-option-title">RGB颜色显示</div>
        <div class="settings-option-description">在代码中识别并显示RGB颜色值（格式：RGB{R G B}）</div>
      </div>
    </div>

    <!-- 禁用错误处理 -->
    <div class="settings-option">
      <div class="settings-option-control">
        <input
          :checked="disableErrorHandling"
          type="checkbox"
          @change="handleDisableErrorHandlingChange"
          class="w-5 h-5 rounded border-2 border-hoi4-border bg-hoi4-accent"
        />
      </div>
      <div class="settings-option-content">
        <div class="settings-option-title">禁用错误处理</div>
        <div class="settings-option-description">禁用所有错误检查和提示，可能导致代码质量问题</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  autoSave: boolean
  disableErrorHandling: boolean
  enableRGBColorDisplay: boolean
}

interface Emits {
  (e: 'update:autoSave', value: boolean): void
  (e: 'update:disableErrorHandling', value: boolean): void
  (e: 'update:enableRGBColorDisplay', value: boolean): void
  (e: 'save'): void
  (e: 'confirm-disable-error-handling'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const autoSave = ref(props.autoSave)
const disableErrorHandling = ref(props.disableErrorHandling)
const enableRGBColorDisplay = ref(props.enableRGBColorDisplay)

// 处理自动保存变化
function handleAutoSaveChange() {
  autoSave.value = !autoSave.value
  emit('update:autoSave', autoSave.value)
  emit('save')
}

// 处理RGB颜色显示变化
function handleRGBColorDisplayChange() {
  enableRGBColorDisplay.value = !enableRGBColorDisplay.value
  emit('update:enableRGBColorDisplay', enableRGBColorDisplay.value)
  emit('save')
}

// 处理禁用错误处理变化
function handleDisableErrorHandlingChange() {
  if (!disableErrorHandling.value) {
    // 用户尝试启用（关闭错误处理），需要确认
    emit('confirm-disable-error-handling')
  } else {
    // 直接保存
    disableErrorHandling.value = false
    emit('update:disableErrorHandling', false)
    emit('save')
  }
}

// 监听外部变化
watch(() => props.autoSave, (newValue) => {
  autoSave.value = newValue
}, { immediate: true })

watch(() => props.disableErrorHandling, (newValue) => {
  disableErrorHandling.value = newValue
}, { immediate: true })

watch(() => props.enableRGBColorDisplay, (newValue) => {
  enableRGBColorDisplay.value = newValue
}, { immediate: true })
</script>