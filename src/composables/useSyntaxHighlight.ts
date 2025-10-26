import { ref, nextTick } from 'vue'
import Prism from 'prismjs'
import { getBracketDepths } from '../api/tauri'

/**
 * 语法高亮 Composable
 * 管理代码的语法高亮和括号分级高亮
 */
export function useSyntaxHighlight() {
  const highlightedCode = ref('')
  const showHighlight = ref(false)
  const highlightRef = ref<HTMLPreElement | null>(null)
  
  /**
   * 获取文件语言类型
   */
  function getLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'json': return 'json'
      case 'yml': case 'yaml': return 'yaml'
      case 'mod': return 'mod' // .mod 文件使用自定义语法
      case 'txt': return 'hoi4' // .txt 文件使用 HOI4 脚本语法
      default: return 'plaintext'
    }
  }
  
  /**
   * 获取括号颜色 class
   */
  function getBraceClass(depth: number): string {
    const level = ((depth - 1) % 6 + 6) % 6 + 1
    return `brace-depth-${level}`
  }
  
  /**
   * 清除已有的括号高亮
   */
  function clearBraceHighlight(codeEl: HTMLElement) {
    const highlightedBraces = codeEl.querySelectorAll('.brace-bracket')
    highlightedBraces.forEach((span) => {
      const text = span.textContent ?? ''
      span.replaceWith(document.createTextNode(text))
    })
  }
  
  /**
   * 应用括号分级高亮（使用Rust后端算法）
   */
  async function applyBraceHighlight(fileContent: string) {
    if (!showHighlight.value || !highlightRef.value) return
    const codeEl = highlightRef.value.querySelector('code')
    if (!codeEl) return

    clearBraceHighlight(codeEl)

    try {
      // 使用Rust后端获取括号深度映射
      const depthMap = await getBracketDepths(fileContent)
      
      const walker = document.createTreeWalker(codeEl, NodeFilter.SHOW_TEXT)
      const textNodes: Text[] = []

      while (walker.nextNode()) {
        const node = walker.currentNode as Text
        if (node.nodeValue && (node.nodeValue.includes('{') || node.nodeValue.includes('}'))) {
          textNodes.push(node)
        }
      }

      let charIndex = 0

      textNodes.forEach((node) => {
        const parentElement = node.parentElement
        if (parentElement && (parentElement.closest('.token.string') || parentElement.closest('.token.comment'))) {
          charIndex += node.nodeValue?.length || 0
          return
        }

        const text = node.nodeValue ?? ''
        const fragment = document.createDocumentFragment()

        for (const char of text) {
          if (char === '{' || char === '}') {
            const depth = depthMap[charIndex] || 1
            const span = document.createElement('span')
            span.className = `brace-bracket ${getBraceClass(depth)}`
            span.textContent = char
            fragment.appendChild(span)
          } else {
            fragment.appendChild(document.createTextNode(char))
          }
          charIndex++
        }

        node.replaceWith(fragment)
      })
    } catch (error) {
      console.error('括号高亮失败:', error)
    }
  }
  
  /**
   * 高亮代码
   */
  function highlightCode(
    fileContent: string,
    fileName: string,
    txtErrors: Array<{line: number, msg: string, type: string}> = []
  ) {
    const language = getLanguage(fileName)
    
    // 如果是纯文本，不使用高亮
    if (language === 'plaintext') {
      showHighlight.value = false
      return
    }
    
    try {
      const grammar = Prism.languages[language]
      if (grammar) {
        let highlighted = Prism.highlight(fileContent, grammar, language)
        // 保留末尾换行，避免 split 丢失空行
        if (fileContent.endsWith('\n')) {
          highlighted += '\n'
        }
        const contentLines = fileContent.split('\n')
        const highlightLines = highlighted.split('\n')
        const normalized = contentLines.map((_, index) => {
          let lineHtml = highlightLines[index] ?? ''
          if (lineHtml.length === 0) {
            lineHtml = '<span class="line-placeholder">&nbsp;</span>'
          }
          return lineHtml
        })

        // 为有错误的行添加错误高亮
        if (language === 'hoi4' && txtErrors.length > 0) {
          txtErrors.forEach(error => {
            const lineIndex = error.line - 1
            if (normalized[lineIndex]) {
              normalized[lineIndex] = `<div class="error-line">${normalized[lineIndex]}</div>`
            }
          })
        }

        highlightedCode.value = normalized.join('\n')
        showHighlight.value = true
        nextTick(() => {
          applyBraceHighlight(fileContent)
        })
      } else {
        showHighlight.value = false
      }
    } catch (error) {
      console.error('语法高亮失败:', error)
      showHighlight.value = false
    }
  }
  
  return {
    highlightedCode,
    showHighlight,
    highlightRef,
    highlightCode,
    applyBraceHighlight,
    getLanguage
  }
}
