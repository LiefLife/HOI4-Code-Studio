/**
 * useHistory 撤销重做逻辑测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useHistory, type HistoryState } from '../../../src/composables/useHistory'

describe('useHistory', () => {
  let history: ReturnType<typeof useHistory>
  let textarea: HTMLTextAreaElement

  beforeEach(() => {
    history = useHistory()
    textarea = document.createElement('textarea')
    textarea.value = ''
    textarea.selectionStart = 0
    textarea.selectionEnd = 0
  })

  it('saveHistory 应该添加记录并清空重做栈', () => {
    const sampleState: HistoryState = { content: 'test', cursorStart: 1, cursorEnd: 1 }
    history.saveHistory(sampleState)
    history.redoStack.value.push(sampleState)

    history.saveHistory({ content: 'test2', cursorStart: 2, cursorEnd: 2 })

    expect(history.undoStack.value).toHaveLength(2)
    expect(history.redoStack.value).toHaveLength(0)
  })

  it('saveHistory 在应用历史记录时不应记录', () => {
    const sampleState: HistoryState = { content: 'test', cursorStart: 1, cursorEnd: 1 }
    history.isApplyingHistory.value = true
    history.saveHistory(sampleState)
    expect(history.undoStack.value).toHaveLength(0)
  })

  it('saveHistory 应该限制栈大小为 100', () => {
    for (let i = 0; i < 101; i++) {
      history.saveHistory({ content: `state-${i}`, cursorStart: i, cursorEnd: i })
    }
    expect(history.undoStack.value).toHaveLength(100)
    expect(history.undoStack.value[0].content).toBe('state-1')
  })

  it('undo 应该恢复上一状态并更新重做栈', async () => {
    history.saveHistory({ content: 'first', cursorStart: 0, cursorEnd: 5 })
    history.saveHistory({ content: 'second', cursorStart: 1, cursorEnd: 6 })

    let currentContent = 'third'
    textarea.value = currentContent
    textarea.selectionStart = 6
    textarea.selectionEnd = 6

    const onContentChange = vi.fn((content: string) => {
      currentContent = content
      textarea.value = content
    })
    const onHighlight = vi.fn()


    expect(onContentChange).toHaveBeenCalledWith('second')
    expect(history.redoStack.value).toHaveLength(1)
    expect(currentContent).toBe('second')
    expect(textarea.selectionStart).toBe(1)
    expect(textarea.selectionEnd).toBe(6)
    expect(onHighlight).toHaveBeenCalledTimes(1)
  })

  it('redo 应该恢复下一状态并更新撤销栈', async () => {
    history.saveHistory({ content: 'first', cursorStart: 0, cursorEnd: 5 })
    history.saveHistory({ content: 'second', cursorStart: 1, cursorEnd: 6 })

    let currentContent = 'third'
    textarea.value = currentContent
    textarea.selectionStart = 5
    textarea.selectionEnd = 5

    const onContentChange = vi.fn((content: string) => {
      currentContent = content
      textarea.value = content
    })
    const onHighlight = vi.fn()


    expect(onContentChange).toHaveBeenCalledWith('third')
    expect(history.undoStack.value).toHaveLength(2)
    expect(history.redoStack.value).toHaveLength(0)
    expect(currentContent).toBe('third')
    expect(textarea.selectionStart).toBe(5)
    expect(textarea.selectionEnd).toBe(5)
    expect(onHighlight).toHaveBeenCalledTimes(2)
  })

  it('clearHistory 应该清空撤销与重做栈', () => {
    history.saveHistory({ content: 'first', cursorStart: 0, cursorEnd: 0 })
    history.redoStack.value.push({ content: 'second', cursorStart: 0, cursorEnd: 0 })

    history.clearHistory()

    expect(history.undoStack.value).toHaveLength(0)
    expect(history.redoStack.value).toHaveLength(0)
  })
})
