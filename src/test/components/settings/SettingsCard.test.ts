import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsCard from '../../../components/settings/SettingsCard.vue'

describe('SettingsCard.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(SettingsCard)
  })

  it('应该正确渲染基本组件结构', () => {
    expect(wrapper.find('.settings-card').exists()).toBe(true)
    expect(wrapper.find('.settings-card-content').exists()).toBe(true)
  })

  it('当提供 title 时，应该渲染标题', async () => {
    wrapper = mount(SettingsCard, {
      props: {
        title: '测试标题'
      }
    })
    
    expect(wrapper.find('.settings-card-title').exists()).toBe(true)
    expect(wrapper.find('.settings-card-title').text()).toBe('测试标题')
  })

  it('当不提供 title 时，不应该渲染标题', () => {
    expect(wrapper.find('.settings-card-title').exists()).toBe(false)
  })

  it('当提供 description 时，应该渲染描述', async () => {
    wrapper = mount(SettingsCard, {
      props: {
        description: '测试描述'
      }
    })
    
    expect(wrapper.find('.settings-card-description').exists()).toBe(true)
    expect(wrapper.find('.settings-card-description').text()).toBe('测试描述')
  })

  it('当不提供 description 时，不应该渲染描述', () => {
    expect(wrapper.find('.settings-card-description').exists()).toBe(false)
  })

  it('应该同时渲染标题和描述', async () => {
    wrapper = mount(SettingsCard, {
      props: {
        title: '测试标题',
        description: '测试描述'
      }
    })
    
    expect(wrapper.find('.settings-card-title').exists()).toBe(true)
    expect(wrapper.find('.settings-card-description').exists()).toBe(true)
  })

  it('应该渲染插槽内容', async () => {
    const slotContent = '<div class="test-slot">测试插槽内容</div>'
    wrapper = mount(SettingsCard, {
      slots: {
        default: slotContent
      }
    })
    
    expect(wrapper.find('.settings-card-content .test-slot').exists()).toBe(true)
    expect(wrapper.find('.settings-card-content .test-slot').text()).toBe('测试插槽内容')
  })

  it('当没有提供任何属性时，只渲染卡片内容区域', () => {
    expect(wrapper.find('.settings-card-header').exists()).toBe(false)
    expect(wrapper.find('.settings-card-content').exists()).toBe(true)
  })

  it('当提供 title 或 description 时，渲染卡片头部', async () => {
    // 只提供 title
    wrapper = mount(SettingsCard, {
      props: {
        title: '测试标题'
      }
    })
    expect(wrapper.find('.settings-card-header').exists()).toBe(true)
    
    // 只提供 description
    wrapper = mount(SettingsCard, {
      props: {
        description: '测试描述'
      }
    })
    expect(wrapper.find('.settings-card-header').exists()).toBe(true)
  })

  it('应该应用正确的样式类', () => {
    expect(wrapper.classes()).toContain('settings-card')
    expect(wrapper.find('.settings-card-content').classes()).toContain('settings-card-content')
  })

  it('应该能同时渲染多个插槽内容元素', async () => {
    const slotContent = `
      <div class="test-item">项目1</div>
      <div class="test-item">项目2</div>
      <div class="test-item">项目3</div>
    `
    wrapper = mount(SettingsCard, {
      slots: {
        default: slotContent
      }
    })
    
    const items = wrapper.findAll('.settings-card-content .test-item')
    expect(items).toHaveLength(3)
    expect(items[0].text()).toBe('项目1')
    expect(items[1].text()).toBe('项目2')
    expect(items[2].text()).toBe('项目3')
  })
})
