import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EditorSaveSettings from '@/components/settings/EditorSaveSettings.vue'

describe('EditorSaveSettings 组件', () => {
  const defaultProps = {
    autoSave: false,
    disableErrorHandling: false,
    enableRGBColorDisplay: false
  }

  const createWrapper = (props = {}) => {
    return mount(EditorSaveSettings, {
      props: { ...defaultProps, ...props }
    })
  }

  it('应该正确渲染所有设置选项', () => {
    const wrapper = createWrapper()
    
    // 检查是否渲染了三个设置选项
    const settingsOptions = wrapper.findAll('.settings-option')
    expect(settingsOptions).toHaveLength(3)
    
    // 检查各个选项的标题
    const titles = wrapper.findAll('.settings-option-title')
    expect(titles[0].text()).toBe('启用自动保存')
    expect(titles[1].text()).toBe('RGB颜色显示')
    expect(titles[2].text()).toBe('禁用错误处理')
  })

  it('应该正确接收并显示 props', () => {
    const props = {
      autoSave: true,
      disableErrorHandling: true,
      enableRGBColorDisplay: true
    }
    
    const wrapper = createWrapper(props)
    
    // 检查复选框状态是否与 props 一致
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)
    expect((checkboxes[1].element as HTMLInputElement).checked).toBe(true)
    expect((checkboxes[2].element as HTMLInputElement).checked).toBe(true)
  })

  it('应该在自动保存复选框变化时触发事件', async () => {
    const wrapper = createWrapper()
    
    // 触发第一个复选框（自动保存）变化
    const autoSaveCheckbox = wrapper.find('input[type="checkbox"]')
    await autoSaveCheckbox.trigger('change')
    
    // 检查事件是否正确触发
    expect(wrapper.emitted('update:autoSave')).toHaveLength(1)
    expect(wrapper.emitted('update:autoSave')?.[0]).toEqual([true])
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('应该在 RGB 颜色显示复选框变化时触发事件', async () => {
    const wrapper = createWrapper()
    
    // 触发第二个复选框（RGB颜色显示）变化
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[1].trigger('change')
    
    // 检查事件是否正确触发
    expect(wrapper.emitted('update:enableRGBColorDisplay')).toHaveLength(1)
    expect(wrapper.emitted('update:enableRGBColorDisplay')?.[0]).toEqual([true])
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('应该在禁用错误处理复选框变化时触发确认事件', async () => {
    const wrapper = createWrapper()
    
    // 触发第三个复选框（禁用错误处理）变化
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[2].trigger('change')
    
    // 检查确认事件是否正确触发
    expect(wrapper.emitted('confirm-disable-error-handling')).toHaveLength(1)
    // 检查是否没有直接保存
    expect(wrapper.emitted('update:disableErrorHandling')).toBeUndefined()
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('应该在禁用错误处理复选框从启用变为禁用时直接保存', async () => {
    // 创建一个已经启用了禁用错误处理的组件
    const wrapper = createWrapper({ disableErrorHandling: true })
    
    // 触发第三个复选框变化（从启用变为禁用）
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[2].trigger('change')
    
    // 检查事件是否正确触发
    expect(wrapper.emitted('update:disableErrorHandling')).toHaveLength(1)
    expect(wrapper.emitted('update:disableErrorHandling')?.[0]).toEqual([false])
    expect(wrapper.emitted('save')).toHaveLength(1)
    // 检查是否没有触发确认事件
    expect(wrapper.emitted('confirm-disable-error-handling')).toBeUndefined()
  })

  it('应该正确响应外部 props 变化', async () => {
    const wrapper = createWrapper()
    
    // 初始状态
    let checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect((checkboxes[0].element as HTMLInputElement).checked).toBe(false)
    
    // 更新 props
    await wrapper.setProps({ autoSave: true })
    
    // 检查组件是否响应了 props 变化
    checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)
  })

  it('应该正确处理多个 props 同时变化', async () => {
    const wrapper = createWrapper()
    
    // 初始状态
    let checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect((checkboxes[0].element as HTMLInputElement).checked).toBe(false)
    expect((checkboxes[1].element as HTMLInputElement).checked).toBe(false)
    expect((checkboxes[2].element as HTMLInputElement).checked).toBe(false)
    
    // 同时更新多个 props
    await wrapper.setProps({
      autoSave: true,
      enableRGBColorDisplay: true,
      disableErrorHandling: true
    })
    
    // 检查组件是否正确响应了所有 props 变化
    checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)
    expect((checkboxes[1].element as HTMLInputElement).checked).toBe(true)
    expect((checkboxes[2].element as HTMLInputElement).checked).toBe(true)
  })
})