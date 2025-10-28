/*
 * 规则：严格限定在项目根下的 ./events 目录内生效
 * 要求：在使用 id = X.Y 之前，必须先在本文件中（且在该行之前）声明 add_namespace = X
 */
import type { Rule, RuleResult, RuleContext } from '../types'

function normalize(p?: string): string {
  if (!p) return ''
  return p.replace(/\\/g, '/').toLowerCase()
}

export const namespaceRule: Rule = {
  name: 'namespace',
  apply(_content: string, lines: string[], lineStarts: number[], ctx?: RuleContext): RuleResult {
    const errors = [] as RuleResult['errors']
    const ranges = [] as RuleResult['ranges']

    const filePath = normalize(ctx?.filePath)
    const projectRoot = normalize(ctx?.projectRoot)

    if (!filePath || !projectRoot) {
      return { errors, ranges }
    }

    // 严格限定：projectRoot + '/events/' 前缀
    const rootWithSlash = projectRoot.endsWith('/') ? projectRoot : projectRoot + '/'
    const eventsPrefix = rootWithSlash + 'events/'
    if (!filePath.startsWith(eventsPrefix)) {
      return { errors, ranges }
    }

    // 自上而下扫描：收集声明行号，校验使用行
    const declaredLine: Record<string, number> = {}

    for (let i = 0; i < lines.length; i++) {
      // 去除行注释
      const raw = lines[i]
      const line = raw.split('#', 1)[0]
      const lineNumber = i + 1
      const from = lineStarts[i]
      const to = from + raw.length

      // add_namespace = X
      {
        const m = /\badd_namespace\s*=\s*([A-Za-z0-9_]+)/.exec(line)
        if (m) {
          const ns = m[1]
          if (!(ns in declaredLine)) {
            declaredLine[ns] = lineNumber
          }
        }
      }

      // id = X.Y
      {
        const m = /\bid\s*=\s*([A-Za-z0-9_]+)\.[A-Za-z0-9_]+/.exec(line)
        if (m) {
          const ns = m[1]
          const declaredAt = declaredLine[ns]
          if (!declaredAt || declaredAt >= lineNumber) {
            errors.push({ line: lineNumber, msg: `命名空间 '${ns}' 未在此行之前声明`, type: 'namespace' })
            ranges.push({ from, to, message: `命名空间 '${ns}' 未在此行之前声明`, type: 'namespace', line: lineNumber })
          }
        }
      }
    }

    return { errors, ranges }
  }
}
