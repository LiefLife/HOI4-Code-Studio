/*
 * ErrorTip 入口：聚合规则，提供：
 *  - collectErrors(content, ctx?): ErrorItem[]（用于右侧错误列表）
 *  - toDiagnostics(content, ctx?): Diagnostic[]（用于 CodeMirror Lint）
 *  - createLinter({ contextProvider }?): Extension（直接接入编辑器，按实例携带上下文）
 */
import type { ErrorItem, RangeItem, Rule, RuleResult, RuleContext, Severity } from './types'
import { computeLineStarts } from './types'
import { tokenize, generateCleanContent } from './core/tokenizer'
import { alwaysRule } from './rules/always'
import { isRule } from './rules/is_'
import { controlRule } from './rules/control'
import { bracesRule } from './rules/braces'
import { namespaceRule } from './rules/namespace'
import { eventRule } from './rules/event'
import { ideaDesignerRule } from './rules/idea_designer'
import { tagDesignerRule } from './rules/tag_designer'

// 按需导入 Lint（避免强耦合，但此处直接提供便捷工厂）
import type { Diagnostic } from '@codemirror/lint'
import { linter, lintGutter } from '@codemirror/lint'
import type { Extension, EditorState } from '@codemirror/state'
import { EditorView, Decoration, type DecorationSet, WidgetType } from '@codemirror/view'
import { StateField } from '@codemirror/state'

/** 规则注册：后续可在此追加更多规则 */
const RULES: Rule[] = [
  alwaysRule,
  isRule,
  controlRule,
  bracesRule,
  namespaceRule,
  eventRule,
  ideaDesignerRule,
  tagDesignerRule
]

/**
 * 聚合执行所有规则
 */
function runAll(content: string, ctx?: RuleContext): { errors: ErrorItem[]; ranges: RangeItem[] } {
  // 如果禁用了错误处理，直接返回空结果
  if (ctx?.disableErrorHandling) {
    return { errors: [], ranges: [] }
  }
  
  const lineStarts = computeLineStarts(content.split('\n'))
  
  // 生成清洗后的内容（注释和字符串被替换为空格）
  // 这样基于正则的规则就不会误匹配字符串内的内容
  const cleanContent = generateCleanContent(content)
  const lines = cleanContent.split('\n')
  
  // 生成 Token 流，供结构化规则（如 braces）使用
  const tokens = tokenize(content, lineStarts)

  const errors: ErrorItem[] = []
  const ranges: RangeItem[] = []

  for (const rule of RULES) {
    const res: RuleResult = rule.apply(content, lines, lineStarts, ctx, tokens, cleanContent)
    errors.push(...res.errors)
    ranges.push(...res.ranges)
  }

  return { errors, ranges }
}

/**
 * 导出：用于右侧错误列表的数据
 */
export function collectErrors(content: string, ctx?: RuleContext): ErrorItem[] {
  return runAll(content, ctx).errors
}

/**
 * 将范围映射为 CodeMirror 诊断
 */
export function toDiagnostics(content: string, ctx?: RuleContext): Diagnostic[] {
  const { ranges } = runAll(content, ctx)
  // 合并去重（按 from-to）
  const seen = new Set<string>()
  const out: Diagnostic[] = []
  for (const r of ranges) {
    const key = `${r.from}-${r.to}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      from: r.from,
      to: r.to,
      severity: r.severity || 'error',
      message: r.message,
      source: 'ErrorTip'
    })
  }
  return out
}

/**
 * 基于规则输出添加整行装饰（红底或黄底）
 * 注意：需按实例携带上下文，因此使用工厂函数。
 */
const errorLineMark = Decoration.line({ attributes: { class: 'cm-error-line' } })
const warningLineMark = Decoration.line({ attributes: { class: 'cm-warning-line' } })

function createErrorLineField(getCtx: () => RuleContext | undefined) {
  return StateField.define<DecorationSet>({
    create(state: EditorState) {
      return getLineDecorations(state, getCtx())
    },
    update(value, tr) {
      // 映射已有装饰以适配文档变更
      value = value.map(tr.changes)
      // 当文档变化时，重新计算错误行装饰
      if (tr.docChanged) {
        return getLineDecorations(tr.state, getCtx())
      }
      return value
    },
    provide: f => EditorView.decorations.from(f)
  })
}

function getLineDecorations(state: EditorState, ctx?: RuleContext) {
  const text = state.doc.toString()
  const diags = toDiagnostics(text, ctx)
  const deco: ReturnType<typeof errorLineMark.range>[] = []
  
  // 记录每行最高的严重程度
  const lineSeverity = new Map<number, Severity>()
  
  for (const d of diags) {
    const line = state.doc.lineAt(d.from)
    const current = lineSeverity.get(line.number)
    const severity: Severity = d.severity === 'warning' ? 'warning' : 'error'
    
    if (!current) {
      lineSeverity.set(line.number, severity)
    } else if (current === 'warning' && severity === 'error') {
      // Error 优先级高于 Warning
      lineSeverity.set(line.number, 'error')
    }
  }

  for (const [lineNo, severity] of lineSeverity) {
    const line = state.doc.line(lineNo)
    if (severity === 'error') {
      deco.push(errorLineMark.range(line.from))
    } else {
      deco.push(warningLineMark.range(line.from))
    }
  }
  
  return Decoration.set(deco, true)
}

/** Error Lens 小部件：在行尾显示错误消息 */
class LensWidget extends WidgetType {
  constructor(readonly text: string, readonly severity: Severity) { super() }
  eq(other: LensWidget) { return other.text === this.text && other.severity === this.severity }
  toDOM() {
    const span = document.createElement('span')
    span.className = this.severity === 'error' ? 'cm-error-lens' : 'cm-warning-lens'
    span.textContent = this.text
    return span
  }
}

function createErrorLensField(getCtx: () => RuleContext | undefined) {
  return StateField.define<DecorationSet>({
    create(state: EditorState) {
      return getLensDecorations(state, getCtx())
    },
    update(value, tr) {
      value = value.map(tr.changes)
      if (tr.docChanged) {
        return getLensDecorations(tr.state, getCtx())
      }
      return value
    },
    provide: f => EditorView.decorations.from(f)
  })
}

function getLensDecorations(state: EditorState, ctx?: RuleContext) {
  const text = state.doc.toString()
  const diags = toDiagnostics(text, ctx)
  
  const byLine = new Map<number, { msgs: string[], severity: Severity }>()
  
  for (const d of diags) {
    const line = state.doc.lineAt(d.from)
    const current = byLine.get(line.number) || { msgs: [], severity: 'warning' }
    
    current.msgs.push(d.message)
    if (d.severity === 'error') {
      current.severity = 'error'
    }
    
    byLine.set(line.number, current)
  }

  const deco: ReturnType<ReturnType<typeof Decoration.widget>['range']>[] = []
  for (const [lineNo, data] of byLine) {
    const line = state.doc.line(lineNo)
    const msg = data.msgs.slice(0, 3).join(' • ') + (data.msgs.length > 3 ? ` (+${data.msgs.length - 3})` : '')
    deco.push(Decoration.widget({ 
      widget: new LensWidget(msg, data.severity), 
      side: 1 
    }).range(line.to))
  }
  
  return Decoration.set(deco, true)
}

/**
 * 创建供 CodeMirror 使用的 Linter 扩展（含 gutter）。
 */
export function createLinter(options?: { contextProvider?: () => RuleContext | undefined }): Extension[] {
  const getCtx = options?.contextProvider || (() => undefined)
  const lintExt = linter((view) => {
    const text = view.state.doc.toString()
    return toDiagnostics(text, getCtx())
  }, { delay: 300 })
  const gutter = lintGutter({ hoverTime: 200 })
  const theme = EditorView.baseTheme({
    /* 调整 lint 标记的可视效果 */
    '.cm-lintRange.cm-lintRange-error': {
      backgroundColor: 'rgba(255, 0, 0, 0.3)'
    },
    '.cm-lintRange.cm-lintRange-warning': {
      backgroundColor: 'rgba(255, 255, 0, 0.3)'
    },
    /* 行级红底/黄底 */
    '.cm-error-line': {
      backgroundColor: 'rgba(255, 0, 0, 0.3)'
    },
    '.cm-warning-line': {
      backgroundColor: 'rgba(255, 255, 0, 0.2)'
    },
    /* Error Lens 行尾气泡 */
    '.cm-error-lens': {
      background: 'rgba(255, 0, 0, 0.9)',
      color: '#ffffff',
      fontSize: '12px',
      padding: '0 6px',
      marginLeft: '8px',
      borderRadius: '4px',
      lineHeight: '1.6',
      whiteSpace: 'pre-wrap',
      pointerEvents: 'auto'
    },
    '.cm-warning-lens': {
      background: 'rgba(255, 204, 0, 0.9)', // 稍微深一点的黄色，保证白字可读性
      color: '#ffffff',
      fontSize: '12px',
      padding: '0 6px',
      marginLeft: '8px',
      borderRadius: '4px',
      lineHeight: '1.6',
      whiteSpace: 'pre-wrap',
      pointerEvents: 'auto'
    }
  })
  const lineField = createErrorLineField(getCtx)
  const lensField = createErrorLensField(getCtx)
  return [lintExt, gutter, lineField, lensField, theme]
}
