/*
 * 规则：is_* = yes|no
 * 但若 * 中包含 with / for / of 任意字样（大小写不敏感），则忽略该条（不计入计算）。
 */
import type { Rule, RuleResult, RuleContext } from '../types'

export const isRule: Rule = {
  name: 'is',
  apply(_content: string, lines: string[], lineStarts: number[], _ctx?: RuleContext): RuleResult {
    const errors = [] as RuleResult['errors']
    const ranges = [] as RuleResult['ranges']

    const regex = /\bis_([A-Za-z0-9_.]+)\s*=\s*([^\s;#{}]+)/g

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1
      let m: RegExpExecArray | null
      regex.lastIndex = 0
      while ((m = regex.exec(line)) !== null) {
        const suffix = (m[1] || '').toLowerCase()
        // 若后缀包含 with/for/of 任一字样，则不计入
        if (suffix.includes('with')
            || suffix.includes('for')
            || suffix.includes('of')
            || suffix.includes('for') 
            || suffix.includes('by') 
            || suffix.includes('to') 
            || suffix.includes('from') 
            || suffix.includes('with') ) {
          continue
        }
        const value = (m[2] || '').trim().toLowerCase()
        if (value !== 'yes' && value !== 'no') {
          errors.push({ line: lineNumber, msg: `is_* 的值必须为 yes 或 no`, type: 'is' })
          const from = lineStarts[i]
          const to = from + line.length
          ranges.push({ from, to, message: `is_* 需为 yes/no`, type: 'is', line: lineNumber })
        }
      }
    }

    return { errors, ranges }
  }
}
