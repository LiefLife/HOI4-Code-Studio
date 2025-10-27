/*
 * 规则：always = yes|no
 * 若值不是 yes/no，则报错。
 */
import type { Rule, RuleResult } from '../types'

export const alwaysRule: Rule = {
  name: 'always',
  apply(_content, lines, lineStarts): RuleResult {
    const errors = [] as RuleResult['errors']
    const ranges = [] as RuleResult['ranges']

    const regex = /\balways\s*=\s*([^\s;#{}]+)/g

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1
      let m: RegExpExecArray | null
      regex.lastIndex = 0
      while ((m = regex.exec(line)) !== null) {
        const value = (m[1] || '').trim().toLowerCase()
        if (value !== 'yes' && value !== 'no') {
          errors.push({ line: lineNumber, msg: `always 的值必须为 yes 或 no`, type: 'always' })
          const from = lineStarts[i]
          const to = from + line.length
          ranges.push({ from, to, message: `always 需为 yes/no`, type: 'always', line: lineNumber })
        }
      }
    }

    return { errors, ranges }
  }
}
