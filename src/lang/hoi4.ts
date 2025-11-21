import { StreamLanguage } from '@codemirror/language'
import { StreamParser } from '@codemirror/language'

// HOI4 脚本语言的 StreamParser 实现
const hoi4Parser: StreamParser<any> = {
  startState: () => ({
    inComment: false,
    expectValue: false
  }),
  
  token: (stream, state) => {
    // 空白字符处理
    if (stream.eatSpace()) return null

    // 注释处理
    if (stream.match(/#.*/)) {
      return 'comment'
    }
    
    // 字符串处理
    if (stream.match(/"(?:[^"\\]|\\.)*"/)) {
      state.expectValue = false
      return 'string'
    }
    
    // 关键字处理（HOI4 常用关键字）
    if (stream.match(/\b(yes|no|true|false|if|limit|AND|OR|NOT)\b/)) {
      state.expectValue = false
      return 'keyword'
    }
    
    // 属性名处理（等号前的标识符）
    // 注意：属性名的层级颜色由 rainbowBrackets ViewPlugin 处理
    if (stream.match(/[a-zA-Z_][a-zA-Z0-9_\.\-]*(?=\s*=)/)) {
      state.expectValue = false
      return 'propertyName'
    }
    
    // 操作符处理
    if (stream.match('=')) {
      state.expectValue = true
      return 'operator'
    }
    if (stream.match(/[<>]/)) {
      state.expectValue = true
      return 'operator'
    }
    
    // 括号处理
    if (stream.match(/[{}[\]]/)) {
      state.expectValue = false
      return 'bracket'
    }

    // 值标识符处理 (在 = 之后)
    if (state.expectValue && stream.match(/[a-zA-Z_][a-zA-Z0-9_\.\-]*/)) {
      state.expectValue = false
      return 'string'
    }

    // 通用标识符处理
    if (stream.match(/[a-zA-Z_][a-zA-Z0-9_\.\-]*/)) {
      state.expectValue = false
      return null
    }
    
    // 数字处理
    if (stream.match(/\b\d+(?:\.\d+)?\b/)) {
      state.expectValue = false
      return 'number'
    }
    
    // 其他字符
    stream.next()
    return null
  }
}

// 导出 HOI4 语言扩展
export function hoi4() {
  return StreamLanguage.define(hoi4Parser)
}
