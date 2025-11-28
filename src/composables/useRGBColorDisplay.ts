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
  a: number
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
  
  // 性能优化：将正则表达式移到函数外部，避免重复创建
  // 支持空格和逗号作为分隔符，如 RGB{255 100 50} 或 RGB{255,100,50}
  const rgbRegex = /RGB\s*\{\s*(\d{1,3})\s*[,\s]+(\d{1,3})\s*[,\s]+(\d{1,3})\s*\}/g
  const rgbaRegex = /RGBA\s*\{\s*(\d{1,3})\s*[,\s]+(\d{1,3})\s*[,\s]+(\d{1,3})\s*[,\s]+(\d{1,3})\s*\}/g

  /**
   * 解析文本中的RGB/RGBA颜色代码（性能优化版本）
   */
  function parseRGBColors(text: string): RGBColor[] {
    const rgbColors: RGBColor[] = []
    
    // 重置正则表达式的lastIndex
    rgbRegex.lastIndex = 0
    rgbaRegex.lastIndex = 0
    
    let match: RegExpExecArray | null
    let lastIndex = 0
    let iterationCount = 0
    const maxIterations = text.length / 10 // 限制最大迭代次数防止性能问题
    
    // 匹配RGB颜色
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
          a: 255, // 默认不透明
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
    
    // 匹配RGBA颜色
    lastIndex = 0
    while ((match = rgbaRegex.exec(text)) !== null) {
      // 性能保护：避免过长的匹配循环
      if (++iterationCount > maxIterations) {
        console.warn('RGBA颜色解析：达到最大迭代次数，停止解析')
        break
      }
      
      const r = parseInt(match[1])
      const g = parseInt(match[2])
      const b = parseInt(match[3])
      const a = parseInt(match[4])
      
      // 验证RGB值范围
      if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255 && a >= 0 && a <= 255) {
        const color: RGBColor = {
          r,
          g,
          b,
          a,
          start: match.index,
          end: match.index + match[0].length,
          text: match[0]
        }
        rgbColors.push(color)
      }
      
      // 性能优化：避免无限循环
      if (match.index === lastIndex) {
        rgbaRegex.lastIndex++
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
        // 只有当文档内容发生变化时，才重新计算装饰器
        if (tr.docChanged) {
          // 直接重新计算装饰器，不需要先映射
          value = getRGBColorDecorations(tr.state)
          
          // 同时更新rgbColors数组用于状态管理
          if (enabled.value) {
            const content = tr.state.doc.toString()
            rgbColors.value = parseRGBColors(content)
          } else {
            rgbColors.value = []
          }
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
      readonly b: number,
      readonly a: number = 255
    ) {
      super()
    }

    eq(other: RGBColorWidget): boolean {
      return other.r === this.r && other.g === this.g && other.b === this.b && other.a === this.a
    }

    toDOM(): HTMLElement {
      const span = document.createElement('span')
      span.className = 'rgb-color-display'
      
      // 根据alpha值决定使用rgb还是rgba
      const isRgba = this.a < 255
      const bgColor = isRgba 
        ? `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a / 255})` 
        : `rgb(${this.r}, ${this.g}, ${this.b})`
      
      // 使用CSS类代替内联样式，提高性能和可维护性
      span.style.backgroundColor = bgColor
      span.title = isRgba 
        ? `RGBA(${this.r}, ${this.g}, ${this.b}, ${this.a}) - 点击复制` 
        : `RGB(${this.r}, ${this.g}, ${this.b}) - 点击复制`
      
      // 添加点击复制功能 - 使用一次性事件监听器模式，避免内存泄漏
      const handleClick = (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        // 只复制数值部分，不包含RGB/RGBA前缀和括号
        const colorText = isRgba 
          ? `${this.r},${this.g},${this.b},${this.a}` 
          : `${this.r},${this.g},${this.b}`
        
        if (navigator.clipboard) {
          navigator.clipboard.writeText(colorText).then(() => {
            // 添加复制成功的视觉反馈
            span.style.transform = 'scale(1.4)'
            setTimeout(() => {
              span.style.transform = ''
            }, 200)
          }).catch(() => {
            console.warn('复制RGB颜色失败')
          })
        }
      }
      
      // 使用事件委托或一次性事件监听器，避免内存泄漏
      span.addEventListener('click', handleClick, { once: false })
      
      return span
    }

    destroy(dom: HTMLElement): void {
      // 清理事件监听器，避免内存泄漏
      dom.replaceWith(dom.cloneNode(true))
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
        // 创建RGB颜色装饰器，传递alpha通道值
        const decoration = Decoration.widget({
          widget: new RGBColorWidget(color.r, color.g, color.b, color.a),
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