/*
 * 规则：全局大括号配对检查（忽略行注释 `#...`）
 * - 发现多余的 `}`：在该行报错
 * - 发现未闭合的 `{`：在其出现的行报错
 */
import type { Rule, RuleResult, RuleContext } from '../types'

function getLineFromIndex(lineStarts: number[], index: number): number {
  // 二分查找 index 所在的行号（1-based）
  let lo = 0, hi = lineStarts.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const start = lineStarts[mid]
    const next = mid + 1 < lineStarts.length ? lineStarts[mid + 1] : Number.MAX_SAFE_INTEGER
    if (index < start) hi = mid - 1
    else if (index >= next) lo = mid + 1
    else return mid + 1
  }
  return Math.max(1, Math.min(lineStarts.length, lo + 1))
}

export const bracesRule: Rule = {
  name: 'braces',
  apply(content: string, lines: string[], lineStarts: number[], _ctx?: RuleContext): RuleResult {
    const errors = [] as RuleResult['errors']
    const ranges = [] as RuleResult['ranges']

    const stack: { index: number }[] = []
    let i = 0
    let inLineComment = false

    while (i < content.length) {
      const ch = content[i]
      if (inLineComment) {
        if (ch === '\n') inLineComment = false
        i++
        continue
      }
      if (ch === '#') {
        inLineComment = true
        i++
        continue
      }
      if (ch === '{') {
        stack.push({ index: i })
      } else if (ch === '}') {
        if (stack.length === 0) {
          // 多余的 '}'
          const lineNumber = getLineFromIndex(lineStarts, i)
          const from = lineStarts[lineNumber - 1]
          const to = from + lines[lineNumber - 1].length
          errors.push({ line: lineNumber, msg: `多余的 '}'`, type: 'braces' })
          ranges.push({ from, to, message: `多余的 '}'`, type: 'braces', line: lineNumber })
        } else {
          stack.pop()
        }
      }
      i++
    }

    // 未闭合的 '{'
    for (const open of stack) {
      const lineNumber = getLineFromIndex(lineStarts, open.index)
      const from = lineStarts[lineNumber - 1]
      const to = from + lines[lineNumber - 1].length
      errors.push({ line: lineNumber, msg: `缺少匹配的 '}'`, type: 'braces' })
      ranges.push({ from, to, message: `缺少匹配的 '}'`, type: 'braces', line: lineNumber })
    }

    return { errors, ranges }
  }
}
