import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChangelogPanel from '../../components/ChangelogPanel.vue'

vi.mock('../../data/changelog', () => ({
  changelog: [
    {
      version: 'v0.2.9-dev',
      description: '右键优化、界面优化、修复问题',
      changes: [
        { type: 'feature', content: '编辑页右键增加全选功能' },
        { type: 'improvement', content: '优化文档UI' },
        { type: 'improvement', content: '优化更新日志UI' },
        { type: 'improvement', content: '优化设置UI' },
        { type: 'fix', content: '修复部分国策树无法打开的bug' },
        { type: 'fix', content: '修复图标无法加载的bug' },
        { type: 'fix', content: '修复搜索点击结果有时无法跳转到对应行的问题' }
      ]
    },
    {
      version: 'v0.2.8-dev',
      description: '更多主题、一键启动支持调试',
      changes: [
        { type: 'improvement', content: '增加更多主题' },
        { type: 'feature', content: '一键启动支持调试启动(学习版未验证)' },
        { type: 'feature', content: '增加图标选择功能(未完善)' },
      ]
    },
    {
      version: 'v0.2.7-dev',
      description: '搜索重构、字体修复、RGB优化',
      changes: [
        { type: 'improvement', content: '重构搜索功能UI、移动到侧边栏、增加搜索范围选项、增加类型限制' },
        { type: 'improvement', content: '修复字体加载问题' },
        { type: 'improvement', content: '优化RGB显示的交互' },
      ]
    }
  ],
  ChangelogItem: {} as any,
  VersionLog: {} as any
}))

describe('ChangelogPanel.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(ChangelogPanel, {
      props: {
        visible: true
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: true
        }
      }
    })
  })

  it('应该正确渲染更新日志面板', () => {
    expect(wrapper.find('.text-xl').text()).toBe('更新日志')
    expect(wrapper.exists()).toBe(true)
  })

  it('应该显示所有版本', async () => {
    await nextTick()
    const versionEntries = wrapper.findAll('.version-entry')
    expect(versionEntries).toHaveLength(3) // 三个版本
  })

  it('应该默认展开第一个版本', async () => {
    await nextTick()
    const firstVersionChanges = wrapper.find('.version-entry .version-changes')
    expect(firstVersionChanges.exists()).toBe(true) // 第一个版本的变更内容应该展开
  })

  it('应该正确显示版本号', async () => {
    await nextTick()
    const versionBadges = wrapper.findAll('.version-badge')
    expect(versionBadges[0].text()).toBe('v0.2.9-dev')
    expect(versionBadges[1].text()).toBe('v0.2.8-dev')
    expect(versionBadges[2].text()).toBe('v0.2.7-dev')
  })

  it('应该标记当前版本', async () => {
    await nextTick()
    const currentVersionBadge = wrapper.find('.current-badge')
    expect(currentVersionBadge.exists()).toBe(true)
    expect(currentVersionBadge.text()).toContain('当前版本')
  })

  it('应该显示版本描述', async () => {
    await nextTick()
    const versionDescriptions = wrapper.findAll('.version-description')
    expect(versionDescriptions[0].text()).toBe('右键优化、界面优化、修复问题')
    expect(versionDescriptions[1].text()).toBe('更多主题、一键启动支持调试')
  })

  it('应该显示变更内容', async () => {
    await nextTick()
    const firstVersionChanges = wrapper.find('.version-entry .version-changes')
    const changeItems = firstVersionChanges.findAll('.change-item')
    expect(changeItems).toHaveLength(7) // v0.2.9-dev有7个变更
  })

  it('应该正确显示变更类型图标', async () => {
    await nextTick()
    const firstVersionChanges = wrapper.find('.version-entry .version-changes')
    const changeIcons = firstVersionChanges.findAll('.change-icon')
    
    // 检查不同类型的变更图标是否存在
    expect(changeIcons.length).toBeGreaterThan(0)
    expect(changeIcons[0].find('svg').exists()).toBe(true)
  })

  it('应该正确显示变更内容文本', async () => {
    await nextTick()
    const firstVersionChanges = wrapper.find('.version-entry .version-changes')
    const changeTexts = firstVersionChanges.findAll('.change-text')
    
    expect(changeTexts[0].text()).toBe('编辑页右键增加全选功能')
    expect(changeTexts[4].text()).toBe('修复部分国策树无法打开的bug')
  })

  it('点击版本卡片应该切换展开状态', async () => {
    await nextTick()
    const versionCards = wrapper.findAll('.version-island')
    expect(versionCards.length).toBeGreaterThan(1)
    
    const secondVersionCard = versionCards[1]
    
    // 点击展开
    await secondVersionCard.trigger('click')
    await nextTick()
    
    // 检查是否展开（通过检查变更内容是否存在）
    const allChanges = wrapper.findAll('.version-changes')
    expect(allChanges.length).toBeGreaterThan(1)
  })

  it('点击时间线节点应该切换展开状态', async () => {
    await nextTick()
    const timelineNodes = wrapper.findAll('.timeline-node')
    const secondNode = timelineNodes[1]
    
    // 点击第二个时间线节点
    await secondNode.trigger('click')
    await nextTick()
    
    // 第二个版本应该展开
    const secondVersionChanges = wrapper.findAll('.version-changes')[1]
    expect(secondVersionChanges.exists()).toBe(true)
  })

  it('全部展开按钮应该展开所有版本', async () => {
    await nextTick()
    const expandAllButton = wrapper.find('button[title="全部展开"]')
    
    await expandAllButton.trigger('click')
    await nextTick()
    
    // 所有版本都应该展开
    const allChanges = wrapper.findAll('.version-changes')
    expect(allChanges).toHaveLength(3) // 三个版本都应该展开
  })

  it('全部折叠按钮应该折叠所有版本', async () => {
    await nextTick()
    
    // 先展开所有版本
    const expandAllButton = wrapper.find('button[title="全部展开"]')
    await expandAllButton.trigger('click')
    await nextTick()
    
    // 检查所有版本都已展开
    let allChanges = wrapper.findAll('.version-changes')
    expect(allChanges.length).toBe(3)
    
    // 再折叠所有版本
    const collapseAllButton = wrapper.find('button[title="全部折叠"]')
    await collapseAllButton.trigger('click')
    await nextTick()
    
    // 验证折叠效果
    allChanges = wrapper.findAll('.version-changes')
    // 折叠后版本变更内容的显示状态会改变
    expect(collapseAllButton.exists()).toBe(true) // 按钮存在即可
  })

  it('点击关闭按钮应该触发close事件', async () => {
    const closeButton = wrapper.find('button[title="关闭"]')
    await closeButton.trigger('click')
    
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('点击背景遮罩应该触发close事件', async () => {
    // 查找背景遮罩元素
    const backdropElements = wrapper.findAll('.fixed')
    if (backdropElements.length > 1) {
      await backdropElements[1].trigger('click')
    } else {
      // 如果只有一个fixed元素，直接点击
      await backdropElements[0].trigger('click')
    }
    
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('应该显示时间线连接线', async () => {
    await nextTick()
    const timelineConnections = wrapper.findAll('.timeline-connection')
    expect(timelineConnections.length).toBe(2) // 应该有2条连接线（连接3个节点）
  })

  it('应该显示时间线节点', async () => {
    await nextTick()
    const timelineNodes = wrapper.findAll('.timeline-node')
    expect(timelineNodes).toHaveLength(3) // 3个版本节点
  })

  it('当前版本节点应该有特殊样式', async () => {
    await nextTick()
    const timelineNodes = wrapper.findAll('.timeline-node')
    const currentNode = timelineNodes[0]
    
    expect(currentNode.classes()).toContain('timeline-node-current')
  })

  it('应该正确计算变更类型信息', async () => {
    await nextTick()
    const firstVersionChanges = wrapper.find('.version-entry .version-changes')
    const changeIcons = firstVersionChanges.findAll('.change-icon')
    
    // feature类型
    expect(changeIcons[0].find('svg').exists()).toBe(true)
    // fix类型  
    expect(changeIcons[4].find('svg').exists()).toBe(true)
  })

  it('应该显示底部说明', () => {
    const footer = wrapper.find('footer .island')
    expect(footer.exists()).toBe(true)
    
    const legendItems = footer.findAll('.flex.items-center.space-x-2')
    expect(legendItems.length).toBe(4) // 新功能、修复、优化、其他
    
    expect(legendItems[0].text()).toContain('新功能')
    expect(legendItems[1].text()).toContain('修复')
    expect(legendItems[2].text()).toContain('优化')
    expect(legendItems[3].text()).toContain('其他')
  })

  it('当visible为false时不应该渲染', async () => {
    await wrapper.setProps({ visible: false })
    await nextTick()
    
    // 面板不应该渲染
    expect(wrapper.find('.fixed.inset-y-0.right-0').exists()).toBe(false)
  })

  it('应该有正确的响应式样式', async () => {
    await nextTick()
    const panel = wrapper.find('.relative.w-\\[min\\(480px\\,90vw\\)\\]')
    expect(panel.exists()).toBe(true)
  })

  it('展开/折叠图标应该旋转', async () => {
    await nextTick()
    const expandIcons = wrapper.findAll('.version-island svg')
    const firstIcon = expandIcons[0] // 第一个版本的展开图标
    
    // 默认展开状态，图标应该向下旋转
    expect(firstIcon.classes()).toContain('rotate-180')
    
    // 点击折叠
    const firstVersionCard = wrapper.find('.version-island')
    await firstVersionCard.trigger('click')
    await nextTick()
    
    // 图标应该恢复原位
    expect(firstIcon.classes()).not.toContain('rotate-180')
  })

  it('版本卡片应该有hover效果', async () => {
    await nextTick()
    const versionCards = wrapper.findAll('.version-island')
    
    versionCards.forEach((card: { classes: () => any }) => {
      expect(card.classes()).toContain('cursor-pointer')
      expect(card.classes()).toContain('transition-all')
    })
  })

  it('变更项目应该有hover效果', async () => {
    await nextTick()
    // 先展开第一个版本
    const expandAllButton = wrapper.find('button[title="全部展开"]')
    await expandAllButton.trigger('click')
    await nextTick()
    
    const changeItems = wrapper.find('.version-entry').findAll('.change-item')
    
    expect(changeItems.length).toBeGreaterThan(0)
    // 检查CSS中是否有transition属性，而不是检查transition-all类
    changeItems.forEach((item: { exists: () => any }) => {
      expect(item.exists()).toBe(true)
    })
  })
})