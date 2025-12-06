declare module 'highlight.js' {
  /**
   * Highlight.js 语言和主题类型定义
   */
  
  export interface HighlightJS {
    /**
     * 高亮代码
     */
    highlight(code: string, options?: HighlightOptions): HighlightResult
    
    /**
     * 高亮自动检测语言
     */
    highlightAuto(code: string, languageSubset?: string[]): HighlightResult
    
    /**
     * 获取支持的语言列表
     */
    getSupportedLanguages(): string[]
    
    /**
     * 注册自定义语言
     */
    registerLanguage(name: string, languageDefinition: any): void
  }
  
  export interface HighlightOptions {
    language?: string
    ignoreIllegals?: boolean
    ignoreUnescaped?: boolean
    rehype?: boolean
  }
  
  export interface HighlightResult {
    value: string
    language?: string
    relevance?: number
    top?: any
  }
  
  export interface HLJSStatic extends HighlightJS {
    /**
     * 默认实例
     */
    readonly default: HighlightJS
  }
  
  const hljs: HLJSStatic
  export default hljs
  
  export const getLanguage: (name: string) => any
  export const registerLanguage: (name: string, languageDefinition: any) => void
}

// 高亮.js 核心语言
declare module 'highlight.js/lib/languages/json'
declare module 'highlight.js/lib/languages/yaml'
declare module 'highlight.js/lib/languages/bash'
declare module 'highlight.js/lib/languages/xml'
declare module 'highlight.js/lib/languages/css'
declare module 'highlight.js/lib/languages/javascript'
declare module 'highlight.js/lib/languages/typescript'

// 主题
declare module 'highlight.js/styles/github-dark.css'