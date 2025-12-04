<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { parseFocusTreeFile, searchFocuses } from '../../utils/focusTreeParser'
import cytoscape from 'cytoscape'
import { useImageProcessor } from '../../composables/useImageProcessor'

const props = defineProps<{
  content: string
  filePath: string
  gameDirectory?: string
  projectPath?: string
}>()

const emit = defineEmits<{
  jumpToFocus: [focusId: string, line: number]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const cyContainerRef = ref<HTMLDivElement | null>(null)
let cy: cytoscape.Core | null = null

const GRID_SIZE = 150 // 每个网格单位 = 150px

// 搜索相关
const searchQuery = ref('')
const highlightedNodes = ref<Set<string>>(new Set())

// 图片处理管理器
const {
  isProcessing,
  stats,
  initWorkerPool,
  loadIconsBatch,
  preloadIcons,
  dispose
} = useImageProcessor()

// 图片加载状态
const imageLoadingProgress = ref(0)
const imageLoadingTotal = ref(0)
const showImageLoadingIndicator = ref(false)

// 解析国策树
const focusTree = computed(() => {
  try {
    return parseFocusTreeFile(props.content)
  } catch (error) {
    console.error('解析国策文件失败:', error)
    return null
  }
})

// 错误信息
const errorMessage = computed(() => {
  if (!focusTree.value) {
    return '无法解析国策文件'
  }
  if (focusTree.value.focuses.size === 0) {
    return '文件中没有找到 focus 定义'
  }
  return null
})

const zoomLevel = ref(1.0)

/**
 * 初始化图片处理
 */
function initImageProcessor() {
  // 初始化Worker池（使用4个Worker）
  initWorkerPool(4)
}

/**
 * 加载国策图标（新的多线程版本）
 */
async function loadFocusIcons() {
  if (!focusTree.value) return

  // 收集所有需要加载的图标
  const iconNames: string[] = []
  
  focusTree.value.focuses.forEach((node) => {
    if (node.icon) {
      iconNames.push(node.icon)
    }
  })

  if (iconNames.length === 0) return

  // 显示加载指示器
  showImageLoadingIndicator.value = true
  imageLoadingTotal.value = iconNames.length
  imageLoadingProgress.value = 0

  // 批量加载图标（后台处理）
  try {
    await loadIconsBatch(iconNames, {
      projectPath: props.projectPath,
      gameDirectory: props.gameDirectory,
      onProgress: (loaded, total) => {
        imageLoadingProgress.value = loaded
        imageLoadingTotal.value = total
      },
      onItemLoaded: (iconName, dataUrl) => {
        // 当单个图标加载完成时，立即更新对应的节点
        if (cy) {
          cy.nodes().forEach(node => {
            const nodeIcon = node.data('icon')
            if (nodeIcon === iconName) {
              node.style({
                'background-image': `url(${dataUrl})`,
                'background-fit': 'cover'
              })
            }
          })
        }
      },
      priority: 'normal'
    })

    // 预加载相关图标（低优先级）
    preloadRelatedIcons()

  } catch (error) {
    console.error('批量加载图标失败:', error)
  } finally {
    // 隐藏加载指示器
    setTimeout(() => {
      showImageLoadingIndicator.value = false
    }, 500)
  }
}

/**
 * 预加载相关图标（提升用户体验）
 */
function preloadRelatedIcons() {
  if (!focusTree.value) return

  // 收集相关图标（互斥国策、前置国策等）
  const relatedIcons = new Set<string>()
  
  focusTree.value.focuses.forEach((node) => {
    if (node.mutually_exclusive) {
      node.mutually_exclusive.forEach(exclusiveId => {
        const exclusiveNode = focusTree.value?.focuses.get(exclusiveId)
        if (exclusiveNode?.icon) {
          relatedIcons.add(exclusiveNode.icon)
        }
      })
    }

    if (node.prerequisite) {
      node.prerequisite.forEach(orGroup => {
        orGroup.forEach(prereqId => {
          const prereqNode = focusTree.value?.focuses.get(prereqId)
          if (prereqNode?.icon) {
            relatedIcons.add(prereqNode.icon)
          }
        })
      })
    }
  })

  // 预加载这些图标
  if (relatedIcons.size > 0) {
    preloadIcons(Array.from(relatedIcons), {
      projectPath: props.projectPath,
      gameDirectory: props.gameDirectory
    })
  }
}

// 视图状态
const viewState = ref({
  zoom: 1.0,
  pan: { x: 0, y: 0 }
})

// 保存视图状态
function saveViewState() {
  if (cy) {
    viewState.value = {
      zoom: cy.zoom(),
      pan: cy.pan()
    }
  }
}

// 恢复视图状态
function restoreViewState() {
  if (cy) {
    cy.zoom(viewState.value.zoom)
    cy.pan(viewState.value.pan)
  }
}

// 初始化 Cytoscape
async function initCytoscape() {
  if (!cyContainerRef.value || !focusTree.value) return

  // 保存当前视图状态（如果存在）
  saveViewState()

  const elements: any[] = []

  // 添加节点
  focusTree.value.focuses.forEach((node) => {
    // 使用绝对坐标
    const x = (node.absoluteX ?? node.x) * GRID_SIZE
    const y = (node.absoluteY ?? node.y) * GRID_SIZE

    elements.push({
      data: {
        id: node.id,
        label: node.id,
        icon: node.icon,
        cost: node.cost,
        line: node.line,
        x: node.absoluteX ?? node.x,
        y: node.absoluteY ?? node.y
      },
      position: { x, y }
    })
  })

  // 添加边（前置条件连接）
  focusTree.value.focuses.forEach((node, focusId) => {
    // 前置条件连线
    if (node.prerequisite && node.prerequisite.length > 0) {
      node.prerequisite.forEach(orGroup => {
        orGroup.forEach(prereqId => {
          elements.push({
            data: {
              id: `${prereqId}->${focusId}`,
              source: prereqId,
              target: focusId,
              isDashed: orGroup.length > 1, // OR关系用虚线
              isPrerequisite: true
            }
          })
        })
      })
    }

    // 互斥关系连线
    if (node.mutually_exclusive && node.mutually_exclusive.length > 0) {
      node.mutually_exclusive.forEach(exclusiveId => {
        // 避免重复连线（只从小ID连到大ID）
        if (focusId < exclusiveId) {
          elements.push({
            data: {
              id: `${focusId}<->${exclusiveId}`,
              source: focusId,
              target: exclusiveId,
              isExclusive: true
            }
          })
        }
      })
    }
  })

  // 初始化 Cytoscape
  cy = cytoscape({
    container: cyContainerRef.value,
    elements,
    style: [
      // 节点默认样式
      {
        selector: 'node',
        style: {
          'background-color': 'transparent',
          'background-opacity': 0,
          'border-color': 'transparent',
          'border-width': 0,
          'label': 'data(label)',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-margin-y': 8,
          'color': '#e2e8f0',
          'font-size': '11px',
          'font-weight': 'bold',
          'width': 90,
          'height': 70,
          'shape': 'roundrectangle',
          'text-wrap': 'wrap',
          'text-max-width': '85px',
          'padding': '5px'
        }
      },
      // 节点悬停
      {
        selector: 'node.hovered',
        style: {
          'background-color': 'rgba(45, 90, 143, 0.3)',
          'background-opacity': 0.3,
          'border-color': '#5ba3ff',
          'border-width': 2,
          'z-index': 999
        }
      },
      // 高亮节点（搜索结果）
      {
        selector: 'node.highlighted',
        style: {
          'background-color': 'rgba(255, 107, 107, 0.3)',
          'background-opacity': 0.3,
          'border-color': '#ff3838',
          'border-width': 3
        }
      },
      // 前置条件边（实线）
      {
        selector: 'edge[isPrerequisite][!isDashed]',
        style: {
          'width': 3,
          'line-color': '#4a90e2',
          'target-arrow-color': '#4a90e2',
          'target-arrow-shape': 'triangle',
          'arrow-scale': 1.5,
          'curve-style': 'taxi',
          'taxi-direction': 'vertical',
          'taxi-turn': '50%',
          'taxi-turn-min-distance': 10,
          'source-endpoint': 'outside-to-node',
          'target-endpoint': 'outside-to-node'
        }
      },
      // 前置条件边（虚线 - OR关系）
      {
        selector: 'edge[isPrerequisite][isDashed]',
        style: {
          'width': 2,
          'line-color': '#88aaff',
          'line-style': 'dashed',
          'target-arrow-color': '#88aaff',
          'target-arrow-shape': 'triangle',
          'arrow-scale': 1.5,
          'curve-style': 'taxi',
          'taxi-direction': 'vertical',
          'taxi-turn': '50%',
          'taxi-turn-min-distance': 10,
          'source-endpoint': 'outside-to-node',
          'target-endpoint': 'outside-to-node'
        }
      },
      // 互斥关系边（红色）
      {
        selector: 'edge[isExclusive]',
        style: {
          'width': 2,
          'line-color': '#ff4444',
          'line-style': 'dotted',
          'curve-style': 'bezier'
        }
      }
    ],
    layout: {
      name: 'preset' // 使用预设坐标
    } as any,
    minZoom: 0.1,
    maxZoom: 3.0,
    wheelSensitivity: 2, // 滚轮缩放灵敏度
    autoungrabify: true, // 禁止拖动节点
    autounselectify: false // 允许选中节点
  })

  // 监听缩放
  cy.on('zoom', () => {
    if (cy) zoomLevel.value = cy.zoom()
  })

  // 双击跳转
  cy.on('dblclick', 'node', (event) => {
    const node = event.target
    const focusId = node.id()
    const line = node.data('line')
    if (line) {
      emit('jumpToFocus', focusId, line)
    }
  })

  cy.on('mouseover', 'node', (event) => {
    event.target.addClass('hovered')
  })

  cy.on('mouseout', 'node', (event) => {
    event.target.removeClass('hovered')
  })

  // 恢复视图状态或初始居中
  setTimeout(() => {
    if (cy) {
      // 如果有保存的视图状态，恢复它，否则初始居中
      if (viewState.value.zoom !== 1.0 || viewState.value.pan.x !== 0 || viewState.value.pan.y !== 0) {
        restoreViewState()
      } else {
        cy.fit(undefined, 50)
      }
    }
  }, 100)

  // 启动后台图片加载（不等待）
  setTimeout(() => {
    loadFocusIcons()
  }, 200)
}

function resetView() {
  if (cy) {
    cy.zoom(1)
    cy.center()
  }
}

function handleCenter() {
  if (cy) cy.fit(undefined, 50)
}

// 处理搜索
function handleSearch() {
  if (!cy || !focusTree.value) return

  // 清除之前的高亮
  cy.nodes().removeClass('highlighted')
  highlightedNodes.value.clear()

  if (!searchQuery.value.trim()) return

  // 搜索匹配的节点
  const results = searchFocuses(focusTree.value.focuses, searchQuery.value)
  
  results.forEach(focusId => {
    const node = cy!.getElementById(focusId)
    if (node) {
      node.addClass('highlighted')
      highlightedNodes.value.add(focusId)
    }
  })

  // 如果有结果，居中到第一个
  if (results.length > 0) {
    const firstNode = cy.getElementById(results[0])
    if (firstNode) {
      cy.animate({
        center: { eles: firstNode },
        zoom: 1.5
      }, {
        duration: 500
      })
    }
  }
}

// 清除搜索
function clearSearch() {
  searchQuery.value = ''
  if (cy) {
    cy.nodes().removeClass('highlighted')
  }
  highlightedNodes.value.clear()
}

watch(focusTree, () => {
  // 保存当前视图状态
  saveViewState()
  // 销毁当前实例
  if (cy) cy.destroy()
  // 重新初始化，会自动恢复视图状态
  setTimeout(() => initCytoscape(), 50)
})

// 直接监听内容变化，确保实时更新
watch(() => props.content, (newContent, oldContent) => {
  console.log('FocusTreeViewer: 内容发生变化，重新解析渲染')
  console.log('新内容长度:', newContent?.length)
  console.log('旧内容长度:', oldContent?.length)
  // focusTree 计算属性会自动更新，但我们添加额外的日志
})

onMounted(() => {
  // 初始化图片处理器
  initImageProcessor()
  
  // 延迟初始化Cytoscape
  setTimeout(() => initCytoscape(), 100)
})

onUnmounted(() => {
  if (cy) cy.destroy()
  
  // 清理图片处理器资源
  dispose()
})
</script>

<template>
  <div ref="containerRef" class="w-full h-full flex flex-col bg-hoi4-gray/50">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between px-4 py-2 bg-hoi4-accent/70 border-b border-hoi4-border/40">
      <div class="flex items-center space-x-3">
        <svg class="w-5 h-5 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
        </svg>
        <span class="text-hoi4-text font-semibold">国策树</span>
        <span v-if="focusTree" class="text-hoi4-text-dim text-xs">
          {{ focusTree.focuses.size }} 个国策
        </span>
        
        <!-- 图片加载指示器 -->
        <div v-if="showImageLoadingIndicator" class="flex items-center space-x-2 ml-4">
          <div class="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
          <span class="text-hoi4-text-dim text-xs">
            加载图标 {{ imageLoadingProgress }}/{{ imageLoadingTotal }}
          </span>
          <!-- 进度条 -->
          <div class="w-20 h-1.5 bg-hoi4-border/40 rounded-full overflow-hidden">
            <div 
              class="h-full bg-blue-400 transition-all duration-300"
              :style="{ width: `${(imageLoadingProgress / imageLoadingTotal) * 100}%` }"
            ></div>
          </div>
        </div>
        
        <!-- 搜索框 -->
        <div class="flex items-center space-x-2 ml-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索国策 ID..."
            class="px-2 py-1 bg-hoi4-gray/50 border border-hoi4-border/60 rounded text-hoi4-text text-xs focus:outline-none focus:border-hoi4-accent w-40"
            @keyup.enter="handleSearch"
          />
          <button
            @click="handleSearch"
            class="px-2 py-1 bg-hoi4-gray hover:bg-hoi4-border rounded text-hoi4-text text-xs transition-colors"
            title="搜索"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </button>
          <button
            v-if="highlightedNodes.size > 0"
            @click="clearSearch"
            class="px-2 py-1 bg-red-600/80 hover:bg-red-700 rounded text-white text-xs transition-colors"
            title="清除搜索"
          >
            ✕
          </button>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <button
          @click="resetView"
          class="px-3 py-1 bg-hoi4-gray hover:bg-hoi4-border rounded text-hoi4-text text-xs transition-colors"
          title="重置缩放"
        >
          重置
        </button>
        <button
          @click="handleCenter"
          class="px-3 py-1 bg-hoi4-gray hover:bg-hoi4-border rounded text-hoi4-text text-xs transition-colors"
          title="居中显示"
        >
          居中
        </button>
        <span class="text-hoi4-text-dim text-xs">
          缩放: {{ Math.round(zoomLevel * 100) }}%
        </span>
        
        <!-- 图片处理状态 -->
        <div v-if="isProcessing" class="flex items-center space-x-1 text-xs">
          <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span class="text-hoi4-text-dim">
            处理中 ({{ stats.loadingTasks }})
          </span>
        </div>
      </div>
    </div>

    <!-- 画布容器 -->
    <div class="flex-1 relative overflow-hidden">
      <!-- 错误提示 -->
      <div v-if="errorMessage" class="absolute inset-0 flex items-center justify-center z-10">
        <div class="bg-hoi4-border/20 p-6 rounded-lg text-center">
          <svg class="w-12 h-12 mx-auto mb-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <p class="text-hoi4-text">{{ errorMessage }}</p>
        </div>
      </div>

      <!-- Cytoscape 容器 -->
      <div
        v-show="!errorMessage"
        ref="cyContainerRef"
        class="w-full h-full"
      ></div>
    </div>

    <!-- 提示信息 -->
    <div class="px-4 py-2 bg-hoi4-accent/70 border-t border-hoi4-border/40">
      <div class="flex items-center justify-between">
        <p class="text-hoi4-text-dim text-xs">
          💡 提示: 滚轮缩放 | 拖拽平移 | 双击节点跳转到定义
        </p>
        <div class="flex items-center space-x-3 text-xs">
          <span class="flex items-center space-x-1">
            <span class="w-4 h-0.5 bg-blue-400"></span>
            <span class="text-hoi4-text-dim">AND</span>
          </span>
          <span class="flex items-center space-x-1">
            <span class="w-4 h-0.5 bg-blue-300 border-dashed border-t border-blue-300"></span>
            <span class="text-hoi4-text-dim">OR</span>
          </span>
          <span class="flex items-center space-x-1">
            <span class="w-4 h-0.5 bg-red-400 border-dotted border-t-2 border-red-400"></span>
            <span class="text-hoi4-text-dim">互斥</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Cytoscape 容器样式会被库自动处理 */
</style>
