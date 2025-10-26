/**
 * 滚动同步 Composable
 * 管理编辑器、高亮层、行号栏的滚动同步
 */
export function useScrollSync() {
  /**
   * 同步滚动位置，并在接近底部时触发回弹
   * 支持HTMLTextAreaElement和HTMLDivElement（contentEditable）
   */
  function syncScroll(
    editor: HTMLElement | null,
    highlight: HTMLPreElement | null,
    lineNumbers: HTMLDivElement | null
  ) {
    if (!editor) return

    requestAnimationFrame(() => {
      if (!editor) return

      const maxScroll = editor.scrollHeight - editor.clientHeight
      const currentScroll = editor.scrollTop
      const bottomThreshold = 50
      const bounceDistance = 100

      if (maxScroll > 0 && maxScroll - currentScroll < bottomThreshold) {
        const bouncePosition = Math.max(0, maxScroll - bounceDistance)

        editor.scrollTo({
          top: bouncePosition,
          behavior: 'smooth'
        })

        if (highlight) {
          highlight.scrollTo({
            top: bouncePosition,
            left: editor.scrollLeft,
            behavior: 'smooth'
          })
        }

        if (lineNumbers) {
          lineNumbers.scrollTo({
            top: bouncePosition,
            behavior: 'smooth'
          })
        }
      } else {
        if (highlight) {
          highlight.scrollTop = editor.scrollTop
          highlight.scrollLeft = editor.scrollLeft
        }

        if (lineNumbers) {
          lineNumbers.scrollTop = editor.scrollTop
        }
      }
    })
  }

  /**
   * 处理编辑器滚轮事件
   * 支持HTMLTextAreaElement和HTMLDivElement（contentEditable）
   */
  function handleEditorWheel(
    _event: WheelEvent,
    editor: HTMLElement | null,
    onSync: () => void
  ) {
    if (!editor) return

    onSync()
  }

  return {
    syncScroll,
    handleEditorWheel
  }
}
