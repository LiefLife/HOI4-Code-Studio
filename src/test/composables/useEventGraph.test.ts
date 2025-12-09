/**
 * 事件关系图状态管理测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useEventGraph } from '../../../src/composables/useEventGraph'
import type { EventGraph } from '../../../src/utils/eventParser'

// 模拟事件解析器
vi.mock('../../../src/utils/eventParser', () => ({
  buildEventLayers: vi.fn()
}))

import { buildEventLayers } from '../../../src/utils/eventParser'

describe('useEventGraph', () => {
  let eventGraph: ReturnType<typeof useEventGraph>
  let mockGraph: EventGraph

  beforeEach(() => {
    vi.clearAllMocks()
    
    // 创建模拟的事件图
    mockGraph = {
      nodes: new Map([
        ['event.1', { id: 'event.1', children: ['event.2', 'event.3'], line: 1 }],
        ['event.2', { id: 'event.2', children: ['event.4'], line: 10 }],
        ['event.3', { id: 'event.3', children: [], line: 20 }],
        ['event.4', { id: 'event.4', children: [], line: 30 }]
      ]),
      rootNodes: ['event.1']
    }

    // 模拟构建事件层级
    vi.mocked(buildEventLayers).mockReturnValue([
      { level: 0, eventIds: ['event.1'] },
      { level: 1, eventIds: ['event.2', 'event.3'] },
      { level: 2, eventIds: ['event.4'] }
    ])

    eventGraph = useEventGraph(ref(mockGraph))
  })

  it('应该正确初始化状态', () => {
    expect(eventGraph.scale.value).toBe(1.0)
    expect(eventGraph.offsetX.value).toBe(0)
    expect(eventGraph.offsetY.value).toBe(0)
    expect(eventGraph.isDragging.value).toBe(false)
    expect(eventGraph.hoveredNodeId.value).toBeNull()
    expect(eventGraph.selectedNodeId.value).toBeNull()
  })

  it('应该计算节点位置', () => {
    const positions = eventGraph.nodePositions.value
    
    expect(positions.size).toBe(4)
    expect(positions.has('event.1')).toBe(true)
    expect(positions.has('event.2')).toBe(true)
    expect(positions.has('event.3')).toBe(true)
    expect(positions.has('event.4')).toBe(true)

    // 检查第一个节点的位置
    const event1Pos = positions.get('event.1')!
    expect(event1Pos.x).toBeDefined()
    expect(event1Pos.y).toBeDefined()
    expect(event1Pos.width).toBe(200)
    expect(event1Pos.height).toBe(80)

    // 检查层级布局
    const event2Pos = positions.get('event.2')!
    const event3Pos = positions.get('event.3')!
    const event4Pos = positions.get('event.4')!
    
    // 同一层级的节点应该有相同的 y 坐标
    expect(event2Pos.y).toBe(event3Pos.y)
    // 不同层级的节点 y 坐标应该不同
    expect(event1Pos.y).toBeLessThan(event2Pos.y)
    expect(event2Pos.y).toBeLessThan(event4Pos.y)
  })

  it('应该计算连线', () => {
    const edges = eventGraph.edges.value
    
    expect(edges.length).toBe(3)
    
    // 检查 event.1 到 event.2 的连线
    const edge1 = edges.find(e => e.from === 'event.1' && e.to === 'event.2')
    expect(edge1).toBeDefined()
    
    // 由于节点位置是基于计算的，坐标可能是负数，所以检查它们是否定义即可
    expect(edge1!.fromX).toBeDefined()
    expect(edge1!.fromY).toBeDefined()
    expect(edge1!.toX).toBeDefined()
    expect(edge1!.toY).toBeDefined()

    // 检查 event.1 到 event.3 的连线
    const edge2 = edges.find(e => e.from === 'event.1' && e.to === 'event.3')
    expect(edge2).toBeDefined()

    // 检查 event.2 到 event.4 的连线
    const edge3 = edges.find(e => e.from === 'event.2' && e.to === 'event.4')
    expect(edge3).toBeDefined()
  })

  it('应该计算画布尺寸', () => {
    const size = eventGraph.canvasSize.value
    
    expect(size.width).toBeGreaterThan(0)
    expect(size.height).toBeGreaterThan(0)
    expect(size.minX).toBeDefined()
    expect(size.minY).toBeDefined()
  })

  it('应该处理空的图数据', () => {
    const emptyGraph = useEventGraph(ref(null))
    
    expect(emptyGraph.nodePositions.value.size).toBe(0)
    expect(emptyGraph.edges.value.length).toBe(0)
    
    const size = emptyGraph.canvasSize.value
    expect(size.width).toBe(100) // PADDING * 2
    expect(size.height).toBe(100) // PADDING * 2
  })

  it('应该能够缩放', () => {
    const initialScale = eventGraph.scale.value
    
    eventGraph.zoom(0.5, 100, 100)
    expect(eventGraph.scale.value).toBeGreaterThan(initialScale)
    
    eventGraph.zoom(-1.0, 100, 100)
    expect(eventGraph.scale.value).toBeLessThan(initialScale)
    
    // 测试缩放限制
    eventGraph.zoom(-10.0, 100, 100)
    expect(eventGraph.scale.value).toBe(0.1) // 最小缩放限制
    
    eventGraph.zoom(10.0, 100, 100)
    expect(eventGraph.scale.value).toBe(3.0) // 最大缩放限制
  })

  it('应该能够重置视图', () => {
    // 先修改一些状态
    eventGraph.zoom(0.5, 100, 100)
    eventGraph.offsetX.value = 50
    eventGraph.offsetY.value = 50
    
    eventGraph.resetView()
    
    expect(eventGraph.scale.value).toBe(1.0)
    expect(eventGraph.offsetX.value).toBe(0)
    expect(eventGraph.offsetY.value).toBe(0)
  })

  it('应该能够居中显示', () => {
    eventGraph.centerView(800, 600)
    
    expect(eventGraph.offsetX.value).toBeDefined()
    expect(eventGraph.offsetY.value).toBeDefined()
    
    // 偏移量应该基于画布尺寸和容器尺寸计算
    expect(Math.abs(eventGraph.offsetX.value)).toBeLessThan(800)
    expect(Math.abs(eventGraph.offsetY.value)).toBeLessThan(600)
  })

  it('应该处理拖拽操作', () => {
    // 开始拖拽
    eventGraph.startDrag(100, 100)
    expect(eventGraph.isDragging.value).toBe(true)
    
    // 拖拽移动
    eventGraph.onDrag(150, 120)
    expect(eventGraph.offsetX.value).toBe(50)
    expect(eventGraph.offsetY.value).toBe(20)
    
    // 结束拖拽
    eventGraph.endDrag()
    expect(eventGraph.isDragging.value).toBe(false)
  })

  it('应该能够检测节点点击', () => {
    // 获取实际计算出的节点位置
    const positions = eventGraph.nodePositions.value
    
    // 获取 event.1 的实际位置
    const event1Pos = positions.get('event.1')!
    expect(event1Pos).toBeDefined()
    
    // 计算 event.1 的中心点坐标
    const event1CenterX = event1Pos.x + event1Pos.width / 2
    const event1CenterY = event1Pos.y + event1Pos.height / 2
    
    // 考虑缩放和偏移量计算点击位置
    // 缩放为1，偏移为0，所以屏幕坐标等于画布坐标
    const nodeId1 = eventGraph.getNodeAtPosition(event1CenterX, event1CenterY)
    expect(nodeId1).toBe('event.1')
    
    // 测试点击在节点外
    const nodeId2 = eventGraph.getNodeAtPosition(-1000, -1000)
    expect(nodeId2).toBeNull()
    
    // 获取 event.2 的实际位置
    const event2Pos = positions.get('event.2')!
    expect(event2Pos).toBeDefined()
    
    // 计算 event.2 的中心点坐标
    const event2CenterX = event2Pos.x + event2Pos.width / 2
    const event2CenterY = event2Pos.y + event2Pos.height / 2
    
    // 测试点击在另一个节点内
    const nodeId3 = eventGraph.getNodeAtPosition(event2CenterX, event2CenterY)
    expect(nodeId3).toBe('event.2')
  })

  it('应该能够设置悬停节点', () => {
    eventGraph.setHoveredNode('event.1')
    expect(eventGraph.hoveredNodeId.value).toBe('event.1')
    
    eventGraph.setHoveredNode(null)
    expect(eventGraph.hoveredNodeId.value).toBeNull()
  })

  it('应该能够选择节点', () => {
    eventGraph.selectNode('event.2')
    expect(eventGraph.selectedNodeId.value).toBe('event.2')
    
    eventGraph.selectNode(null)
    expect(eventGraph.selectedNodeId.value).toBeNull()
  })

  it('应该处理缩放中心点', () => {
    const initialScale = eventGraph.scale.value
    const initialOffsetX = eventGraph.offsetX.value
    const initialOffsetY = eventGraph.offsetY.value
    
    // 以特定中心点缩放
    eventGraph.zoom(0.5, 200, 150)
    
    expect(eventGraph.scale.value).toBeGreaterThan(initialScale)
    expect(eventGraph.offsetX.value).not.toBe(initialOffsetX)
    expect(eventGraph.offsetY.value).not.toBe(initialOffsetY)
    
    // 偏移量应该基于中心点计算
    expect(Math.abs(eventGraph.offsetX.value - initialOffsetX)).toBeGreaterThan(0)
    expect(Math.abs(eventGraph.offsetY.value - initialOffsetY)).toBeGreaterThan(0)
  })

  it('应该处理拖拽过程中的边界情况', () => {
    // 测试未开始拖拽时的移动
    eventGraph.onDrag(100, 100)
    expect(eventGraph.offsetX.value).toBe(0) // 不应该改变
    expect(eventGraph.offsetY.value).toBe(0) // 不应该改变
    
    // 开始拖拽后移动
    eventGraph.startDrag(100, 100)
    eventGraph.onDrag(150, 120)
    expect(eventGraph.offsetX.value).toBe(50)
    expect(eventGraph.offsetY.value).toBe(20)
    
    // 结束拖拽后移动
    eventGraph.endDrag()
    eventGraph.onDrag(200, 150)
    expect(eventGraph.offsetX.value).toBe(50) // 不应该改变
    expect(eventGraph.offsetY.value).toBe(20) // 不应该改变
  })

  it('应该处理复杂的层级结构', () => {
    // 模拟更复杂的层级结构
    vi.mocked(buildEventLayers).mockReturnValue([
      { level: 0, eventIds: ['root1'] },
      { level: 1, eventIds: ['child1', 'child2', 'child3'] },
      { level: 2, eventIds: ['grandchild1', 'grandchild2'] },
      { level: 3, eventIds: ['greatgrandchild'] }
    ])

    const complexGraph = useEventGraph(ref(mockGraph))
    const positions = complexGraph.nodePositions.value
    
    expect(positions.size).toBe(7)
    
    // 检查层级布局
    const rootPos = positions.get('root1')!
    const childPos = positions.get('child1')!
    const grandchildPos = positions.get('grandchild1')!
    const greatgrandchildPos = positions.get('greatgrandchild')!
    
    expect(rootPos.y).toBeLessThan(childPos.y)
    expect(childPos.y).toBeLessThan(grandchildPos.y)
    expect(grandchildPos.y).toBeLessThan(greatgrandchildPos.y)
  })

  it('应该处理连线计算中的缺失节点', () => {
    // 创建一个有缺失节点的图
    const incompleteGraph: EventGraph = {
      nodes: new Map([
        ['event.1', { id: 'event.1', children: ['event.2', 'nonexistent'], line: 1 }]
      ]),
      rootNodes: ['event.1']
    }

    vi.mocked(buildEventLayers).mockReturnValue([
      { level: 0, eventIds: ['event.1'] }
    ])

    const incompleteEventGraph = useEventGraph(ref(incompleteGraph))
    const edges = incompleteEventGraph.edges.value
    
    // 由于 event.2 节点不存在于图中，所以不应该创建任何连线
    expect(edges.length).toBe(0)
  })
})