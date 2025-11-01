/*
 * 规则：tag_designer（未定义的国家标签引用检查）
 * 目标：
 *  - 检查以下模式中的国家标签是否在缓存的标签集合中存在：
 *    1) original_tag / tag / add_core_of / owner = TAG
 *    2) ROOT/XXX = { ... } / FROM/XXX = { ... }
 *    3) 任意键 = { ... target = TAG ... }
 *  - 若引用未定义，则提示错误“未定义的国家标签”。
 *
 * 说明：
 *  - 标签集合由 TagRegistry 提供，需确保已调用 ensureTagRegistry 刷新；
 *  - 当标签集合为空时，为避免误报暂不提示。
 */

import type { Rule, RuleResult, RuleContext } from '../types'
import { ensureTagRegistry } from '../../../composables/useTagRegistry'
import { getRegistry } from '../../../utils/TagRegistry'

const DIRECT_PATTERN = /\b(original_tag|tag|add_core_of|owner)\s*=\s*([A-Za-z0-9]{2,4})/gi
const SCOPE_PATTERN = /\b(ROOT|FROM)\/([A-Za-z0-9]{2,4})\s*=\s*\{/gi
const TARGET_PATTERN = /=[^{\n]*\{[^{}]*?target\s*=\s*([A-Za-z0-9]{2,4})/gis

const RESERVED_SCOPES = new Set([
  'THIS',
  'ROOT',
  'FROM',
  'PREV',
])

function findLineNumber(lineStarts: number[], pos: number): number {
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

function normalizeTag(raw: string): string {
  return raw.trim().toUpperCase()
}

function isReservedTag(tag: string): boolean {
  return RESERVED_SCOPES.has(tag)
}

function pushError(
  errors: RuleResult['errors'],
  ranges: RuleResult['ranges'],
  lineStarts: number[],
  lines: string[],
  position: number,
  message: string
) {
  const lineNumber = findLineNumber(lineStarts, position)
  const from = lineStarts[lineNumber - 1]
  const to = from + lines[lineNumber - 1].length
  errors.push({ line: lineNumber, msg: message, type: 'tag_designer' })
  ranges.push({ from, to, message, type: 'tag_designer', line: lineNumber })
}

export const tagDesignerRule: Rule = {
  name: 'tag_designer',
  apply(content: string, lines: string[], lineStarts: number[], _ctx?: RuleContext): RuleResult {
    const errors: RuleResult['errors'] = []
    const ranges: RuleResult['ranges'] = []

    // 确保注册表已刷新（容错处理）
    ensureTagRegistry().catch(() => {})
    const tagSet = getRegistry()
    if (!tagSet || tagSet.size === 0) {
      return { errors, ranges }
    }

    let match: RegExpExecArray | null

    // 1) 直接赋值模式
    while ((match = DIRECT_PATTERN.exec(content)) !== null) {
      const tag = normalizeTag(match[2])
      if (!isReservedTag(tag) && !tagSet.has(tag)) {
        pushError(errors, ranges, lineStarts, lines, match.index, `未定义的国家标签: ${tag}`)
      }
    }

    // 2) 作用域块模式
    while ((match = SCOPE_PATTERN.exec(content)) !== null) {
      const tag = normalizeTag(match[2])
      if (!isReservedTag(tag) && !tagSet.has(tag)) {
        pushError(errors, ranges, lineStarts, lines, match.index, `作用域引用未定义的国家标签: ${tag}`)
      }
    }

    // 3) target = TAG 模式
    while ((match = TARGET_PATTERN.exec(content)) !== null) {
      const tag = normalizeTag(match[1])
      if (!isReservedTag(tag) && !tagSet.has(tag)) {
        pushError(errors, ranges, lineStarts, lines, match.index, `target 引用了未定义的国家标签: ${tag}`)
      }
    }

    return { errors, ranges }
  }
}
