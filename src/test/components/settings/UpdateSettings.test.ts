import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import UpdateSettings from '../../../components/settings/UpdateSettings.vue'

describe('UpdateSettings.vue', () => {
  let wrapper: any
  
  beforeEach(() => {
    wrapper = mount(UpdateSettings, {
      props: {
        checkForUpdatesOnStartup: false
      }
    })
  })
  
  it('应该正确渲染组件', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.settings-option').exists()).toBe(true)
  })
  
  it('应该正确显示组件标题和描述', () => {
    expect(wrapper.find('.settings-option-title').text()).toBe('启动时检查更新')
    expect(wrapper.find('.settings-option-description').text()).toBe('应用启动时自动检查是否有新版本可用')
  })
  
  it('应该根据props正确设置复选框初始状态', async () => {
    // 初始props为false，复选框应该未选中
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(false)
    
    // 更新props为true，复选框应该选中
    wrapper.setProps({ checkForUpdatesOnStartup: true })
    await nextTick()
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(true)
  })
  
  it('点击复选框应该触发update:checkForUpdatesOnStartup事件', async () => {
    // 初始状态为false
    expect(wrapper.props('checkForUpdatesOnStartup')).toBe(false)
    
    // 点击复选框
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.trigger('change')
    
    // 应该触发update:checkForUpdatesOnStartup事件，值为true
    expect(wrapper.emitted('update:checkForUpdatesOnStartup')).toBeTruthy()
    expect(wrapper.emitted('update:checkForUpdatesOnStartup')[0][0]).toBe(true)
    
    // 再次点击复选框
    await checkbox.trigger('change')
    
    // 应该触发update:checkForUpdatesOnStartup事件，值为false
    expect(wrapper.emitted('update:checkForUpdatesOnStartup')[1][0]).toBe(false)
  })
  
  it('点击复选框应该触发save事件', async () => {
    const checkbox = wrapper.find('input[type="checkbox"]')
    
    // 点击复选框
    await checkbox.trigger('change')
    
    // 应该触发save事件
    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save').length).toBe(1)
    
    // 再次点击复选框
    await checkbox.trigger('change')
    
    // 应该再次触发save事件
    expect(wrapper.emitted('save').length).toBe(2)
  })
  
  it('应该正确监听外部props变化', async () => {
    // 初始状态为false
    expect(wrapper.vm.checkForUpdatesOnStartup).toBe(false)
    
    // 更新外部props
    wrapper.setProps({ checkForUpdatesOnStartup: true })
    await nextTick()
    
    // 组件内部状态应该更新
    expect(wrapper.vm.checkForUpdatesOnStartup).toBe(true)
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(true)
    
    // 再次更新外部props
    wrapper.setProps({ checkForUpdatesOnStartup: false })
    await nextTick()
    
    // 组件内部状态应该再次更新
    expect(wrapper.vm.checkForUpdatesOnStartup).toBe(false)
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(false)
  })
  
  it('应该正确应用CSS类名', () => {
    const checkbox = wrapper.find('input[type="checkbox"]')
    
    // 检查复选框是否应用了正确的CSS类
    expect(checkbox.classes()).toContain('w-5')
    expect(checkbox.classes()).toContain('h-5')
    expect(checkbox.classes()).toContain('rounded')
    expect(checkbox.classes()).toContain('border-2')
    expect(checkbox.classes()).toContain('border-hoi4-border')
    expect(checkbox.classes()).toContain('bg-hoi4-accent')
  })
})
