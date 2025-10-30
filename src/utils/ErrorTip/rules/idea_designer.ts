/*
 * 规则：idea_designer（未定义的 idea 引用检查）
 * 目标：
 *  - 扫描文本中对 idea 的引用：
 *    1) add_ideas = X
 *    2) add_timed_idea = { ... idea = X ... }
 *  - 校验 X 是否在 ./common/ideas 下的 ideas = { country = { X = { ... } } } 中定义
 *  - 若未定义则报错：“未定义的idea”
 *
 * 说明：
 *  - 实际 ideas 定义跨项目根与游戏根由 IdeaRegistry 预先扫描并缓存；
 *  - 当尚未完成扫描或未获取到任何 idea 时，为避免误报，本规则将暂不报错；
 *  - 仅忽略行内注释 #...，不处理复杂嵌套（足以覆盖常见写法）。
 */
import type { Rule, RuleResult, RuleContext } from '../types'
import { getRegistry } from '../../IdeaRegistry'

function findLineNumber(lineStarts: number[], pos: number): number {
  // 基于 lineStarts 二分查找定位行号（1-based）
  let lo = 0
  let hi = lineStarts.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const start = lineStarts[mid]
    const next = mid + 1 < lineStarts.length ? lineStarts[mid + 1] : Number.MAX_SAFE_INTEGER
    if (pos < start) hi = mid - 1
    else if (pos >= next) lo = mid + 1
    else return mid + 1
  }
  return lineStarts.length
}

export const ideaDesignerRule: Rule = {
  name: 'idea_designer',
  apply(content: string, lines: string[], lineStarts: number[], _ctx?: RuleContext): RuleResult {
    const errors = [] as RuleResult['errors']
    const ranges = [] as RuleResult['ranges']

    // 若注册表为空（扫描未完成），避免误报
    const reg = getRegistry()
    if (!reg || reg.size === 0) {
      return { errors, ranges }
    }

    // 1) add_ideas = X（全局匹配，忽略行注释后效果更佳，这里直接匹配原文以简化实现）
    {
      const re = /\badd_ideas\s*=\s*([A-Za-z0-9_\.-]+)/g
      let m: RegExpExecArray | null
      while ((m = re.exec(content)) !== null) {
        const ideaId = m[1]
        // 捕获 group 起始位置（近似计算）：在 m[0] 内定位 idea = X
        const sub = m[0]
        const mm = /\badd_ideas\s*=\s*([A-Za-z0-9_\.-]+)/.exec(sub)
        const absPos = m.index + (mm ? mm.index : 0)
        const lineNumber = findLineNumber(lineStarts, absPos)
        const from = lineStarts[lineNumber - 1]
        const to = from + lines[lineNumber - 1].length

        if (!reg.has(ideaId)) {
          errors.push({ line: lineNumber, msg: '未定义的idea', type: 'idea_designer' })
          ranges.push({ from, to, message: '未定义的idea', type: 'idea_designer', line: lineNumber })
        }
      }
    }

    // 2) add_timed_idea = { ... idea = X ... }
    {
      const re = /\badd_timed_idea\s*=\s*\{[^{}]*?\bidea\s*=\s*([A-Za-z0-9_\.-]+)[^{}]*?\}/gs
      let m: RegExpExecArray | null
      while ((m = re.exec(content)) !== null) {
        const sub = m[0]
        const mm = /\bidea\s*=\s*([A-Za-z0-9_\.-]+)/.exec(sub)
        if (!mm) continue
        const ideaId = mm[1]
        const absPos = m.index + mm.index
        const lineNumber = findLineNumber(lineStarts, absPos)
        const from = lineStarts[lineNumber - 1]
        const to = from + lines[lineNumber - 1].length

        if (!reg.has(ideaId)) {
          errors.push({ line: lineNumber, msg: '未定义的idea', type: 'idea_designer' })
          ranges.push({ from, to, message: '未定义的idea', type: 'idea_designer', line: lineNumber })
        }
      }
    }

    return { errors, ranges }
  }
}
