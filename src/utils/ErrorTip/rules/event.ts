/*
 * 规则：事件块校验
 * - 识别 country_event = { ... } 块
 * - 在该块内校验：必须存在 title = ... 与 desc = ...（忽略行注释 #...）
 * - 其它事件类型暂不强制校验（可拓展）
 */
import type { Rule, RuleResult, RuleContext } from '../types'

function findEqAndOpenCurly(doc: string, start: number): number {
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
    if (ch === '#') { inLineComment = true; i++; continue }
    if (!sawEq) { if (ch === '=') sawEq = true; i++; continue }
    if (ch === '{') return i
    i++
  }
  return -1
}

function findMatchingClose(doc: string, openIndex: number): number {
  let depth = 1
  let i = openIndex + 1
  let inLineComment = false
  while (i < doc.length) {
    const ch = doc[i]
    if (inLineComment) { if (ch === '\n') inLineComment = false; i++; continue }
    if (ch === '#') { inLineComment = true; i++; continue }
    if (ch === '{') depth++
    else if (ch === '}') depth--
    if (depth === 0) return i
    i++
  }
  return -1
}

export const eventRule: Rule = {
  name: 'event',
  apply(content: string, lines: string[], lineStarts: number[], _ctx?: RuleContext): RuleResult {
    const errors = [] as RuleResult['errors']
    const ranges = [] as RuleResult['ranges']

    // 按行定位关键字 "country_event"，逐个进行跨行块匹配
    const kw = /\bcountry_event\b/g

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineStart = lineStarts[i]
      const lineNumber = i + 1

      let m: RegExpExecArray | null
      kw.lastIndex = 0
      while ((m = kw.exec(line)) !== null) {
        const kwPosInDoc = lineStart + m.index
        const openIndex = findEqAndOpenCurly(content, kwPosInDoc)
        if (openIndex < 0) {
          // 无需在此报错，交由 controlRule 处理 if/else/limit。这里更专注事件块内容。
          continue
        }
        // 若该 country_event 块处于更高层级（被其它 { } 包裹），则不校验 title/desc
        // 计算 openIndex 之前的大括号深度（忽略 # 注释）
        {
          let depth = 0
          let j = 0
          let inLineComment = false
          while (j < openIndex) {
            const ch2 = content[j]
            if (inLineComment) {
              if (ch2 === '\n') inLineComment = false
              j++
              continue
            }
            if (ch2 === '#') { inLineComment = true; j++; continue }
            if (ch2 === '{') depth++
            else if (ch2 === '}') depth--
            j++
          }
          if (depth > 0) {
            // 嵌套块内的 country_event：跳过校验
            continue
          }
        }
        const closeIndex = findMatchingClose(content, openIndex)
        if (closeIndex < 0) {
          // 缺失闭合，交由 braces/control 规则处理。
          continue
        }

        // 解析块内部内容（忽略注释）
        const blockBody = content.slice(openIndex + 1, closeIndex)
        const bodyNoComments = blockBody
          .split('\n')
          .map(l => l.split('#', 1)[0])
          .join('\n')

        const hasTitle = /\btitle\s*=\s*([^#\n{}]+)/.test(bodyNoComments)
        const hasDesc = /\bdesc\s*=\s*([^#\n{}]+)/.test(bodyNoComments)

        if (!hasTitle) {
          const from = lineStart
          const to = from + line.length
          errors.push({ line: lineNumber, msg: `country_event 缺少 title`, type: 'event' })
          ranges.push({ from, to, message: `country_event 缺少 title`, type: 'event', line: lineNumber })
        }
        if (!hasDesc) {
          const from = lineStart
          const to = from + line.length
          errors.push({ line: lineNumber, msg: `country_event 缺少 desc`, type: 'event' })
          ranges.push({ from, to, message: `country_event 缺少 desc`, type: 'event', line: lineNumber })
        }
      }
    }

    return { errors, ranges }
  }
}
