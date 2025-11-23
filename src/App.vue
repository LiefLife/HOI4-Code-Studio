<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

// HOI4 Code Studio - 主应用组件

// 禁用浏览器默认右键菜单
function handleContextMenu(event: MouseEvent) {
  event.preventDefault()
  return false
}

onMounted(() => {
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
