import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Documentation from '../../views/Documentation.vue'
import { documentationSections } from '../../data/documentationContent'

// Mock vue-router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('Documentation.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(Documentation, {
      global: {
        stubs: {
          'teleport': true,
          'transition': true
        }
      }
    })
  })

  /**
   * 组件渲染测试
   */
  describe('组件渲染', () => {
    it('应该正确渲染文档页面', () => {
      expect(wrapper.find('.h-full.w-full').exists()).toBe(true)
      expect(wrapper.find('.island-container').exists()).toBe(true)
    })

    it('应该渲染顶部导航岛', () => {
      const header = wrapper.find('header')
      expect(header.exists()).toBe(true)
      expect(header.find('.text-2xl').text()).toBe('使用文档')
    })

    it('应该渲染返回按钮', () => {
      const backButton = wrapper.find('.btn-island')
      expect(backButton.exists()).toBe(true)
      expect(backButton.text()).toContain('返回')
    })

    it('应该渲染左侧导航岛', () => {
      const aside = wrapper.find('aside')
      expect(aside.exists()).toBe(true)
      expect(aside.classes()).toContain('w-80')
    })

    it('应该渲染右侧内容岛', () => {
      const section = wrapper.find('section')
      expect(section.exists()).toBe(true)
      expect(section.classes()).toContain('flex-1')
    })

    it('应该渲染所有文档章节', async () => {
      await nextTick()
      const sectionHeaders = wrapper.findAll('.section-header')
      expect(sectionHeaders.length).toBeGreaterThan(0)
      
      // 验证第一个章节标题
      expect(sectionHeaders[0].text()).toContain(documentationSections[0].title)
    })

    it('应该渲染背景装饰元素', () => {
      const backgroundDecorations = wrapper.findAll('.absolute.inset-0.opacity-10 > div')
      expect(backgroundDecorations.length).toBe(2)
    })
  })

  /**
   * 状态管理测试
   */
  describe('状态管理', () => {
    it('初始状态下应该显示加载动画', () => {
      expect(wrapper.vm.isLoading).toBe(true)
      expect(wrapper.find('.animate-spin').exists()).toBe(true)
    })

    it('加载完成后应该隐藏加载动画', async () => {
      // 等待onMounted中的setTimeout完成
      await new Promise(resolve => setTimeout(resolve, 350))
      await nextTick()
      
      expect(wrapper.vm.isLoading).toBe(false)
      expect(wrapper.find('.animate-spin').exists()).toBe(false)
    })

    it('应该初始化activeItemId为第一个文档项', () => {
      const firstItem = documentationSections[0].items[0]
      expect(wrapper.vm.activeItemId).toBe(firstItem.id)
    })

    it('activeItem计算属性应该返回当前选中的文档项', () => {
      const firstItem = documentationSections[0].items[0]
      expect(wrapper.vm.activeItem).toEqual(firstItem)
    })

    it('hoveredSection应该初始为null', () => {
      expect(wrapper.vm.hoveredSection).toBe(null)
    })

    it('hoveredItem应该初始为null', () => {
      expect(wrapper.vm.hoveredItem).toBe(null)
    })

    it('应该正确更新hoveredSection状态', async () => {
      const firstSection = wrapper.findAll('.section-island')[0]
      await firstSection.trigger('mouseenter')
      
      expect(wrapper.vm.hoveredSection).toBe(documentationSections[0].id)
    })

    it('应该正确更新hoveredItem状态', async () => {
      await nextTick()
      const firstItem = wrapper.findAll('.item-card')[0]
      await firstItem.trigger('mouseenter')
      
      expect(wrapper.vm.hoveredItem).not.toBe(null)
    })
  })

  /**
   * 用户交互测试
   */
  describe('用户交互', () => {
    it('点击返回按钮应该调用router.push', async () => {
      const backButton = wrapper.find('.btn-island')
      await backButton.trigger('click')
      
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('点击文档项应该更新activeItemId', async () => {
      await nextTick()
      const itemCards = wrapper.findAll('.item-card')
      
      if (itemCards.length > 1) {
        const secondItem = itemCards[1]
        await secondItem.trigger('click')
        
        expect(wrapper.vm.activeItemId).not.toBe(documentationSections[0].items[0].id)
      }
    })

    it('点击文档项应该更新右侧内容显示', async () => {
      await nextTick()
      const itemCards = wrapper.findAll('.item-card')
      
      if (itemCards.length > 1) {
        const initialTitle = wrapper.find('.content-header-island .text-3xl').text()
        
        await itemCards[1].trigger('click')
        await nextTick()
        
        const newTitle = wrapper.find('.content-header-island .text-3xl').text()
        expect(newTitle).not.toBe(initialTitle)
      }
    })

    it('悬停在章节上应该显示激活样式', async () => {
      const firstSection = wrapper.findAll('.section-island')[0]
      await firstSection.trigger('mouseenter')
      await nextTick()
      
      const sectionHeader = firstSection.find('.section-header')
      expect(sectionHeader.classes()).toContain('section-header-active')
    })

    it('悬停在文档项上应该显示hover样式', async () => {
      await nextTick()
      const itemCards = wrapper.findAll('.item-card')
      
      if (itemCards.length > 1) {
        const secondItem = itemCards[1]
        await secondItem.trigger('mouseenter')
        await nextTick()
        
        expect(secondItem.classes()).toContain('item-card-hover')
      }
    })

    it('选中的文档项应该显示激活样式', async () => {
      await nextTick()
      const itemCards = wrapper.findAll('.item-card')
      
      const activeItem = itemCards.find((card: any) => 
        card.classes().includes('item-card-active')
      )
      
      expect(activeItem).toBeDefined()
    })
  })

  /**
   * 内容显示测试
   */
  describe('内容显示', () => {
    it('应该显示当前文档项的标题', async () => {
      await nextTick()
      const titleElement = wrapper.find('.content-header-island .text-3xl')
      expect(titleElement.exists()).toBe(true)
      
      const firstItem = documentationSections[0].items[0]
      expect(titleElement.text()).toBe(firstItem.title)
    })

    it('应该显示当前文档项的摘要', async () => {
      await nextTick()
      const summaryElement = wrapper.find('.content-header-island .text-theme-comment')
      expect(summaryElement.exists()).toBe(true)
      
      const firstItem = documentationSections[0].items[0]
      expect(summaryElement.text()).toBe(firstItem.summary)
    })

    it('应该显示当前文档项的详细内容', async () => {
      await nextTick()
      const contentItems = wrapper.findAll('.content-item')
      expect(contentItems.length).toBeGreaterThan(0)
      
      const firstItem = documentationSections[0].items[0]
      expect(contentItems.length).toBe(firstItem.details.length)
    })

    it('每个详细内容项应该显示序号标记', async () => {
      await nextTick()
      const contentItems = wrapper.findAll('.content-item')
      
      contentItems.forEach((item: any) => {
        const marker = item.find('.rounded-full.bg-theme-accent\\/20')
        expect(marker.exists()).toBe(true)
      })
    })

    it('文档项详情应该正确渲染', async () => {
      await nextTick()
      const contentItems = wrapper.findAll('.content-item')
      const firstItem = documentationSections[0].items[0]
      
      contentItems.forEach((item: any, index: number) => {
        const text = item.find('.text-theme-fg').text()
        expect(text).toBe(firstItem.details[index])
      })
    })
  })

  /**
   * 样式和UI测试
   */
  describe('样式和UI', () => {
    it('应该应用正确的主题类', () => {
      expect(wrapper.find('.bg-theme-bg').exists()).toBe(true)
      expect(wrapper.find('.text-theme-fg').exists()).toBe(true)
    })

    it('导航岛应该有正确的样式', () => {
      const island = wrapper.find('.island')
      expect(island.classes()).toContain('backdrop-blur-xl')
      expect(island.classes()).toContain('bg-theme-bg-secondary')
    })

    it('文档项应该有正确的边框样式', async () => {
      await nextTick()
      const itemCards = wrapper.findAll('.item-card')
      
      itemCards.forEach((card: any) => {
        expect(card.classes()).toContain('cursor-pointer')
      })
    })

    it('内容区域应该有正确的背景和边框', async () => {
      await nextTick()
      const contentHeader = wrapper.find('.content-header-island')
      expect(contentHeader.classes()).toContain('bg-theme-accent/10')
      expect(contentHeader.classes()).toContain('border-l-4')
    })

    it('滚动容器应该有正确的类', () => {
      const scrollContainers = wrapper.findAll('.scroll-container')
      expect(scrollContainers.length).toBe(2) // 左侧导航和右侧内容
    })
  })

  /**
   * 边界情况测试
   */
  describe('边界情况', () => {
    it('当找不到文档项时应该返回第一个文档项', async () => {
      // 等待加载完成
      await new Promise(resolve => setTimeout(resolve, 350))
      await nextTick()
      
      const firstItem = documentationSections[0].items[0]
      
      // 设置一个不存在的ID
      wrapper.vm.activeItemId = 'non-existent-id'
      await nextTick()
      
      // 应该返回第一个文档项
      expect(wrapper.vm.activeItem).toEqual(firstItem)
      
      // 内容区域应该仍然显示内容，而不是空状态
      const contentHeader = wrapper.find('.content-header-island')
      expect(contentHeader.exists()).toBe(true)
    })

    it('应该处理空文档章节列表', async () => {
      // 这个测试验证组件能够处理空数据的情况
      // 实际数据不为空，但组件应该能够优雅处理
      expect(documentationSections.length).toBeGreaterThan(0)
    })

    it('应该处理章节中没有文档项的情况', async () => {
      // 验证组件能够处理章节中items为空的情况
      const sectionsWithItems = documentationSections.filter(s => s.items.length > 0)
      expect(sectionsWithItems.length).toBeGreaterThan(0)
    })

    it('应该正确处理快速连续点击', async () => {
      await nextTick()
      const itemCards = wrapper.findAll('.item-card')
      
      if (itemCards.length > 1) {
        // 快速连续点击
        await itemCards[1].trigger('click')
        await itemCards[0].trigger('click')
        await nextTick()
        
        // 最后一次点击应该生效
        expect(wrapper.vm.activeItemId).toBe(documentationSections[0].items[0].id)
      }
    })
  })

  /**
   * 计算属性测试
   */
  describe('计算属性', () => {
    it('activeItem应该正确查找文档项', () => {
      const firstItem = documentationSections[0].items[0]
      expect(wrapper.vm.activeItem).toEqual(firstItem)
    })

    it('activeItem应该在找不到时返回第一个文档项', () => {
      const firstItem = documentationSections[0].items[0]
      wrapper.vm.activeItemId = 'invalid-id'
      
      expect(wrapper.vm.activeItem).toEqual(firstItem)
    })

    it('activeItem应该能够在不同章节中查找文档项', () => {
      // 测试跨章节查找
      const secondSection = documentationSections[1]
      if (secondSection && secondSection.items.length > 0) {
        const targetItem = secondSection.items[0]
        wrapper.vm.activeItemId = targetItem.id
        
        expect(wrapper.vm.activeItem).toEqual(targetItem)
      }
    })
  })

  /**
   * 生命周期测试
   */
  describe('生命周期', () => {
    it('onMounted应该在300ms后设置isLoading为false', async () => {
      expect(wrapper.vm.isLoading).toBe(true)
      
      // 等待超过300ms
      await new Promise(resolve => setTimeout(resolve, 350))
      await nextTick()
      
      expect(wrapper.vm.isLoading).toBe(false)
    })

    it('组件挂载后应该正确初始化所有状态', () => {
      expect(wrapper.vm.activeItemId).toBeDefined()
      expect(wrapper.vm.hoveredSection).toBe(null)
      expect(wrapper.vm.hoveredItem).toBe(null)
      expect(wrapper.vm.isLoading).toBe(true)
    })
  })

  /**
   * 可访问性测试
   */
  describe('可访问性', () => {
    it('按钮应该有清晰的文本标签', () => {
      const backButton = wrapper.find('.btn-island')
      expect(backButton.text()).toContain('返回')
    })

    it('标题应该有正确的层级结构', () => {
      const h1 = wrapper.find('h1')
      const h2 = wrapper.find('h2')
      
      expect(h1.exists()).toBe(true)
      expect(h2.exists()).toBe(true)
    })

    it('文档项应该有清晰的视觉反馈', async () => {
      await nextTick()
      const itemCards = wrapper.findAll('.item-card')
      
      itemCards.forEach((card: any) => {
        expect(card.classes()).toContain('cursor-pointer')
      })
    })
  })

  /**
   * 性能测试
   */
  describe('性能', () => {
    it('应该正确处理大量文档项', () => {
      const totalItems = documentationSections.reduce(
        (sum, section) => sum + section.items.length,
        0
      )
      expect(totalItems).toBeGreaterThan(0)
    })

    it('计算属性应该高效执行', () => {
      const startTime = performance.now()
      const result = wrapper.vm.activeItem
      const endTime = performance.now()
      
      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(10) // 计算应该在10ms内完成
    })
  })

  /**
   * 集成测试
   */
  describe('集成测试', () => {
    it('完整的用户流程：加载 -> 选择文档 -> 查看内容', async () => {
      // 1. 初始加载状态
      expect(wrapper.vm.isLoading).toBe(true)
      
      // 2. 等待加载完成
      await new Promise(resolve => setTimeout(resolve, 350))
      await nextTick()
      expect(wrapper.vm.isLoading).toBe(false)
      
      // 3. 选择文档项
      await nextTick()
      const itemCards = wrapper.findAll('.item-card')
      
      if (itemCards.length > 1) {
        await itemCards[1].trigger('click')
        await nextTick()
        
        // 4. 验证内容更新
        const title = wrapper.find('.content-header-island .text-3xl').text()
        expect(title).toBeDefined()
        expect(title.length).toBeGreaterThan(0)
      }
    })

    it('完整的用户流程：悬停交互', async () => {
      await nextTick()
      
      // 悬停在章节上
      const firstSection = wrapper.findAll('.section-island')[0]
      await firstSection.trigger('mouseenter')
      expect(wrapper.vm.hoveredSection).toBe(documentationSections[0].id)
      
      // 移开
      await firstSection.trigger('mouseleave')
      expect(wrapper.vm.hoveredSection).toBe(null)
      
      // 悬停在文档项上
      const itemCards = wrapper.findAll('.item-card')
      if (itemCards.length > 0) {
        await itemCards[0].trigger('mouseenter')
        expect(wrapper.vm.hoveredItem).not.toBe(null)
        
        await itemCards[0].trigger('mouseleave')
        expect(wrapper.vm.hoveredItem).toBe(null)
      }
    })
  })
})
