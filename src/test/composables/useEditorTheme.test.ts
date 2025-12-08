/**
 * 编辑器主题配置测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEditorTheme } from '../../../src/composables/useEditorTheme'

// Mock useTheme
vi.mock('../../../src/composables/useTheme', () => ({
  useTheme: () => ({
    currentThemeId: { value: 'onedark' },
    currentTheme: { 
      value: {
        id: 'onedark',
        name: 'One Dark',
        colors: {
          bg: '#282c34',
          bgSecondary: '#21252b',
          fg: '#abb2bf',
          comment: '#5c6370',
          border: '#181a1f',
          selection: '#3e4451',
          accent: '#61afef',
          success: '#98c379',
          warning: '#e5c07b',
          error: '#e06c75',
          keyword: '#c678dd'
        }
      }
    }
  })
}))

// Mock CodeMirror 相关模块
vi.mock('@codemirror/view', () => ({
  EditorView: {
    theme: vi.fn(() => ({})),
    EditorView: class {}
  }
}))

vi.mock('@codemirror/state', () => ({
  Extension: class {}
}))

vi.mock('@codemirror/language', () => ({
  HighlightStyle: {
    define: vi.fn(() => ({})),
  },
  syntaxHighlighting: vi.fn(() => ({})),
}))

vi.mock('@lezer/highlight', () => ({
  tags: {
    comment: 'comment',
    keyword: 'keyword',
    string: 'string',
    number: 'number',
    operator: 'operator',
    property: 'property',
    function: vi.fn((tag) => tag),
    variable: 'variable',
    type: 'type',
    constant: 'constant',
    special: vi.fn((tag) => tag),
    lineComment: 'lineComment',
    blockComment: 'blockComment',
    docComment: 'docComment',
    controlKeyword: 'controlKeyword',
    operatorKeyword: 'operatorKeyword',
    definitionKeyword: 'definitionKeyword',
    moduleKeyword: 'moduleKeyword',
    integer: 'integer',
    float: 'float',
    bool: 'bool',
    null: 'null',
    punctuation: 'punctuation',
    bracket: 'bracket',
    paren: 'paren',
    squareBracket: 'squareBracket',
    angleBracket: 'angleBracket',
    brace: 'brace',
    propertyName: 'propertyName',
    labelName: 'labelName',
    attributeName: 'attributeName',
    attributeValue: 'attributeValue',
    heading: 'heading',
    emphasis: 'emphasis',
    strong: 'strong',
    link: 'link',
    url: 'url',
    invalid: 'invalid',
    definition: vi.fn((tag) => tag)
  }
}))

describe('useEditorTheme', () => {
  let editorTheme: ReturnType<typeof useEditorTheme>

  beforeEach(() => {
    vi.clearAllMocks()
    editorTheme = useEditorTheme()
  })

  it('应该正确初始化主题版本号', () => {
    expect(editorTheme.editorThemeVersion.value).toBe(0)
  })

  it('应该能够获取当前编辑器主题扩展', () => {
    const themeExtension = editorTheme.getCurrentEditorTheme()
    expect(themeExtension).toBeDefined()
    expect(Array.isArray(themeExtension)).toBe(true)
  })

  it('应该能够通知主题变更', () => {
    const initialVersion = editorTheme.editorThemeVersion.value
    editorTheme.notifyEditorThemeChange()
    expect(editorTheme.editorThemeVersion.value).toBe(initialVersion + 1)
  })

  it('应该能够将主题配置转换为编辑器配置', () => {
    const theme = {
      id: 'test',
      name: 'Test Theme',
      colors: {
        bg: '#000000',
        bgSecondary: '#111111',
        fg: '#ffffff',
        comment: '#888888',
        border: '#222222',
        selection: '#333333',
        accent: '#ff0000',
        success: '#00ff00',
        warning: '#ffff00',
        error: '#ff0000',
        keyword: '#ff00ff'
      }
    }

    const config = editorTheme.themeToEditorConfig(theme)
    
    // 先测试其他属性，看看哪些工作
    expect(config.background).toBe('#000000')
    expect(config.foreground).toBe('#ffffff')
    expect(config.comment).toBe('#888888')
    
    // 检查caret属性（在主题转换函数中，accent被映射到caret）
    expect(config.caret).toBe('#ff0000')
    
    expect(config.keyword).toBe('#ff00ff')
    expect(config.string).toBe('#00ff00') // success color
    expect(config.number).toBe('#ffff00') // warning color
  })

  it('应该能够创建编辑器主题扩展', () => {
    const config = {
      background: '#000000',
      foreground: '#ffffff',
      caret: '#ff0000',
      selection: '#333333',
      selectionMatch: '#33333380',
      lineHighlight: '#33333340',
      gutterBackground: '#111111',
      gutterForeground: '#888888',
      gutterBorder: '#222222',
      comment: '#888888',
      keyword: '#ff00ff',
      string: '#00ff00',
      number: '#ffff00',
      operator: '#ffffff',
      property: '#ff0000',
      function: '#ff0000',
      variable: '#ffffff',
      type: '#ffff00',
      constant: '#ff00ff'
    }

    const themeExtension = editorTheme.createEditorTheme(config)
    expect(themeExtension).toBeDefined()
    expect(Array.isArray(themeExtension)).toBe(true)
  })

  it('应该能够处理主题变化监听', () => {
    // 测试主题变化监听功能
    expect(() => {
      editorTheme.notifyEditorThemeChange()
    }).not.toThrow()
  })
})