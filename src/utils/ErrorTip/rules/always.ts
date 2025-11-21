/*
 * 规则：always = yes|no
 * 若值不是 yes/no，则报错。
 */
import type { Rule, RuleResult, RuleContext } from '../types'

export const alwaysRule: Rule = {
  name: 'always',
  apply(_content: string, lines: string[], lineStarts: number[], _ctx?: RuleContext): RuleResult {
    const errors: RuleResult['errors'] = []
    const ranges: RuleResult['ranges'] = []

    // 这里的 lines 已经是 cleanContent 切分后的，字符串和注释都变为空格了
    // 正则匹配到的位置在原始文本中也是有效的
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
          
          // 计算精确范围：只高亮值部分
          // m.index 是匹配起始（always...），m[0] 是完整匹配串
          // 值在匹配串的末尾（由 regex 结构保证）
          const matchStart = lineStarts[i] + m.index
          const matchEnd = matchStart + m[0].length
          const valLen = m[1].length
          const from = matchEnd - valLen
          const to = matchEnd
          
          ranges.push({ from, to, message: `always 需为 yes/no`, type: 'always', line: lineNumber })
        }
      }
    }

    return { errors, ranges }
  }
}
