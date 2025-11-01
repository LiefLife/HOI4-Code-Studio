/*
 * ErrorTip 入口：聚合规则，提供：
 *  - collectErrors(content, ctx?): ErrorItem[]（用于右侧错误列表）
 *  - toDiagnostics(content, ctx?): Diagnostic[]（用于 CodeMirror Lint）
 *  - createLinter({ contextProvider }?): Extension（直接接入编辑器，按实例携带上下文）
 */
import type { ErrorItem, RangeItem, Rule, RuleResult, RuleContext } from './types'
import { computeLineStarts } from './types'
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
  const lines = content.split('\n')
  const lineStarts = computeLineStarts(lines)
  const errors: ErrorItem[] = []
  const ranges: RangeItem[] = []

  for (const rule of RULES) {
    const res: RuleResult = rule.apply(content, lines, lineStarts, ctx)
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
      severity: 'error',
      message: r.message,
      source: 'ErrorTip'
    })
  }
  return out
}

/**
 * 基于规则输出添加整行装饰（红底）
 * 注意：需按实例携带上下文，因此使用工厂函数。
 */
const errorLineMark = Decoration.line({ attributes: { class: 'cm-error-line' } })

function createErrorLineField(getCtx: () => RuleContext | undefined) {
  return StateField.define<DecorationSet>({
    create(state: EditorState) {
      // 初次载入即根据文档计算行级装饰
      const text = state.doc.toString()
      const diags = toDiagnostics(text, getCtx())
      const seenLines = new Set<number>()
      const deco: any[] = []
      for (const d of diags) {
        const line = state.doc.lineAt(d.from)
        if (!seenLines.has(line.number)) {
          seenLines.add(line.number)
          deco.push(errorLineMark.range(line.from))
        }
      }
      return Decoration.set(deco, true)
    },
    update(value, tr) {
      // 映射已有装饰以适配文档变更
      value = value.map(tr.changes)
      // 当文档变化时，重新计算错误行装饰
      if (tr.docChanged) {
        const text = tr.state.doc.toString()
        const diags = toDiagnostics(text, getCtx())
        const seenLines = new Set<number>()
        const deco: any[] = []
        for (const d of diags) {
          const line = tr.state.doc.lineAt(d.from)
          if (!seenLines.has(line.number)) {
            seenLines.add(line.number)
            deco.push(errorLineMark.range(line.from))
          }
        }
        return Decoration.set(deco, true)
      }
      return value
    },
    provide: f => EditorView.decorations.from(f)
  })
}

/** Error Lens 小部件：在行尾显示错误消息 */
class LensWidget extends WidgetType {
  constructor(readonly text: string) { super() }
  eq(other: LensWidget) { return other.text === this.text }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-error-lens'
    span.textContent = this.text
    return span
  }
}

function createErrorLensField(getCtx: () => RuleContext | undefined) {
  return StateField.define<DecorationSet>({
    create(state: EditorState) {
      // 初次载入即生成行尾消息
      const text = state.doc.toString()
      const diags = toDiagnostics(text, getCtx())
      const byLine = new Map<number, string[]>()
      for (const d of diags) {
        const line = state.doc.lineAt(d.from)
        const arr = byLine.get(line.number) || []
        arr.push(d.message)
        byLine.set(line.number, arr)
      }
      const deco: any[] = []
      for (const [lineNo, messages] of byLine) {
        const line = state.doc.line(lineNo)
        const msg = messages.slice(0, 3).join(' • ') + (messages.length > 3 ? ` (+${messages.length - 3})` : '')
        deco.push(Decoration.widget({ widget: new LensWidget(msg), side: 1 }).range(line.to))
      }
      return Decoration.set(deco, true)
    },
    update(value, tr) {
      value = value.map(tr.changes)
      if (tr.docChanged) {
        const text = tr.state.doc.toString()
        const diags = toDiagnostics(text, getCtx())
        // 同一行合并消息
        const byLine = new Map<number, string[]>()
        for (const d of diags) {
          const line = tr.state.doc.lineAt(d.from)
          const arr = byLine.get(line.number) || []
          arr.push(d.message)
          byLine.set(line.number, arr)
        }
        const deco: any[] = []
        for (const [lineNo, messages] of byLine) {
          const line = tr.state.doc.line(lineNo)
          const msg = messages.slice(0, 3).join(' • ') + (messages.length > 3 ? ` (+${messages.length - 3})` : '')
          deco.push(Decoration.widget({ widget: new LensWidget(msg), side: 1 }).range(line.to))
        }
        return Decoration.set(deco, true)
      }
      return value
    },
    provide: f => EditorView.decorations.from(f)
  })
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
    /* 调整 lint 标记的可视效果（备用） */
    '.cm-lintRange.cm-lintRange-error': {
      backgroundColor: 'rgba(255, 77, 79, 0.18)'
    },
    /* 行级红底 */
    '.cm-error-line': {
      backgroundColor: 'rgba(255, 77, 79, 0.18)'
    },
    /* Error Lens 行尾气泡 */
    '.cm-error-lens': {
      background: 'rgba(255, 77, 79, 0.9)',
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
