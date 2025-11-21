import { EditorView, Decoration, type DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

const colors = [
  '#c678dd', // Purple
  '#61afef', // Blue
  '#e5c07b', // Yellow
  '#e06c75', // Red
  '#98c379', // Green
  '#56b6c2', // Cyan
]

// 属性名颜色序列
const propertyColors = [
  '#e06c75', // Red - Level 0
  '#d19a66', // Orange - Level 1
  '#e5c07b', // Yellow - Level 2
  '#98c379', // Green - Level 3
  '#56b6c2', // Cyan - Level 4
  '#61afef', // Blue - Level 5
]

// 使用 class 而不是内联样式
const bracketDecorations = colors.map((_, index) => Decoration.mark({
  class: `hoi4-bracket-${index}`
}))

const propertyDecorations = propertyColors.map((_, index) => Decoration.mark({
  class: `hoi4-property-${index}`
}))

// 创建主题扩展，确保样式优先级
export const rainbowTheme = EditorView.theme({
  '.hoi4-bracket-0': { color: `${colors[0]} !important`, fontWeight: 'bold' },
  '.hoi4-bracket-1': { color: `${colors[1]} !important`, fontWeight: 'bold' },
  '.hoi4-bracket-2': { color: `${colors[2]} !important`, fontWeight: 'bold' },
  '.hoi4-bracket-3': { color: `${colors[3]} !important`, fontWeight: 'bold' },
  '.hoi4-bracket-4': { color: `${colors[4]} !important`, fontWeight: 'bold' },
  '.hoi4-bracket-5': { color: `${colors[5]} !important`, fontWeight: 'bold' },
  
  '.hoi4-property-0': { color: `${propertyColors[0]} !important`, fontWeight: '500' },
  '.hoi4-property-1': { color: `${propertyColors[1]} !important`, fontWeight: '500' },
  '.hoi4-property-2': { color: `${propertyColors[2]} !important`, fontWeight: '500' },
  '.hoi4-property-3': { color: `${propertyColors[3]} !important`, fontWeight: '500' },
  '.hoi4-property-4': { color: `${propertyColors[4]} !important`, fontWeight: '500' },
  '.hoi4-property-5': { color: `${propertyColors[5]} !important`, fontWeight: '500' },
})

function isIdStart(code: number) {
  // a-z (97-122), A-Z (65-90), _ (95)
  return (code >= 97 && code <= 122) || (code >= 65 && code <= 90) || code === 95
}

function isIdBody(code: number) {
  // a-z, A-Z, _, 0-9 (48-57), . (46), - (45)
  return isIdStart(code) || (code >= 48 && code <= 57) || code === 46 || code === 45
}

function buildRainbowBrackets(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  let depth = 0
  let pos = 0
  
  let inString = false
  let inComment = false
  let lastChar = ''
  
  // 属性名追踪状态
  let lastWordStart = -1
  let lastWordEnd = -1
  let sawSpaceAfterWord = false

  const iter = view.state.doc.iter()
  
  while (!iter.done) {
    const value = iter.value
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i)
      const char = value[i]
      const currentPos = pos + i
      
      if (inComment) {
        if (char === '\n') {
          inComment = false
          // 重置单词追踪
          lastWordStart = -1; lastWordEnd = -1; sawSpaceAfterWord = false
        }
      } else if (inString) {
        if (char === '"' && lastChar !== '\\') {
          inString = false
          // 字符串结束后可能会有操作符，但字符串本身不能作为 propertyName (在 HOI4 中通常是 bareword)
          // 重置单词追踪
          lastWordStart = -1; lastWordEnd = -1; sawSpaceAfterWord = false
        }
      } else {
        // 正常代码区域
        
        // 1. 括号处理
        if (char === '{') {
          const colorIndex = depth % colors.length
          builder.add(currentPos, currentPos + 1, bracketDecorations[colorIndex])
          depth++
          
          // 重置单词追踪 (括号打断单词)
          lastWordStart = -1; lastWordEnd = -1; sawSpaceAfterWord = false
        } else if (char === '}') {
          depth--
          if (depth >= 0) {
            const colorIndex = depth % colors.length
            builder.add(currentPos, currentPos + 1, bracketDecorations[colorIndex])
          } else {
            depth = 0
          }
          
          // 重置单词追踪
          lastWordStart = -1; lastWordEnd = -1; sawSpaceAfterWord = false
        } else if (char === '#') {
          inComment = true
          lastWordStart = -1; lastWordEnd = -1; sawSpaceAfterWord = false
        } else if (char === '"') {
          inString = true
          lastWordStart = -1; lastWordEnd = -1; sawSpaceAfterWord = false
        } else if (char === '=') {
          // 2. 等号处理：检查是否有待高亮的属性名
          if (lastWordEnd !== -1) {
            // 找到了 "Key = " 结构
            const colorIndex = depth % colors.length
            // 注意：RangeSetBuilder 要求按顺序添加。
            // 我们必须确保 lastWordStart 大于上一个添加的 decoration end。
            // 由于我们只在 { 和 } 处添加 decoration，而 property name 中不包含这些字符，
            // 且 lastWordStart 肯定在当前 = 之前，且在最近一个 { 或 } 之后 (因为 {/} 会重置状态)，
            // 所以顺序应该是安全的。
            
            builder.add(lastWordStart, lastWordEnd, propertyDecorations[colorIndex])
          }
          
          // 重置
          lastWordStart = -1; lastWordEnd = -1; sawSpaceAfterWord = false
        } else {
          // 3. 单词追踪逻辑
          if (isIdBody(charCode)) {
            // 如果之前已经结束了一个单词并看到了空格，现在又开始一个新单词 -> 重置之前的
            if (lastWordEnd !== -1 && sawSpaceAfterWord) {
              lastWordStart = -1
              lastWordEnd = -1
              sawSpaceAfterWord = false
            }
            
            // 如果是新单词的开始
            if (lastWordStart === -1) {
              // 必须符合 IdStart 规则
              if (isIdStart(charCode)) {
                lastWordStart = currentPos
              }
            }
            
            // 仍在单词中，无需操作，等待单词结束
          } else {
            // 非 ID 字符 (空格或其他符号)
            
            // 刚刚结束一个单词
            if (lastWordStart !== -1 && lastWordEnd === -1) {
              lastWordEnd = currentPos
            }
            
            // 处理空格
            if (charCode === 32 || charCode === 9 || charCode === 10 || charCode === 13) { // Space, Tab, LF, CR
               if (lastWordEnd !== -1) {
                 sawSpaceAfterWord = true
               }
            } else {
               // 其他非空白字符 (如操作符等)，会打断属性名识别 (除了 =，上面已经处理了)
               // 例如 <, >, ! 等
               lastWordStart = -1; lastWordEnd = -1; sawSpaceAfterWord = false
            }
          }
        }
      }
      
      lastChar = char
    }
    pos += value.length
    iter.next()
  }
  
  return builder.finish()
}

export const rainbowBrackets = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor(view: EditorView) {
    this.decorations = buildRainbowBrackets(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged) {
      this.decorations = buildRainbowBrackets(update.view)
    }
  }
}, {
  decorations: v => v.decorations
})