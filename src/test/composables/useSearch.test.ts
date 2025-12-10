/**
 * useSearch composable 的单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSearch, type SearchScope } from '../../../src/composables/useSearch'

// 模拟 Tauri API
vi.mock('../../../src/api/tauri', () => ({
  searchFiles: vi.fn()
}))

// 模拟 logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    error: vi.fn()
  }
}))

import { searchFiles } from '../../../src/api/tauri'
import { logger } from '../../../src/utils/logger'

describe('useSearch', () => {
  let search: ReturnType<typeof useSearch>

  beforeEach(() => {
    vi.clearAllMocks()
    search = useSearch()
  })

  it('应该正确初始化状态', () => {
    expect(search.searchQuery.value).toBe('')
    expect(search.searchResults.value).toEqual([])
    expect(search.isSearching.value).toBe(false)
    expect(search.searchCaseSensitive.value).toBe(false)
    expect(search.searchRegex.value).toBe(false)
    expect(search.searchScope.value).toBe('project')
    expect(search.includeAllFiles.value).toBe(false)
  })

  it('应该能够设置搜索查询', () => {
    // 设置搜索查询
    search.searchQuery.value = 'test query'
    expect(search.searchQuery.value).toBe('test query')
    
    // 清空搜索查询
    search.searchQuery.value = ''
    expect(search.searchQuery.value).toBe('')
  })

  it('应该能够设置搜索选项', () => {
    // 设置区分大小写
    search.searchCaseSensitive.value = true
    expect(search.searchCaseSensitive.value).toBe(true)
    
    // 设置正则表达式
    search.searchRegex.value = true
    expect(search.searchRegex.value).toBe(true)
    
    // 设置搜索范围
    search.searchScope.value = 'game' as SearchScope
    expect(search.searchScope.value).toBe('game')
    
    // 设置包含所有文件
    search.includeAllFiles.value = true
    expect(search.includeAllFiles.value).toBe(true)
  })

  it('应该能够执行搜索', async () => {
    // 模拟 searchFiles 返回结果
    const mockApiResults = [
      {
        file_name: 'test1.txt',
        file_path: '/path/to/test1.txt',
        line: 1,
        content: 'Test line 1',
        match_start: 0,
        match_end: 4
      },
      {
        file_name: 'test2.txt',
        file_path: '/path/to/test2.txt',
        line: 3,
        content: 'Another test line',
        match_start: 8,
        match_end: 12
      }
    ]
    
    vi.mocked(searchFiles).mockResolvedValue({
      success: true,
      results: mockApiResults,
      message: ''
    })
    
    // 设置搜索查询
    search.searchQuery.value = 'test'
    
    // 执行搜索
    const searchPath = '/test/path'
    await search.performSearch(searchPath)
    
    // 应该调用 searchFiles API
    expect(searchFiles).toHaveBeenCalledTimes(1)
    expect(searchFiles).toHaveBeenCalledWith(
      searchPath,
      'test',
      false, // searchCaseSensitive 默认是 false
      false, // searchRegex 默认是 false
      false  // includeAllFiles 默认是 false
    )
    
    // 应该更新搜索状态和结果
    expect(search.isSearching.value).toBe(false)
    expect(search.searchResults.value.length).toBe(2)
    
    // 检查第一个搜索结果
    expect(search.searchResults.value[0].file.name).toBe('test1.txt')
    expect(search.searchResults.value[0].file.path).toBe('/path/to/test1.txt')
    expect(search.searchResults.value[0].line).toBe(1)
    expect(search.searchResults.value[0].content).toBe('Test line 1')
    expect(search.searchResults.value[0].matchStart).toBe(0)
    expect(search.searchResults.value[0].matchEnd).toBe(4)
    
    // 检查第二个搜索结果
    expect(search.searchResults.value[1].file.name).toBe('test2.txt')
    expect(search.searchResults.value[1].file.path).toBe('/path/to/test2.txt')
    expect(search.searchResults.value[1].line).toBe(3)
    expect(search.searchResults.value[1].content).toBe('Another test line')
    expect(search.searchResults.value[1].matchStart).toBe(8)
    expect(search.searchResults.value[1].matchEnd).toBe(12)
  })

  it('应该能够处理空搜索查询', async () => {
    // 设置空搜索查询
    search.searchQuery.value = ''
    
    // 执行搜索
    const searchPath = '/test/path'
    await search.performSearch(searchPath)
    
    // 不应该调用 searchFiles API
    expect(searchFiles).not.toHaveBeenCalled()
    
    // 应该清空搜索结果
    expect(search.searchResults.value).toEqual([])
  })

  it('应该能够处理空搜索路径', async () => {
    // 设置搜索查询
    search.searchQuery.value = 'test'
    
    // 执行搜索（空路径）
    await search.performSearch('')
    
    // 不应该调用 searchFiles API
    expect(searchFiles).not.toHaveBeenCalled()
    
    // 应该记录错误
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledWith('搜索路径未设置')
  })

  it('应该能够处理搜索失败', async () => {
    // 模拟 searchFiles 返回失败
    vi.mocked(searchFiles).mockResolvedValue({
      success: false,
      message: '搜索失败',
      results: []
    })
    
    // 设置搜索查询
    search.searchQuery.value = 'test'
    
    // 执行搜索
    const searchPath = '/test/path'
    await search.performSearch(searchPath)
    
    // 应该调用 searchFiles API
    expect(searchFiles).toHaveBeenCalledTimes(1)
    
    // 应该记录错误
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledWith('搜索失败: 搜索失败')
    
    // 应该更新搜索状态
    expect(search.isSearching.value).toBe(false)
  })

  it('应该能够追加搜索结果', async () => {
    // 模拟 searchFiles 返回结果
    const mockApiResults1 = [
      {
        file_name: 'test1.txt',
        file_path: '/path/to/test1.txt',
        line: 1,
        content: 'Test line 1',
        match_start: 0,
        match_end: 4
      }
    ]
    
    const mockApiResults2 = [
      {
        file_name: 'test2.txt',
        file_path: '/path/to/test2.txt',
        line: 3,
        content: 'Another test line',
        match_start: 8,
        match_end: 12
      }
    ]
    
    vi.mocked(searchFiles)
      .mockResolvedValueOnce({
        success: true, results: mockApiResults1,
        message: ''
      })
      .mockResolvedValueOnce({
        success: true, results: mockApiResults2,
        message: ''
      })
    
    // 设置搜索查询
    search.searchQuery.value = 'test'
    
    // 执行第一次搜索
    await search.performSearch('/test/path1')
    expect(search.searchResults.value.length).toBe(1)
    
    // 执行追加搜索
    await search.performSearch('/test/path2', true)
    
    // 应该调用两次 searchFiles API
    expect(searchFiles).toHaveBeenCalledTimes(2)
    
    // 搜索结果应该合并
    expect(search.searchResults.value.length).toBe(2)
    expect(search.searchResults.value[0].file.name).toBe('test1.txt')
    expect(search.searchResults.value[1].file.name).toBe('test2.txt')
  })

  it('应该能够清空搜索结果', () => {
    // 模拟搜索结果
    search.searchResults.value = [
      {
        file: {
          name: 'test1.txt',
          path: '/path/to/test1.txt',
          isDirectory: false
        },
        line: 1,
        content: 'Test line',
        matchStart: 0,
        matchEnd: 4
      }
    ]
    
    // 清空搜索结果
    search.clearResults()
    
    // 应该清空搜索结果和查询
    expect(search.searchResults.value).toEqual([])
    expect(search.searchQuery.value).toBe('')
  })

  it('应该能够跳转到搜索结果', () => {
    // 模拟编辑器视图
    const mockDispatch = vi.fn()
    const mockFocus = vi.fn()
    
    const mockEditorView = {
      dispatch: mockDispatch,
      focus: mockFocus,
      state: {
        doc: {
          lines: 10,
          line: (lineNumber: number) => ({
            from: (lineNumber - 1) * 20,
            length: 20
          })
        }
      }
    }
    
    // 模拟搜索结果
    const mockResult = {
      file: {
        name: 'test.txt',
        path: '/path/to/test.txt',
        isDirectory: false
      },
      line: 5,
      content: 'Test line content',
      matchStart: 0,
      matchEnd: 4
    }
    
    // 执行跳转到搜索结果
    search.jumpToResult(mockResult, mockEditorView as any)
    
    // 应该调用编辑器的 dispatch 和 focus 方法
    expect(mockDispatch).toHaveBeenCalledTimes(1)
    expect(mockFocus).toHaveBeenCalledTimes(1)
    
    // 检查 dispatch 的参数
    expect(mockDispatch).toHaveBeenCalledWith({
      selection: { anchor: 80, head: 84 }, // line 5 的 from 是 (5-1)*20=80, matchStart=0, matchEnd=4
      scrollIntoView: true
    })
  })
})
