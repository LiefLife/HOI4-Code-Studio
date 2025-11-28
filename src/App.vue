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

onMounted(() => {
  // 延迟加载主题设置，避免阻塞应用启动
  setTimeout(async () => {
    await loadThemeFromSettings()
  }, 100)
  
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
    <Transition name="page-transition" mode="out-in">
      <router-view />
    </Transition>
  </div>
</template>

<style>
/* 页面过渡动画 */
.page-transition-enter-active,
.page-transition-leave-active {
  transition: all 0.3s ease;
}

.page-transition-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.page-transition-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
