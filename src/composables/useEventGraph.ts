/**
 * 事件关系图状态管理
 * 管理缩放、平移、布局等状态
 */

import { ref, computed, type Ref } from 'vue'
import type { EventGraph, EventNode } from '../utils/eventParser'
import { buildEventLayers } from '../utils/eventParser'

/**
 * 节点位置信息
 */
export interface NodePosition {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 连线信息
 */
export interface EdgeInfo {
  from: string  // 源事件ID
  to: string    // 目标事件ID
  fromX: number
  fromY: number
  toX: number
  toY: number
}

/**
 * 图形配置
 */
const NODE_WIDTH = 200
const NODE_HEIGHT = 80
const HORIZONTAL_GAP = 100
const VERTICAL_GAP = 120
const PADDING = 50

/**
 * 事件关系图状态管理
 */
export function useEventGraph(graph: Ref<EventGraph | null>) {
  const scale = ref(1.0)
  const offsetX = ref(0)
  const offsetY = ref(0)
  const isDragging = ref(false)
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const hoveredNodeId = ref<string | null>(null)
  const selectedNodeId = ref<string | null>(null)

  /**
   * 计算节点位置
   */
  const nodePositions = computed((): Map<string, NodePosition> => {
    const positions = new Map<string, NodePosition>()
    
    if (!graph.value) return positions

    const layers = buildEventLayers(graph.value)
    
    layers.forEach((layer, levelIndex) => {
      const nodesInLayer = layer.eventIds.length
      const totalWidth = nodesInLayer * NODE_WIDTH + (nodesInLayer - 1) * HORIZONTAL_GAP
      const startX = -totalWidth / 2

      layer.eventIds.forEach((eventId, indexInLayer) => {
        const x = startX + indexInLayer * (NODE_WIDTH + HORIZONTAL_GAP)
        const y = PADDING + levelIndex * (NODE_HEIGHT + VERTICAL_GAP)

        positions.set(eventId, {
          x,
          y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT
        })
      })
    })

    return positions
  })

  /**
   * 计算连线
   */
  const edges = computed((): EdgeInfo[] => {
    const edgeList: EdgeInfo[] = []
    
    if (!graph.value) return edgeList

    graph.value.nodes.forEach((node, eventId) => {
      const fromPos = nodePositions.value.get(eventId)
      if (!fromPos) return

      node.children.forEach(childId => {
        const toPos = nodePositions.value.get(childId)
        if (!toPos) return

        edgeList.push({
          from: eventId,
          to: childId,
          fromX: fromPos.x + fromPos.width / 2,
          fromY: fromPos.y + fromPos.height,
          toX: toPos.x + toPos.width / 2,
          toY: toPos.y
        })
      })
    })

    return edgeList
  })

  /**
   * 计算画布尺寸
   */
  const canvasSize = computed(() => {
    let minX = 0, maxX = 0, minY = 0, maxY = 0
    
    nodePositions.value.forEach(pos => {
      minX = Math.min(minX, pos.x)
      maxX = Math.max(maxX, pos.x + pos.width)
      minY = Math.min(minY, pos.y)
      maxY = Math.max(maxY, pos.y + pos.height)
    })

    return {
      width: maxX - minX + PADDING * 2,
      height: maxY - minY + PADDING * 2,
      minX: minX - PADDING,
      minY: minY - PADDING
    }
  })

  /**
   * 缩放
   */
  function zoom(delta: number, centerX: number, centerY: number) {
    const oldScale = scale.value
    const newScale = Math.max(0.1, Math.min(3.0, scale.value + delta))
    
    if (newScale !== oldScale) {
      // 以鼠标位置为中心进行缩放
      const scaleRatio = newScale / oldScale
      offsetX.value = centerX - (centerX - offsetX.value) * scaleRatio
      offsetY.value = centerY - (centerY - offsetY.value) * scaleRatio
      scale.value = newScale
    }
  }

  /**
   * 重置视图
   */
  function resetView() {
    scale.value = 1.0
    offsetX.value = 0
    offsetY.value = 0
  }

  /**
   * 居中显示
   */
  function centerView(containerWidth: number, containerHeight: number) {
    const size = canvasSize.value
    offsetX.value = (containerWidth - size.width * scale.value) / 2 - size.minX * scale.value
    offsetY.value = (containerHeight - size.height * scale.value) / 2 - size.minY * scale.value
  }

  /**
   * 开始拖拽
   */
  function startDrag(x: number, y: number) {
    isDragging.value = true
    dragStartX.value = x - offsetX.value
    dragStartY.value = y - offsetY.value
  }

  /**
   * 拖拽移动
   */
  function onDrag(x: number, y: number) {
    if (!isDragging.value) return
    offsetX.value = x - dragStartX.value
    offsetY.value = y - dragStartY.value
  }

  /**
   * 结束拖拽
   */
  function endDrag() {
    isDragging.value = false
  }

  /**
   * 检查点是否在节点内
   */
  function getNodeAtPosition(x: number, y: number): string | null {
    // 转换屏幕坐标到画布坐标
    const canvasX = (x - offsetX.value) / scale.value
    const canvasY = (y - offsetY.value) / scale.value

    for (const [eventId, pos] of nodePositions.value.entries()) {
      if (
        canvasX >= pos.x &&
        canvasX <= pos.x + pos.width &&
        canvasY >= pos.y &&
        canvasY <= pos.y + pos.height
      ) {
        return eventId
      }
    }

    return null
  }

  /**
   * 设置悬停节点
   */
  function setHoveredNode(nodeId: string | null) {
    hoveredNodeId.value = nodeId
  }

  /**
   * 选中节点
   */
  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId
  }

  return {
    scale,
    offsetX,
    offsetY,
    isDragging,
    hoveredNodeId,
    selectedNodeId,
    nodePositions,
    edges,
    canvasSize,
    zoom,
    resetView,
    centerView,
    startDrag,
    onDrag,
    endDrag,
    getNodeAtPosition,
    setHoveredNode,
    selectNode
  }
}
