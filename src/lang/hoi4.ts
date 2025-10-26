import { StreamLanguage } from '@codemirror/language'
import { StreamParser } from '@codemirror/language'

// HOI4 脚本语言的 StreamParser 实现
const hoi4Parser: StreamParser<any> = {
  startState: () => ({
    inComment: false
  }),
  
  token: (stream, _state) => {
    // 注释处理
    if (stream.match(/#.*/)) {
      return 'comment'
    }
    
    // 字符串处理
    if (stream.match(/"(?:[^"\\]|\\.)*"/)) {
      return 'string'
    }
    
    // 数字处理
    if (stream.match(/\b\d+(?:\.\d+)?\b/)) {
      return 'number'
    }
    
    // 关键字处理（HOI4 常用关键字）
    if (stream.match(/\b(yes|no|true|false|if|limit|AND|OR|NOT)\b/)) {
      return 'keyword'
    }
    
    // 属性名处理（等号前的标识符）
    if (stream.match(/[a-zA-Z_][a-zA-Z0-9_\.\-]*(?=\s*=)/)) {
      return 'propertyName'
    }
    
    // 操作符处理
    if (stream.match(/[=<>]/)) {
      return 'operator'
    }
    
    // 括号处理
    if (stream.match(/[{}[\]]/)) {
      return 'bracket'
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
