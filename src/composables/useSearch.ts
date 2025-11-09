import { ref } from 'vue'
import { searchFiles, type SearchResult as ApiSearchResult } from '../api/tauri'
import { logger } from '../utils/logger'

/**
 * 搜索结果接口
 */
export interface SearchResult {
  file: {
    name: string
    path: string
    isDirectory: boolean
  }
  line: number
  content: string
  matchStart: number
  matchEnd: number
}

export type SearchScope = 'project' | 'game'

/**
 * 搜索功能 Composable
 * 管理项目和游戏目录的搜索功能
 */
export function useSearch() {
  const searchQuery = ref('')
  const searchResults = ref<SearchResult[]>([])
  const isSearching = ref(false)
  const searchCaseSensitive = ref(false)
  const searchRegex = ref(false)
  const searchScope = ref<SearchScope>('project')
  
  /**
   * 将 API 搜索结果转换为本地格式
   */
  function convertApiSearchResult(apiResult: ApiSearchResult): SearchResult {
    return {
      file: {
        name: apiResult.file_name,
        path: apiResult.file_path,
        isDirectory: false
      },
      line: apiResult.line,
      content: apiResult.content,
      matchStart: apiResult.match_start,
      matchEnd: apiResult.match_end
    }
  }
  
  /**
   * 执行搜索
   */
  async function performSearch(searchPath: string) {
    if (!searchQuery.value.trim()) {
      searchResults.value = []
      return
    }
    
    if (!searchPath) {
      logger.error('搜索路径未设置')
      return
    }
    
    isSearching.value = true
    searchResults.value = []
    
    try {
      const result = await searchFiles(
        searchPath,
        searchQuery.value,
        searchCaseSensitive.value,
        searchRegex.value
      )
      
      if (result.success) {
        searchResults.value = result.results.map(convertApiSearchResult)
      } else {
        logger.error(`搜索失败: ${result.message}`)
      }
    } catch (error) {
      logger.error('搜索失败:', error)
    } finally {
      isSearching.value = false
    }
  }
  
  /**
   * 跳转到搜索结果（CodeMirror 6 版本）
   */
  function jumpToResult(result: SearchResult, editorView: any) {
    if (!editorView) return
    
    try {
      // 计算目标行
      const targetLine = Math.max(1, Math.min(result.line, editorView.state.doc.lines))
      const line = editorView.state.doc.line(targetLine)
      
      // 计算字符位置
      const matchStart = Math.max(0, Math.min(result.matchStart, line.length))
      const matchEnd = Math.max(matchStart, Math.min(result.matchEnd, line.length))
      const pos = line.from + matchStart
      const endPos = line.from + matchEnd
      
      // 跳转并选中
      editorView.dispatch({
        selection: { anchor: pos, head: endPos },
        scrollIntoView: true
      })
      editorView.focus()
    } catch (error) {
      logger.error('跳转到搜索结果失败:', error)
    }
  }
  
  /**
   * 清空搜索结果
   */
  function clearResults() {
    searchResults.value = []
    searchQuery.value = ''
  }
  
  return {
    searchQuery,
    searchResults,
    isSearching,
    searchCaseSensitive,
    searchRegex,
    searchScope,
    performSearch,
    jumpToResult,
    clearResults
  }
}
