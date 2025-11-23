<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { parseEventFile } from '../../utils/eventParser'
import cytoscape from 'cytoscape'
// @ts-ignore - cytoscape-dagre 没有类型定义
import dagre from 'cytoscape-dagre'

// 注册 dagre 布局
cytoscape.use(dagre)

const props = defineProps<{
  content: string        // 事件文件内容
  filePath: string       // 文件路径
}>()

const emit = defineEmits<{
  jumpToEvent: [eventId: string, line: number]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const cyContainerRef = ref<HTMLDivElement | null>(null)
let cy: cytoscape.Core | null = null

// 解析事件图谱
const eventGraph = computed(() => {
  try {
    return parseEventFile(props.content)
  } catch (error) {
    console.error('解析事件文件失败:', error)
    return null
  }
})

// 错误信息
const errorMessage = computed(() => {
  if (!eventGraph.value) {
    return '无法解析事件文件'
  }
  if (eventGraph.value.nodes.size === 0) {
    return '文件中没有找到 country_event 定义'
  }
  return null
})

// 当前缩放级别
const zoomLevel = ref(1.0)

// 初始化 Cytoscape
function initCytoscape() {
  if (!cyContainerRef.value || !eventGraph.value) return

  // 转换为 Cytoscape 数据格式
  const elements: any[] = []

  // 添加节点
  eventGraph.value.nodes.forEach((node, eventId) => {
    elements.push({
      data: {
        id: eventId,
        label: eventId,
        title: node.title || '',
        line: node.line
      }
    })
  })

  // 添加边
  eventGraph.value.nodes.forEach((node, eventId) => {
    node.children.forEach(childId => {
      elements.push({
        data: {
          source: eventId,
          target: childId
        }
      })
    })
  })

  // 初始化 Cytoscape 实例
  cy = cytoscape({
    container: cyContainerRef.value,
    elements,
    style: [
      // 节点样式
      {
        selector: 'node',
        style: {
          'background-color': '#0f172a',
          'border-color': '#334155',
          'border-width': 2,
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#e2e8f0',
          'font-size': '14px',
          'font-weight': 'bold',
          'width': 200,
          'height': 80,
          'shape': 'roundrectangle',
          'text-wrap': 'wrap',
          'text-max-width': '180px'
        }
      },
      // 节点悬停样式
      {
        selector: 'node.hovered',
        style: {
          'background-color': '#1e293b',
          'border-color': '#475569',
          'border-width': 2
        }
      },
      // 节点选中样式
      {
        selector: 'node:selected',
        style: {
          'background-color': '#3b82f6',
          'border-color': '#60a5fa',
          'border-width': 3
        }
      },
      // 边样式
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#4a5568',
          'target-arrow-color': '#4a5568',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'arrow-scale': 1.5
        }
      },
      // 边悬停样式
      {
        selector: 'edge:hover',
        style: {
          'width': 3,
          'line-color': '#60a5fa',
          'target-arrow-color': '#60a5fa'
        }
      }
    ],
    layout: {
      name: 'dagre',
      // @ts-ignore - dagre 布局选项
      rankDir: 'TB',  // 从上到下
      nodeSep: 100,
      rankSep: 120,
      animate: true,
      animationDuration: 500,
      animationEasing: 'ease-out'
    } as any,
    minZoom: 0.1,
    maxZoom: 3.0
  })

  // 监听缩放事件
  cy.on('zoom', () => {
    if (cy) {
      zoomLevel.value = cy.zoom()
    }
  })

  // 双击节点跳转
  cy.on('dblclick', 'node', (event) => {
    const node = event.target
    const eventId = node.id()
    const line = node.data('line')
    if (line) {
      emit('jumpToEvent', eventId, line)
    }
  })

  cy.on('mouseover', 'node', (event) => {
    event.target.addClass('hovered')
  })

  cy.on('mouseout', 'node', (event) => {
    event.target.removeClass('hovered')
  })

  // 初始居中
  setTimeout(() => {
    if (cy) {
      cy.fit(undefined, 50)
    }
  }, 100)
}

// 重置视图
function resetView() {
  if (cy) {
    cy.zoom(1)
    cy.center()
  }
}

// 居中显示
function handleCenter() {
  if (cy) {
    cy.fit(undefined, 50)
  }
}

// 监听事件图谱变化
watch(eventGraph, () => {
  if (cy) {
    cy.destroy()
  }
  setTimeout(() => {
    initCytoscape()
  }, 50)
})

// 组件挂载后初始化
onMounted(() => {
  setTimeout(() => {
    initCytoscape()
  }, 100)
})

// 清理
onUnmounted(() => {
  if (cy) {
    cy.destroy()
  }
})
</script>

<template>
  <div ref="containerRef" class="w-full h-full flex flex-col bg-hoi4-gray/50">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between px-4 py-2 bg-hoi4-accent/70 border-b border-hoi4-border/40">
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        <span class="text-hoi4-text font-semibold">事件关系图</span>
        <span v-if="eventGraph" class="text-hoi4-text-dim text-xs">
          {{ eventGraph.nodes.size }} 个事件
        </span>
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
      <p class="text-hoi4-text-dim text-xs">
        💡 提示: 滚轮缩放 | 拖拽平移 | 双击节点跳转到定义
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Cytoscape 容器样式会被库自动处理 */
</style>
