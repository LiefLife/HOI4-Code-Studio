import { EditorView } from '@codemirror/view'
import { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { ref, watch } from 'vue'
import { useTheme, type Theme } from './useTheme'

/**
 * CodeMirror 主题配置接口
 */
interface EditorThemeConfig {
  background: string
  foreground: string
  caret: string
  selection: string
  selectionMatch: string
  lineHighlight: string
  gutterBackground: string
  gutterForeground: string
  gutterBorder: string
  // 语法高亮颜色
  comment: string
  keyword: string
  string: string
  number: string
  operator: string
  property: string
  function: string
  variable: string
  type: string
  constant: string
}

/**
 * 将 UI 主题转换为 CodeMirror 主题配置
 */
function themeToEditorConfig(theme: Theme): EditorThemeConfig {
  const colors = theme.colors
  return {
    background: colors.bg,
    foreground: colors.fg,
    caret: colors.accent,
    selection: colors.selection,
    selectionMatch: colors.selection + '80',
    lineHighlight: colors.selection + '40',
    gutterBackground: colors.bgSecondary,
    gutterForeground: colors.comment,
    gutterBorder: colors.border,
    // 语法高亮
    comment: colors.comment,
    keyword: colors.keyword,
    string: colors.success,
    number: colors.warning,
    operator: colors.fg,
    property: colors.accent,
    function: colors.accent,
    variable: colors.fg,
    type: colors.warning,
    constant: colors.keyword
  }
}

/**
 * 创建 CodeMirror 编辑器主题扩展
 */
function createEditorTheme(config: EditorThemeConfig): Extension {
  const editorTheme = EditorView.theme({
    '&': {
      backgroundColor: config.background,
      color: config.foreground
    },
    '.cm-content': {
      caretColor: config.caret
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: config.caret
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: config.selection
    },
    '.cm-selectionMatch': {
      backgroundColor: config.selectionMatch
    },
    '.cm-activeLine': {
      backgroundColor: config.lineHighlight
    },
    '.cm-gutters': {
      backgroundColor: config.gutterBackground,
      color: config.gutterForeground,
      borderRight: `1px solid ${config.gutterBorder}`
    },
    '.cm-activeLineGutter': {
      backgroundColor: config.lineHighlight
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'transparent',
      border: 'none',
      color: config.comment
    },
    '.cm-tooltip': {
      backgroundColor: config.gutterBackground,
      border: `1px solid ${config.gutterBorder}`
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: config.selection
      }
    }
  }, { dark: true })

  const highlightStyle = HighlightStyle.define([
    { tag: t.comment, color: config.comment, fontStyle: 'italic' },
    { tag: t.lineComment, color: config.comment, fontStyle: 'italic' },
    { tag: t.blockComment, color: config.comment, fontStyle: 'italic' },
    { tag: t.docComment, color: config.comment, fontStyle: 'italic' },
    { tag: t.keyword, color: config.keyword },
    { tag: t.controlKeyword, color: config.keyword },
    { tag: t.operatorKeyword, color: config.keyword },
    { tag: t.definitionKeyword, color: config.keyword },
    { tag: t.moduleKeyword, color: config.keyword },
    { tag: t.string, color: config.string },
    { tag: t.special(t.string), color: config.string },
    { tag: t.number, color: config.number },
    { tag: t.integer, color: config.number },
    { tag: t.float, color: config.number },
    { tag: t.bool, color: config.constant },
    { tag: t.null, color: config.constant },
    { tag: t.operator, color: config.operator },
    { tag: t.punctuation, color: config.foreground },
    { tag: t.bracket, color: config.foreground },
    { tag: t.paren, color: config.foreground },
    { tag: t.squareBracket, color: config.foreground },
    { tag: t.angleBracket, color: config.foreground },
    { tag: t.brace, color: config.foreground },
    { tag: t.propertyName, color: config.property },
    { tag: t.function(t.variableName), color: config.function },
    { tag: t.function(t.propertyName), color: config.function },
    { tag: t.definition(t.variableName), color: config.variable },
    { tag: t.definition(t.propertyName), color: config.property },
    { tag: t.variableName, color: config.variable },
    { tag: t.typeName, color: config.type },
    { tag: t.className, color: config.type },
    { tag: t.namespace, color: config.type },
    { tag: t.macroName, color: config.function },
    { tag: t.labelName, color: config.property },
    { tag: t.attributeName, color: config.property },
    { tag: t.attributeValue, color: config.string },
    { tag: t.heading, color: config.keyword, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.link, color: config.property, textDecoration: 'underline' },
    { tag: t.url, color: config.string },
    { tag: t.invalid, color: config.foreground, backgroundColor: config.selection }
  ])

  return [editorTheme, syntaxHighlighting(highlightStyle)]
}

// 编辑器主题版本号，用于触发重新初始化
const editorThemeVersion = ref(0)

/**
 * 获取当前编辑器主题扩展
 */
function getCurrentEditorTheme(): Extension {
  const { currentTheme } = useTheme()
  const config = themeToEditorConfig(currentTheme.value)
  return createEditorTheme(config)
}

/**
 * 通知编辑器主题已更新
 */
function notifyEditorThemeChange() {
  editorThemeVersion.value++
}

// 监听 UI 主题变化，更新编辑器主题
const { currentThemeId } = useTheme()
watch(currentThemeId, () => {
  notifyEditorThemeChange()
})

/**
 * 编辑器主题 Composable
 */
export function useEditorTheme() {
  return {
    editorThemeVersion,
    getCurrentEditorTheme,
    notifyEditorThemeChange,
    createEditorTheme,
    themeToEditorConfig
  }
}
