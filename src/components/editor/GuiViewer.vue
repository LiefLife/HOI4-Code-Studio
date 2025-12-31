<template>
  <div class="gui-viewer w-full h-full bg-[var(--theme-bg)] flex flex-col overflow-hidden relative text-[var(--theme-fg)]">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between px-4 py-2 bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-border)] shrink-0">
      <div class="flex items-center gap-4">
        <h2 class="text-sm font-bold text-[var(--theme-fg)] flex items-center gap-2">
          <svg class="w-4 h-4 text-[var(--theme-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          GUI 预览器
        </h2>
        <div class="h-4 w-[1px] bg-[var(--theme-border)]"></div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-[var(--theme-comment)]">当前窗口:</span>
          <select 
            v-model="activeWindowIndex" 
            class="bg-[var(--theme-bg)] text-xs text-[var(--theme-fg)] border border-[var(--theme-border)] rounded px-2 py-1 focus:outline-none focus:border-[var(--theme-accent)]"
          >
            <option v-for="(win, idx) in guiData?.windows" :key="idx" :value="idx">
              {{ win.properties.name || `Window ${idx + 1}` }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex bg-[var(--theme-bg)] rounded p-1 border border-[var(--theme-border)]">
          <button 
            @click="zoom -= 0.1" 
            class="p-1 hover:bg-[var(--theme-selection)] rounded text-[var(--theme-fg)] transition-colors"
            title="缩小"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          </button>
          <span class="px-2 text-xs font-mono text-[var(--theme-fg)] flex items-center min-w-[3rem] justify-center">
            {{ Math.round(zoom * 100) }}%
          </span>
          <button 
            @click="zoom += 0.1" 
            class="p-1 hover:bg-[var(--theme-selection)] rounded text-[var(--theme-fg)] transition-colors"
            title="放大"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <button 
          @click="resetView" 
          class="flex items-center gap-1 px-2 py-1 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-selection)] border border-[var(--theme-border)] rounded text-xs text-[var(--theme-fg)] transition-colors"
          title="重置缩放和位置"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          重置
        </button>
      </div>
    </div>

    <!-- 渲染画布 -->
    <div 
      class="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing" 
      ref="canvasRef"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @wheel="handleWheel"
    >
      <div 
        class="absolute" 
        :style="canvasStyle"
      >
        <div class="relative" :style="stageStyle">
          <!-- 背景网格 -->
          <div class="absolute inset-0 pointer-events-none opacity-10" :style="gridStyle"></div>
          
          <!-- GUI 渲染层 -->
          <template v-if="activeWindow">
            <GuiNodeRenderer 
              :key="`${filePath}-${activeWindowIndex}-${activeWindow.properties.name || ''}`"
              :node="activeWindow" 
              :parent-size="stageSize"
              :sprites="sprites"
              :project-path="projectPath"
              :game-directory="gameDirectory"
              :dependency-roots="dependencyRoots"
            />
          </template>
          
          <div v-else class="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
            <svg class="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm">未找到可解析的窗口</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="px-4 py-1 bg-[var(--theme-bg-secondary)] border-t border-[var(--theme-border)] flex justify-between items-center shrink-0">
      <div class="flex items-center gap-4 text-[10px] text-[var(--theme-comment)]">
        <span class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-[var(--theme-success)]"></span>
          渲染引擎: 精准模式
        </span>
        <span v-if="guiData">窗口数: {{ guiData.windows.length }}</span>
        <span v-if="activeWindow">
          尺寸: {{ activeWindow.properties.size?.width || '?' }} x {{ activeWindow.properties.size?.height || '?' }}
        </span>
      </div>
      <div class="text-[10px] text-[var(--theme-comment)]">
        按住 Space + 鼠标拖动平移
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { parseGuiFile, parseGfxFile, type GuiParseResult } from '../../api/tauri'
import { useDependencyManager } from '../../composables/useDependencyManager'
import GuiNodeRenderer from './GuiNodeRenderer.vue'

const props = defineProps<{
  content: string
  filePath: string
  gameDirectory?: string
  projectPath?: string
}>()

const { dependencies } = useDependencyManager()
const canvasRef = ref<HTMLElement | null>(null)

// 状态
const guiData = ref<GuiParseResult | null>(null)
const sprites = ref<Record<string, any>>({})
const activeWindowIndex = ref(0)
const zoom = ref(1.0)
const offset = ref({ x: 50, y: 50 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// 计算属性
const dependencyRoots = computed(() => dependencies.value.map(d => d.path))

const activeWindow = computed(() => guiData.value?.windows[activeWindowIndex.value])

const stageSize = computed((): { width: number; height: number } => {
  // HOI4 界面通常以 1920x1080 为基准参考分辨率
  return {
    width: 1920,
    height: 1080,
  }
})

const stageStyle = computed(() => {
  const width = stageSize.value.width
  const height = stageSize.value.height
  return {
    width: `${width}px`,
    height: `${height}px`,
  }
})

const canvasStyle = computed(() => ({
  transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${zoom.value})`,
  transformOrigin: '0 0',
  transition: isDragging.value ? 'none' : 'transform 0.1s ease-out'
}))

const gridStyle = computed(() => ({
  backgroundImage: `radial-gradient(circle, #4d4d4d 1px, transparent 1px)`,
  backgroundSize: '20px 20px',
  width: '10000px',
  height: '10000px',
  top: '-5000px',
  left: '-5000px'
}))

// 方法
const loadData = async () => {
  try {
    // 加载前清空旧数据，防止切换时内容重叠
    guiData.value = null
    sprites.value = {}
    
    // 1. 解析 GUI
    const res = await parseGuiFile(props.filePath)
    if (res.success) {
      guiData.value = res
      // 默认选择第一个包含元素的窗口，或者 fallback 到第一个
      const firstValidIdx = res.windows.findIndex(w => w.children && w.children.length > 0)
      activeWindowIndex.value = firstValidIdx !== -1 ? firstValidIdx : 0
    }

    // 2. 尝试寻找同名的 GFX（惯例）
    const gfxPath = props.filePath.replace(/\.gui$/, '.gfx')
    const gfxRes = await parseGfxFile(gfxPath).catch(() => null)
    if (gfxRes && gfxRes.success) {
      sprites.value = { ...sprites.value, ...gfxRes.sprites }
    }
  } catch (err) {
    console.error('Failed to load GUI data:', err)
  }
}

// 监听文件内容变化（如果是实时预览）
watch(() => props.content, () => {
  // 如果内容变化，可以重新解析
  // loadData() 
}, { immediate: false })

const handleMouseDown = (e: MouseEvent) => {
  if (e.button === 0 || e.button === 1) { // 左键或中键
    isDragging.value = true
    dragStart.value = { x: e.clientX - offset.value.x, y: e.clientY - offset.value.y }
  }
}

const handleMouseMove = (e: MouseEvent) => {
  if (isDragging.value) {
    offset.value = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y
    }
  }
}

const handleMouseUp = () => {
  isDragging.value = false
}

const handleWheel = (e: WheelEvent) => {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const nextZoom = Math.min(Math.max(0.1, zoom.value + delta), 5.0)
  
  // 以鼠标位置为中心缩放
  if (canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    const worldX = (mouseX - offset.value.x) / zoom.value
    const worldY = (mouseY - offset.value.y) / zoom.value
    
    zoom.value = nextZoom
    
    offset.value = {
      x: mouseX - worldX * zoom.value,
      y: mouseY - worldY * zoom.value
    }
  }
}

const resetView = () => {
  if (canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect()
    // 计算居中 offset
    // 画布中心 - (stage尺寸 * 缩放 / 2)
    const initialZoom = 0.8 // 默认稍微缩小一点以便看全
    zoom.value = initialZoom
    offset.value = {
      x: (rect.width - stageSize.value.width * initialZoom) / 2,
      y: (rect.height - stageSize.value.height * initialZoom) / 2
    }
  } else {
    zoom.value = 1.0
    offset.value = { x: 50, y: 50 }
  }
}

// 生命周期
onMounted(() => {
  loadData()
  // 延迟一下等待 DOM 渲染完成
  setTimeout(resetView, 100)
})

watch(() => props.filePath, () => {
  loadData()
})

watch(() => props.content, () => {
  // 当内容变化时重新加载（支持实时预览）
  loadData()
})
</script>

<style scoped>
.gui-viewer {
  user-select: none;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #3d3d3d;
  border-radius: 2px;
}
::-webkit-scrollbar-thumb:hover {
  background: #4d4d4d;
}
</style>
