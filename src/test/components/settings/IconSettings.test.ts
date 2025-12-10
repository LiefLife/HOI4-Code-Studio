import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import IconSettings from '../../../components/settings/IconSettings.vue'

// Mock useFileTreeIcons composable
const mockSetIconSet = vi.fn()

vi.mock('../../../composables/useFileTreeIcons', () => {
  const mockIconSets = [
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
          'vue': '💚'
        }
      }
    },
    {
      id: 'material',
      name: 'Material Icons',
      description: 'Google Material Design 风格图标',
      type: 'svg',
      icons: {
        folder: {
          closed: '/icons/folder-closed.svg',
          open: '/icons/folder-open.svg'
        },
        files: {
          'json': '/icons/json.svg',
          'vue': '/icons/vue.svg'
        }
      }
    }
  ]
  
  return {
    iconSets: mockIconSets,
    useFileTreeIcons: () => ({
      iconSets: mockIconSets,
      currentIconSetId: 'emoji',
      setIconSet: mockSetIconSet
    })
  }
})

describe('IconSettings.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(IconSettings)
  })

  it('应该正确渲染组件标题', () => {
    expect(wrapper.find('.text-hoi4-text.text-base.font-semibold').text()).toBe('文件树图标')
  })

  it('应该默认展开图标选项', () => {
    expect(wrapper.vm.showIconOptions).toBe(true)
    // 检查图标选项容器是否可见（通过检查子元素是否可见）
    expect(wrapper.find('.grid.grid-cols-2').exists()).toBe(true)
  })

  it('应该能够切换图标选项的展开/收起状态', async () => {
    // 初始状态是展开的
    expect(wrapper.vm.showIconOptions).toBe(true)
    
    // 点击切换按钮收起
    const toggleButton = wrapper.find('button')
    await toggleButton.trigger('click')
    
    expect(wrapper.vm.showIconOptions).toBe(false)
    
    // 再次点击展开
    await toggleButton.trigger('click')
    
    expect(wrapper.vm.showIconOptions).toBe(true)
  })

  it('应该显示所有图标集', async () => {
    await nextTick()
    const iconSetButtons = wrapper.findAll('.grid .relative.p-3')
    expect(iconSetButtons).toHaveLength(2)
    
    // 检查图标集名称
    expect(iconSetButtons[0].find('.text-xs.font-medium.text-center.text-hoi4-text').text()).toBe('Emoji 图标')
    expect(iconSetButtons[1].find('.text-xs.font-medium.text-center.text-hoi4-text').text()).toBe('Material Icons')
  })

  it('应该正确标记当前选中的图标集', async () => {
    await nextTick()
    const iconSetButtons = wrapper.findAll('.grid .relative.p-3')
    
    // 第一个图标集应该是当前选中状态
    expect(iconSetButtons[0].classes()).toContain('border-hoi4-accent')
    expect(iconSetButtons[0].classes()).toContain('ring-2')
    expect(iconSetButtons[0].classes()).toContain('ring-hoi4-accent')
    
    // 第二个图标集不应该是选中状态
    expect(iconSetButtons[1].classes()).not.toContain('border-hoi4-accent')
    expect(iconSetButtons[1].classes()).not.toContain('ring-2')
    
    // 检查选中标记
    expect(iconSetButtons[0].find('.absolute.top-1.right-1 svg').exists()).toBe(true)
    expect(iconSetButtons[1].find('.absolute.top-1.right-1 svg').exists()).toBe(false)
  })

  it('点击图标集应该调用setIconSet函数', async () => {
    await nextTick()
    const iconSetButtons = wrapper.findAll('.grid .relative.p-3')
    
    // 点击第二个图标集
    await iconSetButtons[1].trigger('click')
    
    expect(mockSetIconSet).toHaveBeenCalledWith('material')
  })

  it('应该正确显示Emoji图标预览', async () => {
    await nextTick()
    const iconSetButtons = wrapper.findAll('.grid .relative.p-3')
    const emojiPreview = iconSetButtons[0] // Emoji 图标集
    
    // 检查Emoji图标
    const emojiElements = emojiPreview.findAll('span.text-lg')
    expect(emojiElements.length).toBe(3) // 文件夹 + json + vue
    expect(emojiElements[0].text()).toBe('📁') // 文件夹图标
    expect(emojiElements[1].text()).toBe('📄') // json文件图标
    expect(emojiElements[2].text()).toBe('💚') // vue文件图标
  })

  it('应该正确显示SVG图标预览', async () => {
    await nextTick()
    const iconSetButtons = wrapper.findAll('.grid .relative.p-3')
    const svgPreview = iconSetButtons[1] // SVG 图标集
    
    // 检查SVG图标
    const svgElements = svgPreview.findAll('img')
    expect(svgElements.length).toBe(3) // 文件夹 + json + vue
    expect(svgElements[0].attributes('src')).toBe('/icons/folder-closed.svg') // 文件夹图标
    expect(svgElements[1].attributes('src')).toBe('/icons/json.svg') // json文件图标
    expect(svgElements[2].attributes('src')).toBe('/icons/vue.svg') // vue文件图标
  })

  it('应该显示快捷键提示信息', () => {
    const hintElement = wrapper.find('.text-hoi4-comment.text-sm')
    expect(hintElement.exists()).toBe(true)
    expect(hintElement.text()).toContain('Ctrl+Shift+Y')
    expect(hintElement.text()).toContain('快速切换图标')
  })

  it('切换按钮应该正确显示展开/收起文本', async () => {
    let toggleButton = wrapper.find('button .text-sm')
    expect(toggleButton.text()).toBe('收起')
    
    // 点击切换按钮收起
    await wrapper.find('button').trigger('click')
    toggleButton = wrapper.find('button .text-sm')
    expect(toggleButton.text()).toBe('展开')
    
    // 再次点击展开
    await wrapper.find('button').trigger('click')
    toggleButton = wrapper.find('button .text-sm')
    expect(toggleButton.text()).toBe('收起')
  })

  it('切换按钮的图标应该正确旋转', async () => {
    let toggleIcon = wrapper.find('button svg')
    // 初始状态下showIconOptions为true，所以应该有transform rotate-180类
    expect(toggleIcon.classes()).toContain('transform')
    expect(toggleIcon.classes()).toContain('rotate-180')
    
    // 点击切换按钮收起
    await wrapper.find('button').trigger('click')
    toggleIcon = wrapper.find('button svg')
    // 收起后showIconOptions为false，所以应该没有transform rotate-180类
    expect(toggleIcon.classes()).not.toContain('transform')
    expect(toggleIcon.classes()).not.toContain('rotate-180')
    
    // 再次点击展开
    await wrapper.find('button').trigger('click')
    toggleIcon = wrapper.find('button svg')
    // 展开后showIconOptions为true，所以应该有transform rotate-180类
    expect(toggleIcon.classes()).toContain('transform')
    expect(toggleIcon.classes()).toContain('rotate-180')
  })

  it('图标集按钮应该有正确的样式和交互效果', async () => {
    await nextTick()
    const iconSetButtons = wrapper.findAll('.grid .relative.p-3')
    
    // 检查所有按钮的基本样式
    iconSetButtons.forEach((button: any) => {
      expect(button.classes()).toContain('rounded-lg')
      expect(button.classes()).toContain('border-2')
      expect(button.classes()).toContain('transition-all')
      expect(button.classes()).toContain('duration-200')
      expect(button.classes()).toContain('hover:scale-[1.02]')
    })
    
    // 检查非选中按钮的边框样式
    expect(iconSetButtons[1].classes()).toContain('border-hoi4-border')
    expect(iconSetButtons[1].classes()).toContain('hover:border-hoi4-accent')
  })
})
