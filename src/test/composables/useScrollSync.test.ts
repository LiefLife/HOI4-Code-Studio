import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useScrollSync } from '@/composables/useScrollSync'

describe('useScrollSync', () => {
  let scrollSync: ReturnType<typeof useScrollSync>
  let mockEditor: HTMLElement
  let mockHighlight: HTMLPreElement
  let mockLineNumbers: HTMLDivElement

  beforeEach(() => {
    scrollSync = useScrollSync()
    
    // 创建模拟DOM元素
    mockEditor = document.createElement('div')
    Object.defineProperty(mockEditor, 'scrollHeight', { value: 1000, writable: true })
    Object.defineProperty(mockEditor, 'clientHeight', { value: 200, writable: true })
    mockEditor.scrollTop = 0
    mockEditor.scrollLeft = 0
    mockEditor.scrollTo = vi.fn()
    
    mockHighlight = document.createElement('pre')
    mockHighlight.scrollTo = vi.fn()
    mockHighlight.scrollTop = 0
    mockHighlight.scrollLeft = 0
    
    mockLineNumbers = document.createElement('div')
    mockLineNumbers.scrollTo = vi.fn()
    mockLineNumbers.scrollTop = 0
    
    // 模拟requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1 as unknown as number
    })
  })

  it('应该初始化并返回正确的函数', () => {
    expect(scrollSync.syncScroll).toBeInstanceOf(Function)
    expect(scrollSync.handleEditorWheel).toBeInstanceOf(Function)
  })

  it('当editor为null时，syncScroll应该什么都不做', () => {
    scrollSync.syncScroll(null, mockHighlight, mockLineNumbers)
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('当scroll未接近底部时，应该同步滚动位置', () => {
    mockEditor.scrollTop = 100
    mockEditor.scrollLeft = 50
    
    scrollSync.syncScroll(mockEditor, mockHighlight, mockLineNumbers)
    
    expect(mockHighlight.scrollTop).toBe(100)
    expect(mockHighlight.scrollLeft).toBe(50)
    expect(mockLineNumbers.scrollTop).toBe(100)
    // 当不是底部区域时，不应该调用scrollTo
    expect(mockHighlight.scrollTo).not.toHaveBeenCalled()
    expect(mockLineNumbers.scrollTo).not.toHaveBeenCalled()
  })

  it('当scroll接近底部时，应该触发回弹效果', () => {
    // 设置滚动位置接近底部（在阈值内）
    Object.defineProperty(mockEditor, 'scrollHeight', { value: 1000, writable: true })
    Object.defineProperty(mockEditor, 'clientHeight', { value: 200, writable: true })
    const maxScroll = mockEditor.scrollHeight - mockEditor.clientHeight // 800
    mockEditor.scrollTop = maxScroll - 20 // 距离底部20px，小于阈值50px
    
    scrollSync.syncScroll(mockEditor, mockHighlight, mockLineNumbers)
    
    // 应该调用scrollTo实现平滑回弹
    expect(mockEditor.scrollTo).toHaveBeenCalledWith({
      top: expect.any(Number),
      behavior: 'smooth'
    })
    expect(mockHighlight.scrollTo).toHaveBeenCalledWith({
      top: expect.any(Number),
      left: 0,
      behavior: 'smooth'
    })
    expect(mockLineNumbers.scrollTo).toHaveBeenCalledWith({
      top: expect.any(Number),
      behavior: 'smooth'
    })
    
    // 检查回弹位置是否正确（maxScroll - bounceDistance）
    const bouncePosition = Math.max(0, maxScroll - 100)
    expect(mockEditor.scrollTo).toHaveBeenCalledWith({
      top: bouncePosition,
      behavior: 'smooth'
    })
  })

  it('当只有部分元素存在时，syncScroll应该正常工作', () => {
    mockEditor.scrollTop = 200
    mockEditor.scrollLeft = 100
    
    scrollSync.syncScroll(mockEditor, null, mockLineNumbers)
    
    expect(mockLineNumbers.scrollTop).toBe(200)
    
    // 重置
    mockLineNumbers.scrollTop = 0
    
    scrollSync.syncScroll(mockEditor, mockHighlight, null)
    
    expect(mockHighlight.scrollTop).toBe(200)
    expect(mockHighlight.scrollLeft).toBe(100)
  })

  it('handleEditorWheel应该调用提供的onSync回调', () => {
    const mockOnSync = vi.fn()
    const mockEvent = {} as WheelEvent
    
    scrollSync.handleEditorWheel(mockEvent, mockEditor, mockOnSync)
    
    expect(mockOnSync).toHaveBeenCalled()
  })

  it('当editor为null时，handleEditorWheel应该什么都不做', () => {
    const mockOnSync = vi.fn()
    const mockEvent = {} as WheelEvent
    
    scrollSync.handleEditorWheel(mockEvent, null, mockOnSync)
    
    expect(mockOnSync).not.toHaveBeenCalled()
  })

  it('当maxScroll为0时（内容未溢出），应该正常处理', () => {
    Object.defineProperty(mockEditor, 'scrollHeight', { value: 100, writable: true })
    Object.defineProperty(mockEditor, 'clientHeight', { value: 200, writable: true })
    mockEditor.scrollTop = 0
    
    scrollSync.syncScroll(mockEditor, mockHighlight, mockLineNumbers)
    
    // 应该不会触发回弹
    expect(mockEditor.scrollTo).not.toHaveBeenCalled()
    expect(mockHighlight.scrollTop).toBe(0)
    expect(mockLineNumbers.scrollTop).toBe(0)
  })

  it('当接近底部阈值正好等于阈值时，应该触发回弹', () => {
    Object.defineProperty(mockEditor, 'scrollHeight', { value: 1000, writable: true })
    Object.defineProperty(mockEditor, 'clientHeight', { value: 200, writable: true })
    const maxScroll = mockEditor.scrollHeight - mockEditor.clientHeight
    mockEditor.scrollTop = maxScroll - 49 // 小于阈值，触发回弹
    
    scrollSync.syncScroll(mockEditor, mockHighlight, mockLineNumbers)
    
    expect(mockEditor.scrollTo).toHaveBeenCalled()
  })
  
  it('当接近底部阈值刚好超过阈值时，不应该触发回弹', () => {
    Object.defineProperty(mockEditor, 'scrollHeight', { value: 1000, writable: true })
    Object.defineProperty(mockEditor, 'clientHeight', { value: 200, writable: true })
    const maxScroll = mockEditor.scrollHeight - mockEditor.clientHeight
    mockEditor.scrollTop = maxScroll - 51 // 刚好超过阈值，不触发回弹
    
    scrollSync.syncScroll(mockEditor, mockHighlight, mockLineNumbers)
    
    expect(mockEditor.scrollTo).not.toHaveBeenCalled()
  })
})
