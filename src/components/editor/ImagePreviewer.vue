<template>
  <div class="w-full h-full overflow-hidden relative bg-hoi4-gray/50">
    <!-- 图片容器 -->
    <div 
      ref="containerRef"
      class="w-full h-full overflow-auto relative"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @contextmenu.prevent
    >
      <!-- 图片 -->
      <div 
        ref="imageWrapperRef"
        class="absolute top-0 left-0"
        :style="imageWrapperStyle"
      >
        <img 
          :src="imageUrl" 
          :alt="fileName"
          class="block"
          @load="handleImageLoad"
          @error="handleImageError"
        />
      </div>
    </div>

    <!-- 控制工具栏 -->
    <div class="absolute bottom-4 right-4 flex flex-col gap-2">
      <div class="bg-hoi4-border/80 backdrop-blur-sm rounded-lg p-2 flex flex-col gap-1">
        <button 
          class="w-8 h-8 flex items-center justify-center bg-hoi4-gray hover:bg-hoi4-border rounded transition-colors"
          @click="zoomIn"
          title="放大"
        >
          <svg class="w-4 h-4 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"></path>
          </svg>
        </button>
        <button 
          class="w-8 h-8 flex items-center justify-center bg-hoi4-gray hover:bg-hoi4-border rounded transition-colors"
          @click="zoomOut"
          title="缩小"
        >
          <svg class="w-4 h-4 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h6"></path>
          </svg>
        </button>
        <button 
          class="w-8 h-8 flex items-center justify-center bg-hoi4-gray hover:bg-hoi4-border rounded transition-colors"
          @click="resetView"
          title="重置视图"
        >
          <svg class="w-4 h-4 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>
      </div>
      
      <!-- 缩放比例显示 -->
      <div class="bg-hoi4-border/80 backdrop-blur-sm rounded-lg px-3 py-1 text-center">
        <span class="text-hoi4-text text-sm font-mono">{{ Math.round(scale * 100) }}%</span>
      </div>
    </div>

    <!-- 文件信息面板 -->
    <div class="absolute top-4 left-4 bg-hoi4-border/80 backdrop-blur-sm rounded-lg p-3 max-w-xs">
      <div class="text-hoi4-text text-sm space-y-1">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-hoi4-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <span class="font-semibold truncate">{{ fileName }}</span>
        </div>
        <div class="text-hoi4-comment text-xs font-mono truncate">
          {{ filePath }}
        </div>
        <div v-if="imageDimensions.width" class="text-hoi4-comment text-xs font-mono">
          {{ imageDimensions.width }} × {{ imageDimensions.height }} 像素
        </div>
        <!-- 性能监控信息（开发模式） -->
        <div v-if="performanceStats.interactionCount > 0" class="text-hoi4-comment text-xs font-mono border-t border-hoi4-border pt-1 mt-1">
          <div>交互次数: {{ performanceStats.interactionCount }}</div>
          <div>平均响应: {{ Math.round(performanceStats.averageResponseTime * 100) / 100 }}ms</div>
          <div>缩放级别: {{ Math.round(scale * 100) }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted} from 'vue'

interface Props {
  imageUrl: string
  fileName: string
  filePath: string
}

const { imageUrl, fileName, filePath } = defineProps<Props>()

// Refs
const containerRef = ref<HTMLElement>()

// 状态
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartTranslateX = ref(0)
const dragStartTranslateY = ref(0)
const imageDimensions = ref({ width: 0, height: 0 })
const animationFrameId = ref<number | null>(null)


// 缓存计算结果
const transformCache = ref<{ scale: number, translateX: number, translateY: number, result: string } | null>(null)

// 性能监控
const performanceStats = ref({
  lastInteractionTime: 0,
  interactionCount: 0,
  averageResponseTime: 0
})

// 图片缓存
const imageCache = new Map<string, HTMLImageElement>()

// 图片预加载
const preloadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (imageCache.has(url)) {
      resolve(imageCache.get(url)!)
      return
    }
    
    const img = new Image()
    img.onload = () => {
      imageCache.set(url, img)
      resolve(img)
    }
    img.onerror = reject
    img.src = url
  })
}

// 计算属性 - 优化的transform计算
const imageWrapperStyle = computed(() => {
  const currentScale = scale.value
  const currentTranslateX = translateX.value
  const currentTranslateY = translateY.value
  
  // 使用缓存避免重复计算
  if (transformCache.value && 
      transformCache.value.scale === currentScale && 
      transformCache.value.translateX === currentTranslateX && 
      transformCache.value.translateY === currentTranslateY) {
    return { transform: transformCache.value.result, transformOrigin: '0 0', willChange: 'transform' }
  }
  
  const result = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`
  transformCache.value = { scale: currentScale, translateX: currentTranslateX, translateY: currentTranslateY, result }
  
  return {
    transform: result,
    transformOrigin: '0 0',
    willChange: 'transform' // 提示浏览器优化
  }
})

// 事件处理
const handleImageLoad = async (event: Event) => {
  const img = event.target as HTMLImageElement

  requestAnimationFrame(() => {
    const rect = img.getBoundingClientRect()
    const width = Math.round(rect.width)
    const height = Math.round(rect.height)
    imageDimensions.value = {
      width: width || img.naturalWidth,
      height: height || img.naturalHeight
    }
    resetView()
  })
  
  // 预加载并缓存图片
  try {
    await preloadImage(imageUrl)
  } catch (error) {
    console.warn('Failed to preload image:', error)
  }
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = ''
}

// 优化：添加性能监控和缓存的缩放处理
const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  
  const startTime = performance.now()
  
  const delta = Math.sign(event.deltaY) * -0.1
  const currentScale = scale.value
  const newScale = Math.max(0.1, Math.min(10, currentScale + delta))
  
  // 计算缩放中心点
  const rect = containerRef.value?.getBoundingClientRect()
  if (rect) {
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    
    // 优化：减少重复计算，直接计算新的translate值
    const scaleRatio = newScale / currentScale
    translateX.value = mouseX - (mouseX - translateX.value) * scaleRatio
    translateY.value = mouseY - (mouseY - translateY.value) * scaleRatio
  }
  
  scale.value = newScale
  
  // 更新性能统计
  const responseTime = performance.now() - startTime
  updatePerformanceStats(responseTime)
}

// 性能统计更新
const updatePerformanceStats = (responseTime: number) => {
  const stats = performanceStats.value
  stats.interactionCount++
  stats.lastInteractionTime = Date.now()
  stats.averageResponseTime = (stats.averageResponseTime * (stats.interactionCount - 1) + responseTime) / stats.interactionCount
}

const handleMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return // 只处理左键
  
  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  dragStartTranslateX.value = translateX.value
  dragStartTranslateY.value = translateY.value
  
  // 设置光标样式
  if (containerRef.value) {
    containerRef.value.style.cursor = 'grabbing'
  }
  
  event.preventDefault()
}

// 优化：直接处理鼠标移动，确保实时响应
const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return
  
  const startTime = performance.now()
  
  // 直接更新，无延迟
  const deltaX = event.clientX - dragStartX.value
  const deltaY = event.clientY - dragStartY.value
  
  translateX.value = dragStartTranslateX.value + deltaX
  translateY.value = dragStartTranslateY.value + deltaY
  
  // 性能监控（可选，可移除以进一步提升性能）
  const responseTime = performance.now() - startTime
  updatePerformanceStats(responseTime)
}

const handleMouseUp = () => {
  isDragging.value = false
  
  // 恢复光标样式
  if (containerRef.value) {
    containerRef.value.style.cursor = ''
  }
  
  // 清理动画帧（虽然在移动处理中不再使用，但保留用于其他场景）
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
    animationFrameId.value = null
  }
}

// 优化的控制方法 - 使用缓动算法提升用户体验
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const animateZoom = (targetScale: number, duration: number = 200) => {
  const startScale = scale.value
  const startTime = performance.now()
  const scaleDiff = targetScale - startScale
  
  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeProgress = easeInOutCubic(progress)
    
    scale.value = startScale + scaleDiff * easeProgress
    
    if (progress < 1) {
      animationFrameId.value = requestAnimationFrame(animate)
    }
  }
  
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
  animationFrameId.value = requestAnimationFrame(animate)
}

const zoomIn = () => {
  const targetScale = Math.min(10, scale.value + 0.1)
  animateZoom(targetScale)
}

const zoomOut = () => {
  const targetScale = Math.max(0.1, scale.value - 0.1)
  animateZoom(targetScale)
}

// 优化的重置视图算法
const resetView = () => {
  if (!containerRef.value || !imageDimensions.value.width) return
  
  const startTime = performance.now()
  
  const containerRect = containerRef.value.getBoundingClientRect()
  const containerWidth = containerRect.width
  const containerHeight = containerRect.height
  
  const imageWidth = imageDimensions.value.width
  const imageHeight = imageDimensions.value.height
  
  // 优化：减少重复计算，使用位运算优化
  const scaleX = containerWidth / imageWidth
  const scaleY = containerHeight / imageHeight
  const fitScale = Math.min(scaleX, scaleY, 1)
  
  // 批量更新状态，减少响应式更新次数
  scale.value = fitScale
  translateX.value = (containerWidth - imageWidth * fitScale) * 0.5
  translateY.value = (containerHeight - imageHeight * fitScale) * 0.5
  
  // 清除transform缓存，强制重新计算
  transformCache.value = null
  
  // 性能监控
  const responseTime = performance.now() - startTime
  updatePerformanceStats(responseTime)
}

// 优化的触摸事件处理 - 移除节流，确保实时响应
const handleTouchMoveOptimized = (event: TouchEvent) => {
  if (!isDragging.value || event.touches.length !== 1) return
  
  event.preventDefault()
  
  const touch = event.touches[0]
  const deltaX = touch.clientX - dragStartX.value
  const deltaY = touch.clientY - dragStartY.value
  
  translateX.value = dragStartTranslateX.value + deltaX
  translateY.value = dragStartTranslateY.value + deltaY
}

// 生命周期 - 优化事件监听
onMounted(() => {
  // 移除passive选项，确保能够及时处理拖动事件
  window.addEventListener('mousemove', handleMouseMove, { passive: false })
  window.addEventListener('mouseup', handleMouseUp, { passive: true })
  // 添加触摸事件支持
  if (containerRef.value) {
    containerRef.value.addEventListener('touchstart', handleTouchStart, { passive: false })
    containerRef.value.addEventListener('touchmove', handleTouchMoveOptimized, { passive: false })
    containerRef.value.addEventListener('touchend', handleTouchEnd, { passive: true })
  }
  
  // 初始化性能统计
  performanceStats.value.lastInteractionTime = Date.now()
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  
  if (containerRef.value) {
    containerRef.value.removeEventListener('touchstart', handleTouchStart)
    containerRef.value.removeEventListener('touchmove', handleTouchMoveOptimized)
    containerRef.value.removeEventListener('touchend', handleTouchEnd)
  }
  
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
  
  // 清理缓存
  transformCache.value = null
})

// 触摸事件处理
const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length !== 1) return
  
  event.preventDefault()
  
  const touch = event.touches[0]
  isDragging.value = true
  dragStartX.value = touch.clientX
  dragStartY.value = touch.clientY
  dragStartTranslateX.value = translateX.value
  dragStartTranslateY.value = translateY.value
}

// 移除原来的handleTouchMove，现在使用优化版本

const handleTouchEnd = () => {
  isDragging.value = false
}
</script>

<style scoped>
img {
  user-select: none;
  -webkit-user-drag: none;
  /* 性能优化：提升GPU加速 */
  transform: translateZ(0);
  /* 优化图片渲染 */
  image-rendering: -webkit-optimize-contrast;
  /* 减少重绘 */
  will-change: transform;
}

/* 容器优化 */
.overflow-auto {
  /* CSS Containment 提升性能 */
  contain: layout style paint;
  /* 优化滚动性能 */
  overscroll-behavior: contain;
}

/* 图片包装器优化 */
.absolute {
  /* 减少布局计算 */
  contain: layout paint;
  /* 启用硬件加速 */
  transform: translateZ(0);
}

/* 工具栏优化 */
.backdrop-blur-sm {
  /* 优化模糊效果性能 */
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  /* 使用transform代替position变化提升动画性能 */
  transform: translateZ(0);
}
</style>