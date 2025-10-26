import { onMounted, onBeforeUnmount } from 'vue'

/**
 * 键盘快捷键 Composable
 * 处理全局快捷键事件
 */
export function useKeyboardShortcuts(handlers: {
  save?: () => void
  undo?: () => void
  redo?: () => void
  search?: () => void
}) {
  function handleKeyDown(e: KeyboardEvent) {
    // Ctrl+S 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handlers.save?.()
    }
    
    // Ctrl+F 搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault()
      handlers.search?.()
    }
    
    // Ctrl+Z 撤销
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      if (e.shiftKey) {
        // Ctrl+Shift+Z 与 Ctrl+Y 交给重做处理
        handlers.redo?.()
      } else {
        handlers.undo?.()
      }
      // 不调用 preventDefault，让浏览器保留默认行为
    }
    
    // Ctrl+Y 重做
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      handlers.redo?.()
      // 同样不调用 preventDefault
    }
  }
  
  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
  })
  
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })
  
  return {
    handleKeyDown
  }
}
