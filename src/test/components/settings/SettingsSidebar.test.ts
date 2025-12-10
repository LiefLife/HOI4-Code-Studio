/**
 * SettingsSidebar 组件的单元测试
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsSidebar from '@/components/settings/SettingsSidebar.vue'
import { settingsMenuData } from '@/data/settingsMenu'

describe('SettingsSidebar', () => {
  // 测试组件基本渲染
  it('应该正确渲染组件', () => {
    const wrapper = mount(SettingsSidebar, {
      props: {
        activeItem: 'game-directory'
      }
    })
    
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.classes()).toContain('settings-sidebar-content')
  })
  
  // 测试菜单分类渲染
  it('应该渲染所有菜单分类', () => {
    const wrapper = mount(SettingsSidebar, {
      props: {
        activeItem: 'game-directory'
      }
    })
    
    const categories = wrapper.findAll('.settings-menu-section')
    expect(categories.length).toBe(settingsMenuData.length)
    
    // 检查每个分类标题
    settingsMenuData.forEach((category, index) => {
      const categoryTitle = categories[index].find('.settings-menu-category')
      expect(categoryTitle?.text()).toBe(category.title)
    })
  })
  
  // 测试菜单项渲染
  it('应该渲染所有菜单项', () => {
    const wrapper = mount(SettingsSidebar, {
      props: {
        activeItem: 'game-directory'
      }
    })
    
    const allMenuItems = settingsMenuData.flatMap(category => category.items)
    const renderedItems = wrapper.findAll('.settings-menu-item')
    
    expect(renderedItems.length).toBe(allMenuItems.length)
    
    // 检查菜单项内容
    allMenuItems.forEach((item, index) => {
      const renderedItem = renderedItems[index]
      const title = renderedItem.find('.settings-menu-title')
      const description = renderedItem.find('.settings-menu-description')
      
      expect(title?.text()).toBe(item.title)
      if (item.description) {
        expect(description?.text()).toBe(item.description)
      } else {
        expect(description).toBeNull()
      }
    })
  })
  
  // 测试活动菜单项
  it('应该正确高亮当前活动的菜单项', () => {
    const activeItemId = 'editor-font'
    const wrapper = mount(SettingsSidebar, {
      props: {
        activeItem: activeItemId
      }
    })
    
    const activeItem = wrapper.find(`.settings-menu-item.active`)
    expect(activeItem.exists()).toBe(true)
    
    const activeItemTitle = activeItem.find('.settings-menu-title')
    const expectedItem = settingsMenuData
      .flatMap(category => category.items)
      .find(item => item.id === activeItemId)
    
    expect(activeItemTitle?.text()).toBe(expectedItem?.title)
  })
  
  // 测试菜单项点击事件
  it('应该在点击菜单项时触发 item-click 事件', async () => {
    const wrapper = mount(SettingsSidebar, {
      props: {
        activeItem: 'game-directory'
      }
    })
    
    const itemToClick = 'editor-save'
    const itemElement = wrapper.findAll('.settings-menu-item')
      .find(item => item.find('.settings-menu-title').text() === '保存设置')
    
    expect(itemElement).toBeDefined()
    
    await itemElement?.trigger('click')
    
    // 检查事件是否触发
    expect(wrapper.emitted('item-click')).toBeDefined()
    expect(wrapper.emitted('item-click')?.length).toBe(1)
    expect(wrapper.emitted('item-click')?.[0]).toEqual([itemToClick])
  })
  
  // 测试图标渲染
  it('应该为每个菜单项渲染正确的图标', () => {
    const wrapper = mount(SettingsSidebar, {
      props: {
        activeItem: 'game-directory'
      }
    })
    
    const items = wrapper.findAll('.settings-menu-item')
    
    items.forEach((item) => {
      const iconContainer = item.find('.settings-menu-icon')
      expect(iconContainer.exists()).toBe(true)
      expect(iconContainer.find('svg').exists()).toBe(true)
    })
  })
  
  // 测试不同的 activeItem 值
  it('应该支持动态更改 activeItem', async () => {
    const wrapper = mount(SettingsSidebar, {
      props: {
        activeItem: 'game-directory'
      }
    })
    
    // 初始状态
    let activeItem = wrapper.find('.settings-menu-item.active')
    expect(activeItem.find('.settings-menu-title').text()).toBe('游戏目录')
    
    // 更新 activeItem
    await wrapper.setProps({ activeItem: 'theme' })
    
    // 验证更新后的状态
    activeItem = wrapper.find('.settings-menu-item.active')
    expect(activeItem.find('.settings-menu-title').text()).toBe('主题')
  })
})
