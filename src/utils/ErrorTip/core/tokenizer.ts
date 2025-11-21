/*
 * 词法分析器：将文本分解为 Token 流，并支持生成清洗后的文本（用于屏蔽字符串和注释干扰）
 */

export enum TokenType {
  Whitespace = 'Whitespace',
  Comment = 'Comment',
  String = 'String',
  Operator = 'Operator', // { } =
  Identifier = 'Identifier', // always, yes, no, etc.
  Other = 'Other'
}

export interface Token {
  type: TokenType
  value: string
  start: number // 全文偏移（包含）
  end: number   // 全文偏移（不包含）
  line: number  // 行号（1-based）
}

/**
 * 简单的词法分析器
 */
export function tokenize(content: string, lineStarts: number[]): Token[] {
  const tokens: Token[] = []
  let i = 0
  const len = content.length

  // 二分查找行号
  function getLine(pos: number): number {
    let lo = 0, hi = lineStarts.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const start = lineStarts[mid]
      const next = mid + 1 < lineStarts.length ? lineStarts[mid + 1] : Number.MAX_SAFE_INTEGER
      if (pos < start) hi = mid - 1
      else if (pos >= next) lo = mid + 1
      else return mid + 1
    }
    return Math.max(1, Math.min(lineStarts.length, lo + 1))
  }

  while (i < len) {
    const char = content[i]
    const start = i

    // 1. 空白
    if (/\s/.test(char)) {
      while (i < len && /\s/.test(content[i])) {
        i++
      }
      tokens.push({
        type: TokenType.Whitespace,
        value: content.slice(start, i),
        start,
        end: i,
        line: getLine(start)
      })
      continue
    }

    // 2. 注释 (#)
    if (char === '#') {
      while (i < len && content[i] !== '\n' && content[i] !== '\r') {
        i++
      }
      tokens.push({
        type: TokenType.Comment,
        value: content.slice(start, i),
        start,
        end: i,
        line: getLine(start)
      })
      continue
    }

    // 3. 字符串 (")
    if (char === '"') {
      i++ // skip start quote
      while (i < len) {
        if (content[i] === '"') {
          i++ // skip end quote
          break
        }
        // 处理转义字符（尽管 HOI4 脚本很少用，但为了健壮性）
        if (content[i] === '\\' && i + 1 < len) {
          i += 2
        } else {
          i++
        }
      }
      tokens.push({
        type: TokenType.String,
        value: content.slice(start, i),
        start,
        end: i,
        line: getLine(start)
      })
      continue
    }

    // 4. 操作符
    if (char === '{' || char === '}' || char === '=') {
      i++
      tokens.push({
        type: TokenType.Operator,
        value: char,
        start,
        end: i,
        line: getLine(start)
      })
      continue
    }

    // 5. 标识符或其他
    // 匹配直到遇到空白、#、"、{、}、=
    while (i < len) {
      const c = content[i]
      if (/\s/.test(c) || c === '#' || c === '"' || c === '{' || c === '}' || c === '=') {
        break
      }
      i++
    }
    if (i > start) {
      tokens.push({
        type: TokenType.Identifier,
        value: content.slice(start, i),
        start,
        end: i,
        line: getLine(start)
      })
    } else {
      // 防御性逻辑：如果上面没匹配到任何东西（理论上不会），强制前进一步
      i++
    }
  }

  return tokens
}

/**
 * 生成清洗后的内容：
 * - 保持长度不变
 * - 将注释内容替换为空格
 * - 将字符串内容（包括引号）替换为空格
 * 这样正则匹配时可以使用原始索引，且不会匹配到注释或字符串内部的内容
 */
export function generateCleanContent(content: string): string {
  let result = ''
  let i = 0
  const len = content.length

  while (i < len) {
    const char = content[i]

    // 注释
    if (char === '#') {
      const start = i
      while (i < len && content[i] !== '\n' && content[i] !== '\r') {
        i++
      }
      // 替换为空格
      result += ' '.repeat(i - start)
      continue
    }

    // 字符串
    if (char === '"') {
      const start = i
      i++ 
      while (i < len) {
        if (content[i] === '"') {
          i++
          break
        }
        if (content[i] === '\\' && i + 1 < len) {
          i += 2
        } else {
          i++
        }
      }
      // 替换为空格
      result += ' '.repeat(i - start)
      continue
    }

    result += char
    i++
  }

  return result
}
