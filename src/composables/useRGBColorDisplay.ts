import { ref } from 'vue'
import { StateField, type EditorState } from '@codemirror/state'
import { EditorView, type DecorationSet, Decoration, WidgetType } from '@codemirror/view'
import { loadSettings } from '../api/tauri'

/**
 * RGB颜色信息接口
 */
export interface RGBColor {
  r: number
  g: number
  b: number
  start: number
  end: number
  text: string
}

/**
 * RGB颜色识别和显示Composable
 */
export function useRGBColorDisplay() {
  const enabled = ref(true)
  const rgbColors = ref<RGBColor[]>([])
  


  /**
   * 解析文本中的RGB颜色代码（性能优化版本）
   */
  function parseRGBColors(text: string): RGBColor[] {
    const rgbColors: RGBColor[] = []
    
    // 性能优化：预编译正则表达式，减少重复创建
    const rgbRegex = /RGB\s*\{\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*\}/g
    
    let match: RegExpExecArray | null
    let lastIndex = 0
    let iterationCount = 0
    const maxIterations = text.length / 10 // 限制最大迭代次数防止性能问题
    
    while ((match = rgbRegex.exec(text)) !== null) {
      // 性能保护：避免过长的匹配循环
      if (++iterationCount > maxIterations) {
        console.warn('RGB颜色解析：达到最大迭代次数，停止解析')
        break
      }
      
      const r = parseInt(match[1])
      const g = parseInt(match[2])
      const b = parseInt(match[3])
      
      // 验证RGB值范围
      if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
        const color: RGBColor = {
          r,
          g,
          b,
          start: match.index,
          end: match.index + match[0].length,
          text: match[0]
        }
        rgbColors.push(color)
      }
      
      // 性能优化：避免无限循环
      if (match.index === lastIndex) {
        rgbRegex.lastIndex++
      }
      lastIndex = match.index
    }
    
    return rgbColors
  }

  /**
   * 创建装饰器字段
   */
  function createRGBColorField() {
    return StateField.define<DecorationSet>({
      create(state: EditorState) {
        return getRGBColorDecorations(state)
      },
      update(value, tr) {
        // 映射已有装饰以适配文档变更
        value = value.map(tr.changes)
        
        // 实时重新计算装饰器，确保RGB显示实时更新
        value = getRGBColorDecorations(tr.state)
        
        // 同时更新rgbColors数组用于状态管理
        if (enabled.value) {
          const content = tr.state.doc.toString()
          rgbColors.value = parseRGBColors(content)
        } else {
          rgbColors.value = []
        }
        
        return value
      },
      provide: f => EditorView.decorations.from(f)
    })
  }

  /**
   * RGB颜色装饰器小部件
   */
  class RGBColorWidget extends WidgetType {
    constructor(
      readonly r: number,
      readonly g: number,
      readonly b: number
    ) {
      super()
    }

    eq(other: RGBColorWidget): boolean {
      return other.r === this.r && other.g === this.g && other.b === this.b
    }

    toDOM(): HTMLElement {
      const span = document.createElement('span')
      span.className = 'rgb-color-display'
      span.style.cssText = `
        display: inline-block;
        width: 14px;
        height: 14px;
        background-color: rgb(${this.r}, ${this.g}, ${this.b});
        border: 1px solid rgba(0, 0, 0, 0.3);
        border-radius: 2px;
        margin-left: 6px;
        margin-right: 6px;
        vertical-align: middle;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        transition: transform 0.1s ease;
      `
      span.title = `RGB(${this.r}, ${this.g}, ${this.b}) - 点击复制`
      
      // 添加点击复制功能
      span.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const rgbText = `RGB(${this.r}, ${this.g}, ${this.b})`
        if (navigator.clipboard) {
          navigator.clipboard.writeText(rgbText).then(() => {
            console.log('RGB颜色已复制:', rgbText)
          }).catch(() => {
            console.warn('复制RGB颜色失败')
          })
        }
      })
      
      // 添加悬停效果
      span.addEventListener('mouseenter', () => {
        span.style.transform = 'scale(1.2)'
      })
      
      span.addEventListener('mouseleave', () => {
        span.style.transform = 'scale(1)'
      })
      
      return span
    }

    ignoreEvent(): boolean {
      return false
    }
  }

  /**
   * 获取RGB颜色装饰器
   */
  function getRGBColorDecorations(state: EditorState): DecorationSet {
    if (!enabled.value) {
      return Decoration.none
    }

    const content = state.doc.toString()
    const colors = parseRGBColors(content)
    const decorations: any[] = []

    colors.forEach(color => {
      try {
        // 创建RGB颜色装饰器
        const decoration = Decoration.widget({
          widget: new RGBColorWidget(color.r, color.g, color.b),
          side: 1
        }).range(color.end)
        
        decorations.push(decoration)
      } catch (error) {
        console.warn('创建RGB颜色装饰器失败:', error)
      }
    })

    return Decoration.set(decorations)
  }

  /**
   * 加载设置
   */
  async function loadSettingsFromStorage() {
    try {
      const result = await loadSettings()
      if (result.success && result.data) {
        const data = result.data as any
        enabled.value = data.enableRGBColorDisplay !== false
      }
    } catch (error) {
      console.error('加载RGB颜色显示设置失败:', error)
    }
  }

  /**
   * 设置启用状态
   */
  function setEnabled(value: boolean) {
    enabled.value = value
  }

  /**
   * 获取启用状态
   */
  function getEnabled(): boolean {
    return enabled.value
  }

  return {
    enabled,
    rgbColors,
    parseRGBColors,
    createRGBColorField,
    setEnabled,
    getEnabled,
    loadSettingsFromStorage
  }
}