/**
 * RecentProjectsSettings 组件的单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import RecentProjectsSettings from '@/components/settings/RecentProjectsSettings.vue'

describe('RecentProjectsSettings', () => {
  let wrapper: any

  // 布局选项类型定义
  type LayoutOption = 'four-columns' | 'three-columns' | 'two-columns' | 'one-column' | 'masonry'

  beforeEach(() => {
    // 清除所有模拟
    vi.clearAllMocks()
  })

  it('应该正确渲染组件和默认值', () => {
    // 使用默认值 'four-columns' 挂载组件
    wrapper = mount(RecentProjectsSettings, {
      props: {
        modelValue: 'four-columns'
      }
    })

    // 验证组件是否存在
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.settings-form-group').exists()).toBe(true)
    expect(wrapper.find('.settings-form-label').text()).toContain('最近项目显示方式')

    // 验证默认选中的布局是四列
    const fourColumnsOption = wrapper.find('input[type="radio"][value="four-columns"]')
    expect(fourColumnsOption.exists()).toBe(true)
    expect(fourColumnsOption.element.checked).toBe(true)
  })

  it('应该正确显示不同的布局选项', () => {
    wrapper = mount(RecentProjectsSettings, {
      props: {
        modelValue: 'four-columns'
      }
    })

    // 验证所有布局选项都存在
    const layoutOptions: LayoutOption[] = ['four-columns', 'three-columns', 'two-columns', 'one-column', 'masonry']
    
    layoutOptions.forEach(layout => {
      const option = wrapper.find(`input[type="radio"][value="${layout}"]`)
      expect(option.exists()).toBe(true)
    })

    // 验证选项数量
    expect(wrapper.findAll('input[type="radio"]').length).toBe(5)
  })

  it('应该支持不同布局选项的选择功能', async () => {
    wrapper = mount(RecentProjectsSettings, {
      props: {
        modelValue: 'four-columns'
      }
    })

    // 测试选择三列布局
    const threeColumnsOption = wrapper.find('input[type="radio"][value="three-columns"]')
    await threeColumnsOption.trigger('change')

    // 验证选项已选中
    expect(threeColumnsOption.element.checked).toBe(true)
    expect(wrapper.find('.ring-2.ring-hoi4-accent').exists()).toBe(true)
    expect(wrapper.find('.ring-2.ring-hoi4-accent').text()).toContain('三列')

    // 测试选择一列布局
    const oneColumnOption = wrapper.find('input[type="radio"][value="one-column"]')
    await oneColumnOption.trigger('change')
    expect(oneColumnOption.element.checked).toBe(true)

    // 测试选择磁吸布局
    const masonryOption = wrapper.find('input[type="radio"][value="masonry"]')
    await masonryOption.trigger('change')
    expect(masonryOption.element.checked).toBe(true)
  })

  it('应该支持 modelValue prop 的双向绑定', async () => {
    wrapper = mount(RecentProjectsSettings, {
      props: {
        modelValue: 'four-columns'
      }
    })

    // 初始值应该是 four-columns
    expect(wrapper.props('modelValue')).toBe('four-columns')

    // 选择三列布局，触发 update:modelValue 事件
    const threeColumnsOption = wrapper.find('input[type="radio"][value="three-columns"]')
    await threeColumnsOption.trigger('change')

    // 验证 update:modelValue 事件已触发
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['three-columns'])

    // 更新 props，验证组件内部状态是否同步更新
    await wrapper.setProps({ modelValue: 'two-columns' })
    const twoColumnsOption = wrapper.find('input[type="radio"][value="two-columns"]')
    expect(twoColumnsOption.element.checked).toBe(true)
  })

  it('应该在布局变更时触发 save 事件', async () => {
    wrapper = mount(RecentProjectsSettings, {
      props: {
        modelValue: 'four-columns'
      }
    })

    // 初始状态下没有触发 save 事件
    expect(wrapper.emitted('save')).toBeFalsy()

    // 选择三列布局，触发 save 事件
    const threeColumnsOption = wrapper.find('input[type="radio"][value="three-columns"]')
    await threeColumnsOption.trigger('change')

    // 验证 save 事件已触发
    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')?.length).toBe(1)

    // 选择另一布局，验证 save 事件再次触发
    const oneColumnOption = wrapper.find('input[type="radio"][value="one-column"]')
    await oneColumnOption.trigger('change')
    expect(wrapper.emitted('save')?.length).toBe(2)
  })

  it('应该正确处理默认布局的显示', async () => {
    wrapper = mount(RecentProjectsSettings, {
      props: {
        modelValue: 'four-columns'
      }
    })

    // 验证四列布局显示 "默认" 文本
    expect(wrapper.find('.text-hoi4-accent.text-xs.mt-1').text()).toContain('默认')

    // 切换到其他布局，默认文本应该消失
    const threeColumnsOption = wrapper.find('input[type="radio"][value="three-columns"]')
    await threeColumnsOption.trigger('change')
    expect(wrapper.find('.text-hoi4-accent.text-xs.mt-1').exists()).toBe(false)
  })
})