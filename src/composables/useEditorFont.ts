import { ref, computed } from 'vue'
import { EditorView } from '@codemirror/view'
import { Extension } from '@codemirror/state'

/**
 * 编辑器字体配置接口
 */
export interface EditorFontConfig {
  /** 字体族名称 */
  family: string
  /** 字体大小 (px) */
  size: number
  /** 字体粗细 */
  weight: string
  /** 行高 */
  lineHeight: number
}

/**
 * 跨平台字体兼容性映射
 */
export const fontFamilyMappings: Record<string, string[]> = {
  // 等宽字体系列
  'Consolas': ['Consolas', 'Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
  'Monaco': ['Monaco', 'Menlo', 'Consolas', 'Ubuntu Mono', 'monospace'],
  'Menlo': ['Menlo', 'Monaco', 'Consolas', 'Ubuntu Mono', 'monospace'],
  'Ubuntu Mono': ['Ubuntu Mono', 'Consolas', 'Monaco', 'Menlo', 'monospace'],
  'Source Code Pro': ['Source Code Pro', 'Consolas', 'Monaco', 'Menlo', 'monospace'],
  'Fira Code': ['Fira Code', 'Consolas', 'Monaco', 'Menlo', 'monospace'],
  'JetBrains Mono': ['JetBrains Mono', 'Consolas', 'Monaco', 'Menlo', 'monospace'],
  'Cascadia Code': ['Cascadia Code', 'Consolas', 'Monaco', 'Menlo', 'monospace'],
  'Inconsolata': ['Inconsolata', 'Consolas', 'Monaco', 'Menlo', 'monospace'],
  'Roboto Mono': ['Roboto Mono', 'Consolas', 'Monaco', 'Menlo', 'monospace'],
  // 通用等宽字体
  'monospace': ['monospace'],
  'Courier New': ['Courier New', 'monospace']
}

/**
 * 可用字体选项
 */
export const availableFonts = [
  { value: 'Consolas', label: 'Consolas (Windows默认)' },
  { value: 'Monaco', label: 'Monaco (macOS默认)' },
  { value: 'Menlo', label: 'Menlo (iOS默认)' },
  { value: 'Ubuntu Mono', label: 'Ubuntu Mono (Linux推荐)' },
  { value: 'Source Code Pro', label: 'Source Code Pro (Adobe)' },
  { value: 'Fira Code', label: 'Fira Code (带连字)' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono (JetBrains)' },
  { value: 'Cascadia Code', label: 'Cascadia Code (Microsoft)' },
  { value: 'Inconsolata', label: 'Inconsolata' },
  { value: 'Roboto Mono', label: 'Roboto Mono' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'monospace', label: '系统默认等宽字体' }
]

/**
 * 字体粗细选项 - 保持原有的预设值用于快速选择
 */
export const fontWeights = [
  { value: '100', label: '超细 (100)' },
  { value: '200', label: '特细 (200)' },
  { value: '300', label: '细体 (300)' },
  { value: '400', label: '正常 (400)' },
  { value: '500', label: '中等 (500)' },
  { value: '600', label: '半粗 (600)' },
  { value: '700', label: '粗体 (700)' },
  { value: '800', label: '特粗 (800)' },
  { value: '900', label: '超粗 (900)' }
]

/**
 * 字体粗细预设选项 - 用于快速选择按钮
 */
export const fontWeightPresets = [
  { value: '100', label: '超细' },
  { value: '300', label: '细体' },
  { value: '400', label: '正常' },
  { value: '600', label: '半粗' },
  { value: '700', label: '粗体' },
  { value: '900', label: '超粗' }
]

/**
 * 字体大小选项
 */
export const fontSizes = [
  { value: 12, label: '12px' },
  { value: 13, label: '13px' },
  { value: 14, label: '14px' },
  { value: 15, label: '15px' },
  { value: 16, label: '16px' },
  { value: 17, label: '17px' },
  { value: 18, label: '18px' },
  { value: 20, label: '20px' },
  { value: 22, label: '22px' },
  { value: 24, label: '24px' }
]

/**
 * 默认字体配置
 */
export const defaultFontConfig: EditorFontConfig = {
  family: 'Consolas',
  size: 14,
  weight: '400',
  lineHeight: 1.5
}

// 字体配置状态
const fontConfig = ref<EditorFontConfig>({ ...defaultFontConfig })
const fontConfigVersion = ref(0)

/**
 * 获取跨平台兼容的字体族字符串
 */
export function getCompatibleFontFamily(fontFamily: string): string {
  const mappings = fontFamilyMappings[fontFamily]
  if (mappings) {
    return mappings.join(', ')
  }
  // 如果没有找到映射，返回字体族并添加通用等宽字体作为后备
  return `${fontFamily}, monospace`
}

/**
 * 创建编辑器字体主题扩展
 */
export function createEditorFontTheme(config: EditorFontConfig): Extension {
  const compatibleFontFamily = getCompatibleFontFamily(config.family)
  
  return EditorView.theme({
    // 应用到整个编辑器
    '&': {
      fontFamily: compatibleFontFamily,
      fontSize: `${config.size}px`,
      fontWeight: config.weight,
      lineHeight: config.lineHeight
    },
    // 应用到内容区域
    '.cm-content': {
      fontFamily: compatibleFontFamily,
      fontSize: `${config.size}px`,
      fontWeight: config.weight,
      lineHeight: config.lineHeight
    },
    // 应用到每一行
    '.cm-line': {
      fontFamily: compatibleFontFamily,
      fontSize: `${config.size}px`,
      fontWeight: config.weight,
      lineHeight: config.lineHeight
    },
    // 应用到行号区域
    '.cm-gutters': {
      fontFamily: compatibleFontFamily,
      fontSize: `${config.size}px`,
      fontWeight: config.weight
    },
    // 应用到行号
    '.cm-gutterElement': {
      fontWeight: config.weight
    },
    // 覆盖所有语法高亮元素 - 使用更通用的选择器
    '.cm-content *': {
      fontWeight: config.weight
    },
    // 覆盖所有可能的语法高亮类名
    '.cm-content [class^="cm-t-"]': {
      fontWeight: config.weight
    },
    // 覆盖自动补全提示的字体
    '.cm-tooltip': {
      fontFamily: compatibleFontFamily,
      fontSize: `${config.size}px`,
      fontWeight: config.weight
    }
  })
}

/**
 * 获取当前字体配置
 */
export function getCurrentFontConfig(): EditorFontConfig {
  return { ...fontConfig.value }
}

/**
 * 设置字体配置
 */
export function setFontConfig(config: Partial<EditorFontConfig>) {
  fontConfig.value = { ...fontConfig.value, ...config }
  fontConfigVersion.value++
}

/**
 * 重置为默认字体配置
 */
export function resetFontConfig() {
  fontConfig.value = { ...defaultFontConfig }
  fontConfigVersion.value++
}

/**
 * 从设置数据加载字体配置
 */
export function loadFontConfigFromSettings(settings: any) {
  if (settings.editorFont) {
    const config = settings.editorFont
    fontConfig.value = {
      family: config.family || defaultFontConfig.family,
      size: config.size || defaultFontConfig.size,
      weight: config.weight || defaultFontConfig.weight,
      lineHeight: config.lineHeight || defaultFontConfig.lineHeight
    }
  } else {
    // 如果没有字体配置，使用默认配置
    fontConfig.value = { ...defaultFontConfig }
  }
}

/**
 * 获取字体配置用于保存到设置
 */
export function getFontConfigForSettings() {
  return {
    editorFont: { ...fontConfig.value }
  }
}

/**
 * 通知字体配置已更新
 */
export function notifyFontConfigChange() {
  fontConfigVersion.value++
}

/**
 * 编辑器字体管理 Composable
 */
export function useEditorFont() {
  return {
    fontConfig: computed(() => fontConfig.value),
    fontConfigVersion: computed(() => fontConfigVersion.value),
    availableFonts,
    fontWeights,
    fontSizes,
    fontWeightPresets,
    defaultFontConfig,
    getCompatibleFontFamily,
    createEditorFontTheme,
    getCurrentFontConfig,
    setFontConfig,
    resetFontConfig,
    loadFontConfigFromSettings,
    getFontConfigForSettings,
    notifyFontConfigChange
  }
}