import { ref } from 'vue'
import { readFileContent, writeFileContent } from '../api/tauri'

/**
 * 文件节点接口
 */
export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
  expanded?: boolean
}

/**
 * 打开的文件接口
 */
export interface OpenFile {
  node: FileNode
  content: string
  hasUnsavedChanges: boolean
  cursorLine: number
  cursorColumn: number
}

/**
 * 文件管理 Composable
 * 管理文件的打开、关闭、保存等操作
 */
export function useFileManager(gameDirectory: string = '') {
  const openFiles = ref<OpenFile[]>([])
  const activeFileIndex = ref<number>(-1)
  const currentFile = ref<FileNode | null>(null)
  const isLoadingFile = ref(false)
  
  /**
   * 打开文件
   */
  async function openFile(
    node: FileNode,
    onContentLoaded?: (content: string) => void
  ): Promise<boolean> {
    if (node.isDirectory) return false
    
    // 检查文件是否已经打开
    const existingIndex = openFiles.value.findIndex(f => f.node.path === node.path)
    if (existingIndex !== -1) {
      activeFileIndex.value = existingIndex
      updateCurrentFile()
      return true
    }
    
    // 读取文件内容
    isLoadingFile.value = true
    try {
      const result = await readFileContent(node.path)
      if (result.success) {
        // 显示编码信息
        if (result.encoding && result.encoding !== 'UTF-8') {
          console.log(`文件编码: ${result.encoding}`)
        }
        
        // 检查是否为二进制文件
        if (result.is_binary) {
          alert(`${result.message}\n文件可能包含二进制数据，显示可能不正确。`)
        }
        
        openFiles.value.push({
          node,
          content: result.content,
          hasUnsavedChanges: false,
          cursorLine: 1,
          cursorColumn: 1
        })
        activeFileIndex.value = openFiles.value.length - 1
        updateCurrentFile()
        
        // 通知内容已加载
        onContentLoaded?.(result.content)
        
        return true
      } else {
        // 检查是否为图片文件
        if (result.is_image) {
          alert(`${result.message}\n请使用图片查看器打开此文件。`)
        } else {
          alert(`打开文件失败: ${result.message}`)
        }
        return false
      }
    } catch (error) {
      console.error('打开文件失败:', error)
      alert(`打开文件失败: ${error}`)
      return false
    } finally {
      isLoadingFile.value = false
    }
  }
  
  /**
   * 切换到指定文件
   */
  function switchToFile(index: number, currentContent?: string) {
    if (index < 0 || index >= openFiles.value.length) return
    
    // 保存当前文件状态
    if (activeFileIndex.value >= 0 && activeFileIndex.value < openFiles.value.length && currentContent !== undefined) {
      const current = openFiles.value[activeFileIndex.value]
      current.content = currentContent
    }
    
    activeFileIndex.value = index
    updateCurrentFile()
  }
  
  /**
   * 关闭文件
   */
  function closeFile(index?: number): boolean {
    const targetIndex = index !== undefined ? index : activeFileIndex.value
    if (targetIndex === -1 || !openFiles.value[targetIndex]) return false
    
    const file = openFiles.value[targetIndex]
    
    // 检查未保存更改
    if (file.hasUnsavedChanges) {
      if (!confirm(`文件 "${file.node.name}" 有未保存的更改，是否放弃更改？`)) {
        return false
      }
    }
    
    // 从列表中移除
    openFiles.value.splice(targetIndex, 1)
    
    // 调整活动文件索引
    if (openFiles.value.length === 0) {
      activeFileIndex.value = -1
    } else if (targetIndex === activeFileIndex.value) {
      // 如果关闭的是当前文件，切换到前一个或后一个
      activeFileIndex.value = Math.min(targetIndex, openFiles.value.length - 1)
    } else if (targetIndex < activeFileIndex.value) {
      // 如果关闭的文件在当前文件之前，索引需要减1
      activeFileIndex.value--
    }
    
    updateCurrentFile()
    return true
  }
  
  /**
   * 关闭所有文件
   */
  function closeAllFiles(): boolean {
    const hasUnsaved = openFiles.value.some(f => f.hasUnsavedChanges)
    if (hasUnsaved) {
      if (!confirm('有文件包含未保存的更改，是否放弃所有更改？')) {
        return false
      }
    }
    
    openFiles.value = []
    activeFileIndex.value = -1
    updateCurrentFile()
    return true
  }
  
  /**
   * 关闭其他文件
   */
  function closeOtherFiles(keepIndex: number): boolean {
    if (keepIndex < 0 || keepIndex >= openFiles.value.length) return false
    
    // 检查其他文件是否有未保存更改
    const hasUnsaved = openFiles.value.some((f, i) => i !== keepIndex && f.hasUnsavedChanges)
    if (hasUnsaved) {
      if (!confirm('其他文件包含未保存的更改，是否放弃更改？')) {
        return false
      }
    }
    
    // 保留指定文件
    const keepFile = openFiles.value[keepIndex]
    openFiles.value = [keepFile]
    activeFileIndex.value = 0
    updateCurrentFile()
    return true
  }
  
  /**
   * 保存文件
   */
  async function saveFile(content: string): Promise<boolean> {
    if (!currentFile.value || activeFileIndex.value === -1) return false
    
    try {
      const result = await writeFileContent(currentFile.value.path, content)
      if (result.success) {
        // 更新文件列表中的状态
        if (openFiles.value[activeFileIndex.value]) {
          openFiles.value[activeFileIndex.value].hasUnsavedChanges = false
          openFiles.value[activeFileIndex.value].content = content
        }
        return true
      } else {
        alert(`保存失败: ${result.message}`)
        return false
      }
    } catch (error) {
      console.error('保存文件失败:', error)
      alert(`保存失败: ${error}`)
      return false
    }
  }
  
  /**
   * 更新当前文件状态
   */
  function updateCurrentFile() {
    if (activeFileIndex.value === -1 || !openFiles.value[activeFileIndex.value]) {
      currentFile.value = null
      return null
    }
    
    const file = openFiles.value[activeFileIndex.value]
    currentFile.value = file.node
    
    return file
  }
  
  /**
   * 更新文件内容和状态
   */
  function updateFileState(content: string, hasChanges: boolean) {
    if (activeFileIndex.value >= 0 && openFiles.value[activeFileIndex.value]) {
      openFiles.value[activeFileIndex.value].content = content
      openFiles.value[activeFileIndex.value].hasUnsavedChanges = hasChanges
    }
  }
  
  /**
   * 检查文件是否为只读（游戏目录文件）
   */
  function isFileReadOnly(filePath: string): boolean {
    return !!gameDirectory && filePath.startsWith(gameDirectory)
  }
  
  return {
    openFiles,
    activeFileIndex,
    currentFile,
    isLoadingFile,
    openFile,
    switchToFile,
    closeFile,
    closeAllFiles,
    closeOtherFiles,
    saveFile,
    updateCurrentFile,
    updateFileState,
    isFileReadOnly
  }
}
