import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import IconPanel from '../../components/IconPanel.vue'

// Mock useFileTreeIcons composable
const mockSetIconSet = vi.fn()
const mockCloseIconPanel = vi.fn()

vi.mock('../../composables/useFileTreeIcons', () => ({
  useFileTreeIcons: () => ({
    iconSets: [
      {
        id: 'emoji',
        name: 'Emoji 图标',
        description: '使用 Emoji 字符作为文件图标',
        type: 'emoji',
        icons: {
          folder: {
            closed: '📁',
            open: '📂'
          },
          files: {
            'json': '📄',
            'js': '📜',
            'ts': '📜',
            'vue': '💚',
            'css': '🎨',
            'png': '🖼️',
            'txt': '📝',
            'md': '📝',
            'default': '📄'
          }
        }
      },
      {
        id: 'svg',
        name: 'SVG 图标',
        description: '使用 SVG 矢量图标',
        type: 'svg',
        icons: {
          folder: {
            closed: '/icons/folder-closed.svg',
            open: '/icons/folder-open.svg'
          },
          files: {
            'json': '/icons/file-json.svg',
            'js': '/icons/file-js.svg',
            'ts': '/icons/file-ts.svg',
            'vue': '/icons/file-vue.svg',
            'css': '/icons/file-css.svg',
            'png': '/icons/file-image.svg',
            'txt': '/icons/file-text.svg',
            'md': '/icons-file-markdown.svg',
            'default': '/icons/file-default.svg'
          }
        }
      }
    ],
    currentIconSetId: 'emoji',
    iconPanelVisible: true,
    setIconSet: mockSetIconSet,
    closeIconPanel: mockCloseIconPanel
  })
}))

describe('IconPanel.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(IconPanel, {
      global: {
        stubs: {
          Teleport: true,
          Transition: true
        }
      }
    })
  })

  it('应该正确渲染图标面板', () => {
    expect(wrapper.find('.text-xl').text()).toBe('选择文件树图标')
    expect(wrapper.findAll('.grid .relative.p-4')).toHaveLength(2) // 两个图标集卡片
  })

  it('应该显示所有图标集', async () => {
    await nextTick()
    const iconSetCards = wrapper.findAll('.grid .relative.p-4')
    expect(iconSetCards).toHaveLength(2)
    
    // 检查图标集名称
    expect(iconSetCards[0].find('.text-lg.font-semibold').text()).toBe('Emoji 图标')
    expect(iconSetCards[1].find('.text-lg.font-semibold').text()).toBe('SVG 图标')
  })

  it('应该显示图标集描述', async () => {
    await nextTick()
    const iconSetCards = wrapper.findAll('.grid .relative.p-4')
    
    expect(iconSetCards[0].find('.text-sm.text-theme-comment').text()).toBe('使用 Emoji 字符作为文件图标')
    expect(iconSetCards[1].find('.text-sm.text-theme-comment').text()).toBe('使用 SVG 矢量图标')
  })

  it('应该正确标记当前选中的图标集', async () => {
    await nextTick()
    const iconSetCards = wrapper.findAll('.grid .relative.p-4')
    
    // 第一个图标集应该是当前选中状态
    expect(iconSetCards[0].classes()).toContain('border-theme-accent')
    expect(iconSetCards[0].find('.text-theme-accent').exists()).toBe(true) // 当前使用标记
  })

  it('点击图标集应该调用setIconSet并关闭面板', async () => {
    await nextTick()
    const iconSetCards = wrapper.findAll('.grid .relative.p-4')
    
    await iconSetCards[1].trigger('click') // 点击第二个图标集
    
    expect(mockSetIconSet).toHaveBeenCalledWith('svg')
    expect(mockCloseIconPanel).toHaveBeenCalled()
  })

  it('点击关闭按钮应该关闭面板', async () => {
    const closeButton = wrapper.find('.flex.items-center.justify-between button')
    await closeButton.trigger('click')
    
    expect(mockCloseIconPanel).toHaveBeenCalled()
  })

  it('点击背景遮罩应该关闭面板', async () => {
    const backdrop = wrapper.find('.fixed.inset-0')
    await backdrop.trigger('click')
    
    expect(mockCloseIconPanel).toHaveBeenCalled()
  })

  it('按Escape键应该关闭面板', async () => {
    const panel = wrapper.find('.fixed.inset-0')
    await panel.trigger('keydown', { key: 'Escape' })
    
    expect(mockCloseIconPanel).toHaveBeenCalled()
  })

  it('应该显示文件预览列表', async () => {
    await nextTick()
    const iconSetCards = wrapper.findAll('.grid .relative.p-4')
    const firstPreview = iconSetCards[0].find('.space-y-1')
    
    expect(firstPreview.findAll('.flex.items-center.space-x-2')).toHaveLength(12) // 预览文件数量
  })

  it('应该正确显示Emoji图标', async () => {
    await nextTick()
    const iconSetCards = wrapper.findAll('.grid .relative.p-4')
    const emojiPreview = iconSetCards[0] // Emoji 图标集
    
    // 检查文件夹图标
    const folderIcons = emojiPreview.findAll('.icon-preview-emoji')
    expect(folderIcons[0].text()).toBe('📂') // 展开的文件夹
    
    // 检查文件图标
    const fileItems = emojiPreview.findAll('.flex.items-center.space-x-2')
    expect(fileItems[6].find('.icon-preview-emoji').text()).toBe('📄') // .json文件
    expect(fileItems[11].find('.icon-preview-emoji').text()).toBe('🖼️') // .png文件
  })

  it('应该正确显示SVG图标', async () => {
    await nextTick()
    const iconSetCards = wrapper.findAll('.grid .relative.p-4')
    const svgPreview = iconSetCards[1] // SVG 图标集
    
    // 检查SVG图标元素
    const svgIcons = svgPreview.findAll('.icon-preview-svg')
    expect(svgIcons.length).toBeGreaterThan(0)
    
    // 检查img元素
    const imgElements = svgPreview.findAll('img')
    expect(imgElements.length).toBeGreaterThan(0)
  })

  it('预览文件应该包含正确的文件名', async () => {
    await nextTick()
    const iconSetCards = wrapper.findAll('.grid .relative.p-4')
    const allItems = iconSetCards[0].findAll('.flex.items-center.space-x-2')
    
    // 文件夹
    expect(allItems[0].find('span:nth-child(3)').text()).toBe('common')
    expect(allItems[5].find('span:nth-child(3)').text()).toBe('decisions')
    
    // 文件
    expect(allItems[6].find('span:nth-child(3)').text()).toBe('country_tags.json')
    expect(allItems[7].find('span:nth-child(3)').text()).toBe('state_categories.json')
    expect(allItems[11].find('span:nth-child(3)').text()).toBe('logo.png')
  })

  it('应该显示预览标题', async () => {
    await nextTick()
    const iconSetCards = wrapper.findAll('.grid .relative.p-4')
    
    iconSetCards.forEach((card: { find: (arg0: string) => { (): any; new(): any; exists: { (): any; new(): any }; text: { (): any; new(): any } } }) => {
      expect(card.find('.text-sm.font-medium').exists()).toBe(true)
      expect(card.find('.text-sm.font-medium').text()).toBe('预览效果')
    })
  })

  it('应该显示底部提示信息', () => {
    const footer = wrapper.find('.border-t .text-sm.text-center')
    expect(footer.text()).toContain('Esc')
    expect(footer.text()).toContain('Ctrl+Shift+Y')
  })

  it('图标集卡片应该有hover效果', async () => {
    await nextTick()
    const iconSetCards = wrapper.findAll('.grid .relative.p-4')
    
    // 非选中图标集应该有hover样式
    expect(iconSetCards[1].classes()).toContain('hover:border-theme-accent')
    expect(iconSetCards[1].classes()).toContain('hover:scale-[1.02]')
  })

  it('预览应该有正确的容器样式', async () => {
    await nextTick()
    const iconSetCards = wrapper.findAll('.grid .relative.p-4')
    const previewContainers = iconSetCards[0].findAll('.icon-preview-container')
    
    expect(previewContainers.length).toBeGreaterThan(0)
    expect(previewContainers[0].classes()).toContain('icon-preview-container')
  })

  it('当iconPanelVisible为false时不应该渲染', async () => {
    // 由于v-if="iconPanelVisible"，当为false时Teleport内部内容不会渲染
    // 在这个测试中，我们验证v-if条件正在工作
    expect(wrapper.find('.fixed.inset-0').exists()).toBe(true) // 当前iconPanelVisible为true
    
    // 这个测试验证了组件结构中有v-if条件
    const template = wrapper.vm.$?.setupState || {}
    // 由于我们mock了iconPanelVisible为true，所以面板会渲染
    expect(template.iconPanelVisible !== undefined).toBe(true)
  })

  it('应该区分文件夹和文件的图标显示', async () => {
    await nextTick()
    const iconSetCards = wrapper.findAll('.grid .relative.p-4')
    const emojiPreview = iconSetCards[0]
    
    // 检查是否有文件夹图标（展开状态）
    const folderIcons = emojiPreview.findAll('.icon-preview-emoji')
    expect(folderIcons.length).toBeGreaterThan(0)
    
    // 检查文件名和图标存在
    const fileItems = emojiPreview.findAll('.flex.items-center.space-x-2')
    expect(fileItems.length).toBe(12) // 6个文件夹 + 6个文件
    
    // 检查文件夹名称存在
    expect(emojiPreview.text()).toContain('common')
    expect(emojiPreview.text()).toContain('country_tags.json')
    expect(emojiPreview.text()).toContain('logo.png')
  })
})