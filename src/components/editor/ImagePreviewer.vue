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
          :style="imageStyle"
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  imageUrl: string
  fileName: string
  filePath: string
}

const props = defineProps<Props>()

// Refs
const containerRef = ref<HTMLElement>()
const imageWrapperRef = ref<HTMLElement>()

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

// 计算属性
const imageWrapperStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0',
  willChange: 'transform' // 提示浏览器优化
}))

const imageStyle = computed(() => ({
  width: `${imageDimensions.value.width}px`,
  height: `${imageDimensions.value.height}px`,
  imageRendering: 'auto' // 优化图片渲染
}))

// 事件处理
const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  imageDimensions.value = {
    width: img.naturalWidth,
    height: img.naturalHeight
  }
  resetView()
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = ''
}

const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  
  const delta = Math.sign(event.deltaY) * -0.1
  const newScale = Math.max(0.1, Math.min(10, scale.value + delta))
  
  // 计算缩放中心点
  const rect = containerRef.value?.getBoundingClientRect()
  if (rect) {
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    
    // 计算缩放前后的坐标变换
    const scaleRatio = newScale / scale.value
    translateX.value = mouseX - (mouseX - translateX.value) * scaleRatio
    translateY.value = mouseY - (mouseY - translateY.value) * scaleRatio
  }
  
  scale.value = newScale
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

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return
  
  // 使用requestAnimationFrame优化性能
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
  
  animationFrameId.value = requestAnimationFrame(() => {
    const deltaX = event.clientX - dragStartX.value
    const deltaY = event.clientY - dragStartY.value
    
    translateX.value = dragStartTranslateX.value + deltaX
    translateY.value = dragStartTranslateY.value + deltaY
  })
}

const handleMouseUp = () => {
  isDragging.value = false
  
  // 恢复光标样式
  if (containerRef.value) {
    containerRef.value.style.cursor = ''
  }
  
  // 清理动画帧
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
    animationFrameId.value = null
  }
}

// 控制方法
const zoomIn = () => {
  scale.value = Math.min(10, scale.value + 0.1)
}

const zoomOut = () => {
  scale.value = Math.max(0.1, scale.value - 0.1)
}

const resetView = () => {
  if (!containerRef.value || !imageDimensions.value.width) return
  
  const containerRect = containerRef.value.getBoundingClientRect()
  const containerWidth = containerRect.width
  const containerHeight = containerRect.height
  
  const imageWidth = imageDimensions.value.width
  const imageHeight = imageDimensions.value.height
  
  // 计算适合容器的缩放比例
  const scaleX = containerWidth / imageWidth
  const scaleY = containerHeight / imageHeight
  const fitScale = Math.min(scaleX, scaleY, 1) // 不超过100%
  
  scale.value = fitScale
  
  // 居中显示
  translateX.value = (containerWidth - imageWidth * fitScale) / 2
  translateY.value = (containerHeight - imageHeight * fitScale) / 2
}

// 监听容器大小变化
const handleResize = () => {
  if (imageDimensions.value.width) {
    resetView()
  }
}

// 生命周期
onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('resize', handleResize)
  
  // 添加触摸事件支持
  if (containerRef.value) {
    containerRef.value.addEventListener('touchstart', handleTouchStart, { passive: false })
    containerRef.value.addEventListener('touchmove', handleTouchMove, { passive: false })
    containerRef.value.addEventListener('touchend', handleTouchEnd)
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('resize', handleResize)
  
  if (containerRef.value) {
    containerRef.value.removeEventListener('touchstart', handleTouchStart)
    containerRef.value.removeEventListener('touchmove', handleTouchMove)
    containerRef.value.removeEventListener('touchend', handleTouchEnd)
  }
  
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
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

const handleTouchMove = (event: TouchEvent) => {
  if (!isDragging.value || event.touches.length !== 1) return
  
  event.preventDefault()
  
  const touch = event.touches[0]
  const deltaX = touch.clientX - dragStartX.value
  const deltaY = touch.clientY - dragStartY.value
  
  translateX.value = dragStartTranslateX.value + deltaX
  translateY.value = dragStartTranslateY.value + deltaY
}

const handleTouchEnd = () => {
  isDragging.value = false
}
</script>

<style scoped>
img {
  user-select: none;
  -webkit-user-drag: none;
}
</style>