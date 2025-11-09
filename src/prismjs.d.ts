declare module 'prismjs' {
  /**
   * Prism 语法规则类型
   */
  export type GrammarToken = RegExp | string | {
    pattern: RegExp
    lookbehind?: boolean
    greedy?: boolean
    alias?: string | string[]
    inside?: Grammar
  }

  export interface Grammar {
    [key: string]: GrammarToken | GrammarToken[] | Grammar
  }

  export const languages: {
    [key: string]: Grammar
  }

  export function highlight(
    text: string,
    grammar: Grammar,
    language: string
  ): string

  export default {
    languages,
    highlight
  }
}

declare module 'prismjs/themes/prism-tomorrow.css'
declare module 'prismjs/components/prism-json'
declare module 'prismjs/components/prism-yaml'
