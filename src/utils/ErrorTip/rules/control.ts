/*
 * 规则：关键字 if / else / limit 后必须出现 = {（可换行），并且存在匹配的 }。
 * 若缺失任一条件则报错。
 */
import type { Rule, RuleResult } from '../types'

function findEqAndOpenCurly(doc: string, start: number): number {
  // 从 start 开始向后查找 '=' 与后续的 '{'，允许跨行和空白
  let i = start
  let sawEq = false
  let inLineComment = false
  while (i < doc.length) {
    const ch = doc[i]
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
    if (!sawEq) {
      if (ch === '=') {
        sawEq = true
      }
      i++
      continue
    }
    // 已遇到 '=', 跳过空白并寻找 '{'
    if (ch === '{') return i
    i++
  }
  return -1
}

function findMatchingClose(doc: string, openIndex: number): number {
  // 简易栈匹配，忽略行注释 #...\n
  let depth = 1
  let i = openIndex + 1
  let inLineComment = false

  while (i < doc.length) {
    const ch = doc[i]
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
    if (ch === '{') depth++
    else if (ch === '}') depth--
    if (depth === 0) return i
    i++
  }
  return -1
}

export const controlRule: Rule = {
  name: 'control',
  apply(content, lines, lineStarts): RuleResult {
    const errors = [] as RuleResult['errors']
    const ranges = [] as RuleResult['ranges']

    // 按行搜索关键字位置，再对全文进行跨行匹配
    const kwRegex = /\b(if|else|limit)\b/g

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineStart = lineStarts[i]
      const lineNumber = i + 1

      let m: RegExpExecArray | null
      kwRegex.lastIndex = 0
      while ((m = kwRegex.exec(line)) !== null) {
        const kwPosInLine = m.index
        const kwPosInDoc = lineStart + kwPosInLine

        const openIndex = findEqAndOpenCurly(content, kwPosInDoc)
        if (openIndex < 0) {
          errors.push({ line: lineNumber, msg: `${m[1]} 后须跟 '= {' 并有匹配的 '}'`, type: 'control' })
          const from = lineStart
          const to = from + line.length
          ranges.push({ from, to, message: `${m[1]} 需 '= {' 与 匹配 '}'`, type: 'control', line: lineNumber })
          continue
        }
        const closeIndex = findMatchingClose(content, openIndex)
        if (closeIndex < 0) {
          errors.push({ line: lineNumber, msg: `${m[1]} 缺少匹配的 '}'`, type: 'control' })
          const from = lineStart
          const to = from + line.length
          ranges.push({ from, to, message: `${m[1]} 缺少匹配的 '}'`, type: 'control', line: lineNumber })
        }
      }
    }

    return { errors, ranges }
  }
}
