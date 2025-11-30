import { describe, it, expect } from 'vitest'
import { themes, useTheme } from '../composables/useTheme'

describe('主题系统测试', () => {
  it('应该包含所有新添加的主题', () => {
    // HOI4国家主题
    const hoi4CountryThemes = [
      'hearts-uk-dark',
      'hearts-uk-light',
      'hearts-france-dark',
      'hearts-france-light',
      'hearts-germany-dark',
      'hearts-germany-light',
      'hearts-italy-dark',
      'hearts-italy-light',
      'hearts-japan-dark',
      'hearts-japan-light'
    ]

    // 流行编辑器主题
    const popularEditorThemes = [
      'jetbrains-darcula',
      'jetbrains-intellij-light',
      'doom-one'
    ]

    // 无障碍主题
    const accessibilityThemes = [
      'high-contrast',
      'colorblind-friendly'
    ]

    // 验证所有新主题都存在
    hoi4CountryThemes.forEach(themeId => {
      expect(themes.some(t => t.id === themeId)).toBe(true)
    })

    popularEditorThemes.forEach(themeId => {
      expect(themes.some(t => t.id === themeId)).toBe(true)
    })

    accessibilityThemes.forEach(themeId => {
      expect(themes.some(t => t.id === themeId)).toBe(true)
    })
  })

  it('所有主题应该包含必需的颜色属性', () => {
    const requiredColors = [
      'bg', 'bgSecondary', 'fg', 'comment', 'border',
      'selection', 'accent', 'success', 'warning', 'error', 'keyword'
    ]

    themes.forEach(theme => {
      requiredColors.forEach(color => {
        expect(theme.colors).toHaveProperty(color)
        expect(typeof theme.colors[color as keyof typeof theme.colors]).toBe('string')
        expect(theme.colors[color as keyof typeof theme.colors]).toMatch(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/)
      })
    })
  })

  it('主题切换功能应该正常工作', () => {
    const { setTheme, currentThemeId } = useTheme()
    
    // 测试切换到新主题
    const testTheme = themes.find(t => t.id === 'hearts-uk-dark')
    expect(testTheme).toBeDefined()
    
    if (testTheme) {
      setTheme(testTheme.id, false) // 不保存到设置
      expect(currentThemeId.value).toBe(testTheme.id)
    }
  })

  it('高对比度主题应该有足够的对比度', () => {
    const highContrastTheme = themes.find(t => t.id === 'high-contrast')
    expect(highContrastTheme).toBeDefined()
    
    if (highContrastTheme) {
      // 检查黑白对比度
      expect(highContrastTheme.colors.bg).toBe('#000000')
      expect(highContrastTheme.colors.fg).toBe('#ffffff')
    }
  })

  it('HOI4国家主题应该使用正确的国家颜色', () => {
    // 英国主题 - 红蓝白
    const ukTheme = themes.find(t => t.id === 'hearts-uk-dark')
    expect(ukTheme).toBeDefined()
    if (ukTheme) {
      expect(ukTheme.colors.accent).toBe('#c41e3a') // 英国红
      expect(ukTheme.colors.success).toBe('#4169e1') // 英国蓝
    }

    // 法国主题 - 蓝白红
    const franceTheme = themes.find(t => t.id === 'hearts-france-dark')
    expect(franceTheme).toBeDefined()
    if (franceTheme) {
      expect(franceTheme.colors.accent).toBe('#002395') // 法国蓝
      expect(franceTheme.colors.warning).toBe('#ed2939') // 法国红
    }

    // 德国主题 - 黑红金
    const germanyTheme = themes.find(t => t.id === 'hearts-germany-dark')
    expect(germanyTheme).toBeDefined()
    if (germanyTheme) {
      expect(germanyTheme.colors.accent).toBe('#000000') // 德国黑
      expect(germanyTheme.colors.success).toBe('#dd0000') // 德国红
      expect(germanyTheme.colors.warning).toBe('#ffce00') // 德国金
    }

    // 意大利主题 - 绿白红
    const italyTheme = themes.find(t => t.id === 'hearts-italy-dark')
    expect(italyTheme).toBeDefined()
    if (italyTheme) {
      expect(italyTheme.colors.accent).toBe('#009246') // 意大利绿
      expect(italyTheme.colors.warning).toBe('#ce2b37') // 意大利红
    }

    // 日本主题 - 红白
    const japanTheme = themes.find(t => t.id === 'hearts-japan-dark')
    expect(japanTheme).toBeDefined()
    if (japanTheme) {
      expect(japanTheme.colors.accent).toBe('#bc002d') // 日本红
    }
  })
})