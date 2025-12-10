/**
 * useRGBColorDisplay composable 的单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useRGBColorDisplay } from '../../../src/composables/useRGBColorDisplay'

// 模拟 Tauri API
vi.mock('../../../src/api/tauri', () => ({
  loadSettings: vi.fn()
}))

import { loadSettings } from '../../../src/api/tauri'

describe('useRGBColorDisplay', () => {
  let rgbDisplay: ReturnType<typeof useRGBColorDisplay>

  beforeEach(() => {
    vi.clearAllMocks()
    rgbDisplay = useRGBColorDisplay()
  })

  it('应该正确初始化状态', () => {
    expect(rgbDisplay.enabled.value).toBe(true)
    expect(rgbDisplay.rgbColors.value).toEqual([])
  })

  it('应该能够解析RGB颜色', () => {
    const testText = 'RGB{255 100 50} 是一个红色'
    const colors = rgbDisplay.parseRGBColors(testText)
    
    expect(colors.length).toBe(1)
    expect(colors[0].r).toBe(255)
    expect(colors[0].g).toBe(100)
    expect(colors[0].b).toBe(50)
    expect(colors[0].a).toBe(255)
    expect(colors[0].text).toBe('RGB{255 100 50}')
  })

  it('应该能够解析RGBA颜色', () => {
    const testText = 'RGBA{255 100 50 128} 是一个半透明红色'
    const colors = rgbDisplay.parseRGBColors(testText)
    
    expect(colors.length).toBe(1)
    expect(colors[0].r).toBe(255)
    expect(colors[0].g).toBe(100)
    expect(colors[0].b).toBe(50)
    expect(colors[0].a).toBe(128)
    expect(colors[0].text).toBe('RGBA{255 100 50 128}')
  })

  it('应该能够解析多种分隔符的RGB颜色', () => {
    const testText = `
      RGB{255 100 50} 使用空格分隔
      RGB{255,100,50} 使用逗号分隔
      RGB{255, 100, 50} 使用逗号和空格分隔
      RGB{255 100,50} 使用混合分隔符
    `
    const colors = rgbDisplay.parseRGBColors(testText)
    
    expect(colors.length).toBe(4)
    colors.forEach(color => {
      expect(color.r).toBe(255)
      expect(color.g).toBe(100)
      expect(color.b).toBe(50)
      expect(color.a).toBe(255)
    })
  })

  it('应该能够解析文本中的多个颜色', () => {
    const testText = `
      背景色: RGB{255 255 255}
      前景色: RGB{0 0 0}
      强调色: RGB{255 0 0}
    `
    const colors = rgbDisplay.parseRGBColors(testText)
    
    expect(colors.length).toBe(3)
    expect(colors[0].r).toBe(255)
    expect(colors[0].g).toBe(255)
    expect(colors[0].b).toBe(255)
    expect(colors[1].r).toBe(0)
    expect(colors[1].g).toBe(0)
    expect(colors[1].b).toBe(0)
    expect(colors[2].r).toBe(255)
    expect(colors[2].g).toBe(0)
    expect(colors[2].b).toBe(0)
  })

  it('应该能够处理RGB值的边界情况', () => {
    const testText = `
      RGB{0 0 0} 黑色
      RGB{255 255 255} 白色
      RGB{255 0 0} 红色
      RGB{0 255 0} 绿色
      RGB{0 0 255} 蓝色
    `
    const colors = rgbDisplay.parseRGBColors(testText)
    
    expect(colors.length).toBe(5)
    
    // 检查黑色
    expect(colors[0].r).toBe(0)
    expect(colors[0].g).toBe(0)
    expect(colors[0].b).toBe(0)
    
    // 检查白色
    expect(colors[1].r).toBe(255)
    expect(colors[1].g).toBe(255)
    expect(colors[1].b).toBe(255)
    
    // 检查红色
    expect(colors[2].r).toBe(255)
    expect(colors[2].g).toBe(0)
    expect(colors[2].b).toBe(0)
  })

  it('应该忽略无效的RGB颜色', () => {
    const testText = `
      RGB{256 100 50} 无效的红色值
      RGB{255 256 50} 无效的绿色值
      RGB{255 100 256} 无效的蓝色值
      RGB{255 100} 缺少蓝色值
      RGB{255 100 50 256} 无效的Alpha值
      RGB{255} 缺少多个值
    `
    const colors = rgbDisplay.parseRGBColors(testText)
    
    // 应该没有有效的RGB颜色
    expect(colors.length).toBe(0)
  })

  it('应该能够启用和禁用RGB颜色显示', () => {
    // 默认应该是启用的
    expect(rgbDisplay.enabled.value).toBe(true)
    
    // 测试禁用
    rgbDisplay.setEnabled(false)
    expect(rgbDisplay.enabled.value).toBe(false)
    
    // 测试启用
    rgbDisplay.setEnabled(true)
    expect(rgbDisplay.enabled.value).toBe(true)
    
    // 验证getEnabled方法
    expect(rgbDisplay.getEnabled()).toBe(true)
  })

  it('应该能够从设置中加载启用状态', async () => {
    // 模拟加载设置返回禁用状态
    vi.mocked(loadSettings).mockResolvedValue({
      success: true,
      data: {
        enableRGBColorDisplay: false
      },
      message: ''
    })
    
    await rgbDisplay.loadSettingsFromStorage()
    
    expect(rgbDisplay.enabled.value).toBe(false)
    expect(loadSettings).toHaveBeenCalledTimes(1)
  })

  it('应该在设置加载失败时保持默认状态', async () => {
    // 模拟加载设置失败
    vi.mocked(loadSettings).mockResolvedValue({
      success: false,
      message: ''
    })
    
    await rgbDisplay.loadSettingsFromStorage()
    
    // 应该保持默认的启用状态
    expect(rgbDisplay.enabled.value).toBe(true)
    expect(loadSettings).toHaveBeenCalledTimes(1)
  })

  it('应该能够创建RGB颜色装饰器字段', () => {
    const rgbField = rgbDisplay.createRGBColorField()
    expect(rgbField).toBeDefined()
    // 验证返回的是一个有效的对象，而不是检查具体属性
    expect(typeof rgbField).toBe('object')
    // 检查它是否可以作为StateField使用（通过查看它的类型和结构）
    expect(rgbField).not.toBeNull()
  })
})
