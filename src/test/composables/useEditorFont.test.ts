/**
 * 编辑器字体配置测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEditorFont, type EditorFontConfig } from '../../../src/composables/useEditorFont'

describe('useEditorFont', () => {
  let editorFont: ReturnType<typeof useEditorFont>

  beforeEach(() => {
    vi.clearAllMocks()
    editorFont = useEditorFont()
  })

  it('应该正确初始化字体配置', () => {
    expect(editorFont.fontConfig.value).toEqual({
      family: 'Consolas',
      size: 14,
      weight: '400',
      lineHeight: 1.5
    })
  })

  it('应该返回可用的字体选项', () => {
    expect(editorFont.availableFonts).toBeDefined()
    expect(Array.isArray(editorFont.availableFonts)).toBe(true)
    expect(editorFont.availableFonts.length).toBeGreaterThan(0)
  })

  it('应该返回字体粗细选项', () => {
    expect(editorFont.fontWeights).toBeDefined()
    expect(Array.isArray(editorFont.fontWeights)).toBe(true)
    expect(editorFont.fontWeights.length).toBeGreaterThan(0)
  })

  it('应该返回字体大小选项', () => {
    expect(editorFont.fontSizes).toBeDefined()
    expect(Array.isArray(editorFont.fontSizes)).toBe(true)
    expect(editorFont.fontSizes.length).toBeGreaterThan(0)
  })

  it('应该能够设置字体配置', () => {
    const newConfig: Partial<EditorFontConfig> = {
      family: 'Fira Code',
      size: 16,
      weight: '500'
    }

    const initialVersion = editorFont.fontConfigVersion.value
    editorFont.setFontConfig(newConfig)

    expect(editorFont.fontConfig.value.family).toBe('Fira Code')
    expect(editorFont.fontConfig.value.size).toBe(16)
    expect(editorFont.fontConfig.value.weight).toBe('500')
    expect(editorFont.fontConfigVersion.value).toBe(initialVersion + 1)
  })

  it('应该能够重置为默认字体配置', () => {
    // 先修改配置
    editorFont.setFontConfig({
      family: 'Monaco',
      size: 18,
      weight: '700'
    })

    const initialVersion = editorFont.fontConfigVersion.value
    editorFont.resetFontConfig()

    expect(editorFont.fontConfig.value).toEqual({
      family: 'Consolas',
      size: 14,
      weight: '400',
      lineHeight: 1.5
    })
    expect(editorFont.fontConfigVersion.value).toBe(initialVersion + 1)
  })

  it('应该能够获取跨平台兼容的字体族', () => {
    const fontFamily = 'Consolas'
    const compatibleFamily = editorFont.getCompatibleFontFamily(fontFamily)
    
    expect(compatibleFamily).toContain('Consolas')
    expect(compatibleFamily).toContain('monospace')
  })

  it('应该能够从未知字体返回后备字体', () => {
    const fontFamily = 'UnknownFont'
    const compatibleFamily = editorFont.getCompatibleFontFamily(fontFamily)
    
    expect(compatibleFamily).toBe('UnknownFont, monospace')
  })

  it('应该能够从设置数据加载字体配置', () => {
    const settings = {
      editorFont: {
        family: 'JetBrains Mono',
        size: 15,
        weight: '600',
        lineHeight: 1.6
      }
    }

    editorFont.loadFontConfigFromSettings(settings)

    expect(editorFont.fontConfig.value.family).toBe('JetBrains Mono')
    expect(editorFont.fontConfig.value.size).toBe(15)
    expect(editorFont.fontConfig.value.weight).toBe('600')
    expect(editorFont.fontConfig.value.lineHeight).toBe(1.6)
  })

  it('应该处理空的设置数据', () => {
    const settings = {}

    editorFont.loadFontConfigFromSettings(settings)

    expect(editorFont.fontConfig.value).toEqual({
      family: 'Consolas',
      size: 14,
      weight: '400',
      lineHeight: 1.5
    })
  })

  it('应该处理部分字体配置的设置数据', () => {
    const settings = {
      editorFont: {
        family: 'Fira Code'
      }
    }

    editorFont.loadFontConfigFromSettings(settings)

    expect(editorFont.fontConfig.value.family).toBe('Fira Code')
    expect(editorFont.fontConfig.value.size).toBe(14) // 保持默认值
    expect(editorFont.fontConfig.value.weight).toBe('400') // 保持默认值
  })

  it('应该能够获取字体配置用于保存到设置', () => {
    // 先重置为默认配置确保测试一致性
    editorFont.resetFontConfig()
    const configForSettings = editorFont.getFontConfigForSettings()

    expect(configForSettings).toEqual({
      editorFont: {
        family: 'Consolas',
        size: 14,
        weight: '400',
        lineHeight: 1.5
      }
    })
  })

  it('应该能够通知字体配置变更', () => {
    const initialVersion = editorFont.fontConfigVersion.value
    editorFont.notifyFontConfigChange()

    expect(editorFont.fontConfigVersion.value).toBe(initialVersion + 1)
  })

  it('应该能够创建编辑器字体主题扩展', () => {
    const config: EditorFontConfig = {
      family: 'Consolas',
      size: 14,
      weight: '400',
      lineHeight: 1.5
    }

    const themeExtension = editorFont.createEditorFontTheme(config)

    expect(themeExtension).toBeDefined()
    expect(typeof themeExtension).toBe('object')
  })

  it('应该能够获取当前字体配置', () => {
    // 先重置为默认配置确保测试一致性
    editorFont.resetFontConfig()
    const currentConfig = editorFont.getCurrentFontConfig()

    expect(currentConfig).toEqual({
      family: 'Consolas',
      size: 14,
      weight: '400',
      lineHeight: 1.5
    })
  })

  it('应该返回默认字体配置', () => {
    expect(editorFont.defaultFontConfig).toEqual({
      family: 'Consolas',
      size: 14,
      weight: '400',
      lineHeight: 1.5
    })
  })
})