declare module 'prismjs' {
  export interface Grammar {
    [key: string]: any
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
