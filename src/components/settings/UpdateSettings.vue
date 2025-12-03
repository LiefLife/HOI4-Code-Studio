<template>
  <div class="settings-option">
    <div class="settings-option-control">
      <input
        :checked="checkForUpdatesOnStartup"
        type="checkbox"
        @change="handleUpdateCheckChange"
        class="w-5 h-5 rounded border-2 border-hoi4-border bg-hoi4-accent"
      />
    </div>
    <div class="settings-option-content">
      <div class="settings-option-title">启动时检查更新</div>
      <div class="settings-option-description">应用启动时自动检查是否有新版本可用</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  checkForUpdatesOnStartup: boolean
}

interface Emits {
  (e: 'update:checkForUpdatesOnStartup', value: boolean): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const checkForUpdatesOnStartup = ref(props.checkForUpdatesOnStartup)

// 处理更新检查变化
function handleUpdateCheckChange() {
  checkForUpdatesOnStartup.value = !checkForUpdatesOnStartup.value
  emit('update:checkForUpdatesOnStartup', checkForUpdatesOnStartup.value)
  emit('save')
}

// 监听外部变化
watch(() => props.checkForUpdatesOnStartup, (newValue) => {
  checkForUpdatesOnStartup.value = newValue
})
</script>