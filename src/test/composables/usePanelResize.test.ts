/**
 * usePanelResize composable 的单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePanelResize } from '../../../src/composables/usePanelResize'

describe('usePanelResize', () => {
  let panelResize: ReturnType<typeof usePanelResize>

  beforeEach(() => {
    panelResize = usePanelResize()
  })

  it('应该正确初始化状态', () => {
    expect(panelResize.leftPanelWidth.value).toBe(250)
    expect(panelResize.rightPanelWidth.value).toBe(300)
    expect(panelResize.isResizingLeft.value).toBe(false)
    expect(panelResize.isResizingRight.value).toBe(false)
  })

  it('应该正确开始调整左侧面板', () => {
    // 创建一个模拟的鼠标事件
    const mockEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100
    })
    
    // 阻止默认行为的mock
    mockEvent.preventDefault = vi.fn()
    
    panelResize.startResizeLeft(mockEvent)
    
    expect(panelResize.isResizingLeft.value).toBe(true)
    expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('应该正确开始调整右侧面板', () => {
    // 创建一个模拟的鼠标事件
    const mockEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100
    })
    
    // 阻止默认行为的mock
    mockEvent.preventDefault = vi.fn()
    
    panelResize.startResizeRight(mockEvent)
    
    expect(panelResize.isResizingRight.value).toBe(true)
    expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('应该在鼠标移动时正确调整左侧面板大小', () => {
    // 模拟窗口宽度
    Object.defineProperty(window, 'innerWidth', {
      value: 1200,
      writable: true
    })
    
    // 开始调整左侧面板
    panelResize.isResizingLeft.value = true
    
    // 模拟鼠标移动到新位置
    // 注意：左侧面板宽度计算直接使用 event.clientX
    const mockEvent = new MouseEvent('mousemove', {
      clientX: 300
    })
    
    panelResize.onMouseMove(mockEvent)
    
    expect(panelResize.leftPanelWidth.value).toBe(300)
  })

  it('应该在鼠标移动时正确调整右侧面板大小', () => {
    // 模拟窗口宽度
    Object.defineProperty(window, 'innerWidth', {
      value: 1200,
      writable: true
    })
    
    // 开始调整右侧面板
    panelResize.isResizingRight.value = true
    
    // 模拟鼠标移动到新位置（距离右侧边缘250px）
    const mockEvent = new MouseEvent('mousemove', {
      clientX: 950 // 1200 - 250 = 950
    })
    
    panelResize.onMouseMove(mockEvent)
    
    expect(panelResize.rightPanelWidth.value).toBe(250)
  })

  it('应该尊重左侧面板的最小宽度限制', () => {
    // 开始调整左侧面板
    panelResize.isResizingLeft.value = true
    
    // 尝试将面板宽度调整到小于最小宽度（150）
    const mockEvent = new MouseEvent('mousemove', {
      clientX: 100
    })
    
    panelResize.onMouseMove(mockEvent)
    
    // 面板宽度应该被限制在最小宽度
    expect(panelResize.leftPanelWidth.value).toBe(150)
  })

  it('应该尊重左侧面板的最大宽度限制', () => {
    // 开始调整左侧面板
    panelResize.isResizingLeft.value = true
    
    // 尝试将面板宽度调整到大于最大宽度（500）
    // 注意：左侧面板宽度计算直接使用 event.clientX
    const mockEvent = { clientX: 600 } as MouseEvent
    
    panelResize.onMouseMove(mockEvent)
    
    // 面板宽度应该被限制在最大宽度
    expect(panelResize.leftPanelWidth.value).toBe(500)
  })

  it('应该尊重右侧面板的最小宽度限制', () => {
    // 保存原始的window.innerWidth
    const originalInnerWidth = window.innerWidth
    
    try {
      // 模拟窗口宽度
      Object.defineProperty(window, 'innerWidth', { 
        value: 1200, 
        writable: true 
      })
      
      // 开始调整右侧面板
      panelResize.isResizingRight.value = true
      expect(panelResize.isResizingRight.value).toBe(true)
      
      // 尝试将面板宽度调整到小于最小宽度（200）
      // 右侧面板宽度计算是 window.innerWidth - event.clientX
      // 设置clientX为1100，计算得到的宽度是100，应该被限制在200
      const mockEvent = { clientX: 1100 } as MouseEvent
      
      // 手动计算预期值
      const expectedWidth = window.innerWidth - mockEvent.clientX
      console.log('右侧面板最小宽度测试:', { windowWidth: window.innerWidth, clientX: mockEvent.clientX, expectedWidth })
      
      panelResize.onMouseMove(mockEvent)
      
      // 面板宽度应该被限制在最小宽度
      expect(panelResize.rightPanelWidth.value).toBe(200)
      
      // 停止调整大小
      panelResize.isResizingRight.value = false
    } finally {
      // 恢复原始的window.innerWidth
      Object.defineProperty(window, 'innerWidth', { 
        value: originalInnerWidth, 
        writable: true 
      })
    }
  })

  it('应该尊重右侧面板的最大宽度限制', () => {
    // 保存原始的window.innerWidth
    const originalInnerWidth = window.innerWidth
    
    try {
      // 模拟窗口宽度
      Object.defineProperty(window, 'innerWidth', { 
        value: 1200, 
        writable: true 
      })
      
      // 开始调整右侧面板
      panelResize.isResizingRight.value = true
      expect(panelResize.isResizingRight.value).toBe(true)
      
      // 尝试将面板宽度调整到大于最大宽度（600）
      // 右侧面板宽度计算是 window.innerWidth - event.clientX
      // 设置clientX为500，计算得到的宽度是700，应该被限制在600
      const mockEvent = { clientX: 500 } as MouseEvent
      
      // 手动计算预期值
      const expectedWidth = window.innerWidth - mockEvent.clientX
      console.log('右侧面板最大宽度测试:', { windowWidth: window.innerWidth, clientX: mockEvent.clientX, expectedWidth })
      
      panelResize.onMouseMove(mockEvent)
      
      // 面板宽度应该被限制在最大宽度
      expect(panelResize.rightPanelWidth.value).toBe(600)
      
      // 停止调整大小
      panelResize.isResizingRight.value = false
    } finally {
      // 恢复原始的window.innerWidth
      Object.defineProperty(window, 'innerWidth', { 
        value: originalInnerWidth, 
        writable: true 
      })
    }
  })

  it('应该在停止调整时保持面板宽度不变', () => {
    // 模拟调整左侧面板
    panelResize.isResizingLeft.value = true
    const mockEvent1 = new MouseEvent('mousemove', {
      clientX: 300
    })
    panelResize.onMouseMove(mockEvent1)
    
    // 停止调整
    panelResize.isResizingLeft.value = false
    
    // 再次移动鼠标
    const mockEvent2 = new MouseEvent('mousemove', {
      clientX: 400
    })
    panelResize.onMouseMove(mockEvent2)
    
    // 面板宽度应该保持不变
    expect(panelResize.leftPanelWidth.value).toBe(300)
  })

  it('应该在未调整时忽略鼠标移动', () => {
    // 模拟初始状态
    const initialLeftWidth = panelResize.leftPanelWidth.value
    const initialRightWidth = panelResize.rightPanelWidth.value
    
    // 移动鼠标
    const mockEvent = new MouseEvent('mousemove', {
      clientX: 400
    })
    panelResize.onMouseMove(mockEvent)
    
    // 面板宽度应该保持不变
    expect(panelResize.leftPanelWidth.value).toBe(initialLeftWidth)
    expect(panelResize.rightPanelWidth.value).toBe(initialRightWidth)
  })
})
