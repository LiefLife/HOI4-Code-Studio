<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useTheme } from './composables/useTheme'

// HOI4 Code Studio - 主应用组件

// 主题系统
const { loadThemeFromSettings } = useTheme()

// 禁用浏览器默认右键菜单
function handleContextMenu(event: MouseEvent) {
  event.preventDefault()
  return false
}

onMounted(async () => {
  // 加载主题设置
  await loadThemeFromSettings()
  
  // 添加全局右键菜单禁用
  document.addEventListener('contextmenu', handleContextMenu)
})

onUnmounted(() => {
  // 清理事件监听
  document.removeEventListener('contextmenu', handleContextMenu)
})
</script>

<template>
  <div id="app" class="h-screen w-screen overflow-hidden">
    <router-view />
  </div>
</template>
