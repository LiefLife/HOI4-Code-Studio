import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * 面板拖动调整 Composable
 * 管理左右面板的宽度调整
 */
export function usePanelResize() {
  const leftPanelWidth = ref(250)
  const rightPanelWidth = ref(300)
  const isResizingLeft = ref(false)
  const isResizingRight = ref(false)
  
  /**
   * 开始拖动左侧面板
   */
  function startResizeLeft(e: MouseEvent) {
    isResizingLeft.value = true
    e.preventDefault()
  }
  
  /**
   * 开始拖动右侧面板
   */
  function startResizeRight(e: MouseEvent) {
    isResizingRight.value = true
    e.preventDefault()
  }
  
  /**
   * 鼠标移动事件处理
   */
  function onMouseMove(e: MouseEvent) {
    if (isResizingLeft.value) {
      const newWidth = e.clientX
      // 限制在最小和最大宽度之间
      leftPanelWidth.value = Math.max(150, Math.min(500, newWidth))
    }
    
    if (isResizingRight.value) {
      const newWidth = window.innerWidth - e.clientX
      // 限制在最小和最大宽度之间
      rightPanelWidth.value = Math.max(200, Math.min(600, newWidth))
    }
  }
  
  /**
   * 停止拖动
   */
  function stopResize() {
    isResizingLeft.value = false
    isResizingRight.value = false
  }
  
  // 注册全局事件监听
  onMounted(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', stopResize)
  })
  
  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', stopResize)
  })
  
  return {
    leftPanelWidth,
    rightPanelWidth,
    isResizingLeft,
    isResizingRight,
    startResizeLeft,
    startResizeRight,
    onMouseMove,
    stopResize
  }
}
