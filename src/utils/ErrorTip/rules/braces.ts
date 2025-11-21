/*
 * 规则：全局大括号配对检查
 * - 发现多余的 `}`：在该行报错
 * - 发现未闭合的 `{`：在其出现的行报错
 */
import type { Rule, RuleResult, RuleContext, Token } from '../types'
import { TokenType } from '../types'

export const bracesRule: Rule = {
  name: 'braces',
  apply(_content: string, _lines: string[], _lineStarts: number[], _ctx?: RuleContext, tokens?: Token[]): RuleResult {
    const errors: RuleResult['errors'] = []
    const ranges: RuleResult['ranges'] = []

    if (!tokens) return { errors, ranges }

    const stack: Token[] = []

    for (const token of tokens) {
      if (token.type !== TokenType.Operator) continue

      if (token.value === '{') {
        stack.push(token)
      } else if (token.value === '}') {
        if (stack.length === 0) {
          // 多余的 '}'
          errors.push({ line: token.line, msg: `多余的 '}'`, type: 'braces' })
          ranges.push({ 
            from: token.start, 
            to: token.end, 
            message: `多余的 '}'`, 
            type: 'braces', 
            line: token.line 
          })
        } else {
          stack.pop()
        }
      }
    }

    // 未闭合的 '{'
    for (const open of stack) {
      errors.push({ line: open.line, msg: `缺少匹配的 '}'`, type: 'braces' })
      ranges.push({ 
        from: open.start, 
        to: open.end, 
        message: `缺少匹配的 '}'`, 
        type: 'braces', 
        line: open.line 
      })
    }

    return { errors, ranges }
  }
}
