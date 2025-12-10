/**
 * EditorFontSettings 组件的单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import EditorFontSettings from '@/components/settings/EditorFontSettings.vue'
import { useEditorFont } from '@/composables/useEditorFont'

// Mock the useEditorFont composable
// We need to use the real Vue ref and computed functions to make the mock work correctly
vi.mock('@/composables/useEditorFont', () => {
  // Remove the inline mock - we'll mock it in beforeEach
  return {
    useEditorFont: vi.fn()
  }
})

describe('EditorFontSettings', () => {
  let wrapper: any
  let mockUseEditorFont: any
  let mockSetFontConfig: any

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    
    // Get the mock implementation and save references
    mockUseEditorFont = useEditorFont as import('vitest').MockedFunction<typeof useEditorFont>
    
    // Create a mock setFontConfig function that we can reuse
    mockSetFontConfig = vi.fn()
    
    // Import Vue's ref function to create a reactive fontConfig
    const { ref } = require('vue')
    
    // Create a reactive fontConfig using Vue's ref
    const fontConfigRef = ref({ family: 'Consolas', size: 14, weight: '400', lineHeight: 1.5 })
    
    // Mock the useEditorFont function to return our mock setFontConfig
    mockUseEditorFont.mockReturnValue({
      fontConfig: fontConfigRef,
      availableFonts: [
        { value: 'Consolas', label: 'Consolas (Windows默认)' },
        { value: 'Fira Code', label: 'Fira Code (带连字)' },
        { value: 'JetBrains Mono', label: 'JetBrains Mono (JetBrains)' }
      ],
      fontWeights: [
        { value: '300', label: '细体 (300)' },
        { value: '400', label: '正常 (400)' },
        { value: '700', label: '粗体 (700)' }
      ],
      fontSizes: [
        { value: 12, label: '12px' },
        { value: 14, label: '14px' },
        { value: 16, label: '16px' }
      ],
      setFontConfig: mockSetFontConfig
    })
    
    // Mount the component
    wrapper = mount(EditorFontSettings)
  })

  it('应该正确渲染组件', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.settings-form-group').exists()).toBe(true)
  })

  it('应该显示当前字体配置', () => {
    // Check font size display - find all labels and check one contains '14px'
    const labels = wrapper.findAll('.settings-form-label')
    const hasFontSizeLabel = labels.some((label: any) => label.text().includes('14px'))
    expect(hasFontSizeLabel).toBe(true)
    
    // Check font family select
    const fontSelect = wrapper.find('select')
    expect(fontSelect.exists()).toBe(true)
    expect(fontSelect.element.value).toBe('Consolas')
  })

  it('应该在字体族变化时调用 setFontConfig 并触发 save 事件', () => {
    // Change font family
    const fontSelect = wrapper.find('select')
    fontSelect.setValue('Fira Code')
    fontSelect.trigger('change')
    
    // Verify setFontConfig was called with correct parameters
    expect(mockSetFontConfig).toHaveBeenCalledWith(expect.objectContaining({
      family: 'Fira Code'
    }))
    
    // Verify save event was emitted
    expect(wrapper.emitted('save')).toBeTruthy()
  })

  it('应该在字体大小滑块变化时调用 setFontConfig 并触发 save 事件', () => {
    // Change font size using slider
    const sizeSlider = wrapper.find('input[type="range"]')
    sizeSlider.setValue(16)
    sizeSlider.trigger('input')
    
    // Verify setFontConfig was called with correct parameters
    expect(mockSetFontConfig).toHaveBeenCalledWith(expect.objectContaining({
      size: 16
    }))
    
    // Verify save event was emitted
    expect(wrapper.emitted('save')).toBeTruthy()
  })

  it('应该在字体大小下拉框变化时调用 setFontConfig 并触发 save 事件', () => {
    // Change font size using select
    const sizeSelect = wrapper.findAll('select')[1]
    sizeSelect.setValue(12)
    sizeSelect.trigger('change')
    
    // Verify setFontConfig was called with correct parameters
    expect(mockSetFontConfig).toHaveBeenCalledWith(expect.objectContaining({
      size: 12
    }))
    
    // Verify save event was emitted
    expect(wrapper.emitted('save')).toBeTruthy()
  })

  it('应该在字体粗细变化时调用 setFontConfig 并触发 save 事件', () => {
    // Change font weight
    const weightRadio = wrapper.find('input[type="radio"][value="700"]')
    weightRadio.trigger('change')
    
    // Verify setFontConfig was called with correct parameters
    expect(mockSetFontConfig).toHaveBeenCalledWith(expect.objectContaining({
      weight: '700'
    }))
    
    // Verify save event was emitted
    expect(wrapper.emitted('save')).toBeTruthy()
  })

  it('应该在行高滑块变化时调用 setFontConfig 并触发 save 事件', () => {
    // Change line height using slider
    const lineHeightSlider = wrapper.findAll('input[type="range"]')[1]
    lineHeightSlider.setValue(2.0)
    lineHeightSlider.trigger('input')
    
    // Verify setFontConfig was called with correct parameters
    expect(mockSetFontConfig).toHaveBeenCalledWith(expect.objectContaining({
      lineHeight: 2.0
    }))
    
    // Verify save event was emitted
    expect(wrapper.emitted('save')).toBeTruthy()
  })

  it('应该在行高输入框变化时调用 setFontConfig 并触发 save 事件', () => {
    // Change line height using input
    const lineHeightInput = wrapper.find('input[type="number"]')
    lineHeightInput.setValue(1.2)
    lineHeightInput.trigger('input')
    
    // Verify setFontConfig was called with correct parameters
    expect(mockSetFontConfig).toHaveBeenCalledWith(expect.objectContaining({
      lineHeight: 1.2
    }))
    
    // Verify save event was emitted
    expect(wrapper.emitted('save')).toBeTruthy()
  })

  it('应该渲染所有字体选项', () => {
    const fontOptions = wrapper.find('select').findAll('option')
    expect(fontOptions.length).toBeGreaterThan(1)
  })

  it('应该渲染所有字体粗细选项', () => {
    const weightOptions = wrapper.findAll('input[type="radio"]')
    expect(weightOptions.length).toBeGreaterThan(1)
  })
})
