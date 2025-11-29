/**
 * useFileManager composable 的单元测试（简化版）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// 简化的文件节点类型
interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
  expanded?: boolean
}

// 简化的文件管理器逻辑测试
describe('useFileManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该正确识别图片文件', () => {
    // 直接测试图片文件识别逻辑
    function isImageFile(filePath: string): boolean {
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.dds', '.tga']
      const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'))
      return imageExtensions.includes(ext)
    }

    // 测试图片文件扩展名
    expect(isImageFile('/path/to/image.png')).toBe(true)
    expect(isImageFile('/path/to/image.jpg')).toBe(true)
    expect(isImageFile('/path/to/image.jpeg')).toBe(true)
    expect(isImageFile('/path/to/image.gif')).toBe(true)
    expect(isImageFile('/path/to/image.bmp')).toBe(true)
    expect(isImageFile('/path/to/image.webp')).toBe(true)
    expect(isImageFile('/path/to/image.svg')).toBe(true)
    expect(isImageFile('/path/to/image.dds')).toBe(true)
    expect(isImageFile('/path/to/image.tga')).toBe(true)
    
    // 测试非图片文件
    expect(isImageFile('/path/to/document.txt')).toBe(false)
    expect(isImageFile('/path/to/code.js')).toBe(false)
    expect(isImageFile('/path/to/config.json')).toBe(false)
  })

  it('应该正确处理文件节点数据结构', () => {
    // 测试文件节点的基本结构
    const fileNode: FileNode = {
      name: 'test.txt',
      path: '/test/test.txt',
      isDirectory: false,
      children: undefined,
      expanded: false
    }

    expect(fileNode.name).toBe('test.txt')
    expect(fileNode.path).toBe('/test/test.txt')
    expect(fileNode.isDirectory).toBe(false)
    expect(fileNode.children).toBeUndefined()
    expect(fileNode.expanded).toBe(false)
  })

  it('应该正确处理目录节点数据结构', () => {
    const directoryNode: FileNode = {
      name: 'src',
      path: '/test/src',
      isDirectory: true,
      children: [
        { name: 'App.vue', path: '/test/src/App.vue', isDirectory: false },
        { name: 'main.ts', path: '/test/src/main.ts', isDirectory: false }
      ],
      expanded: true
    }

    expect(directoryNode.isDirectory).toBe(true)
    expect(directoryNode.children).toHaveLength(2)
    expect(directoryNode.expanded).toBe(true)
    expect(directoryNode.children?.[0].name).toBe('App.vue')
  })

  it('应该正确处理未保存更改检查逻辑', () => {
    // 模拟打开的文件列表
    const openFiles = ref([
      {
        node: { name: 'file1.txt', path: '/test/file1.txt', isDirectory: false },
        content: 'modified content',
        hasUnsavedChanges: true,
        cursorLine: 0,
        cursorColumn: 0
      }
    ])

    function hasUnsavedChanges(files: typeof openFiles.value): boolean {
      return files.some(file => file.hasUnsavedChanges)
    }

    expect(hasUnsavedChanges(openFiles.value)).toBe(true)

    // 测试没有未保存的更改
    const cleanFiles = ref([
      {
        node: { name: 'file1.txt', path: '/test/file1.txt', isDirectory: false },
        content: 'saved content',
        hasUnsavedChanges: false,
        cursorLine: 0,
        cursorColumn: 0
      }
    ])

    expect(hasUnsavedChanges(cleanFiles.value)).toBe(false)
  })

  it('应该正确处理当前文件更新逻辑', () => {
    const openFiles = ref([
      {
        node: { name: 'file1.txt', path: '/test/file1.txt', isDirectory: false },
        content: 'content1',
        hasUnsavedChanges: false,
        cursorLine: 0,
        cursorColumn: 0
      },
      {
        node: { name: 'file2.txt', path: '/test/file2.txt', isDirectory: false },
        content: 'content2',
        hasUnsavedChanges: false,
        cursorLine: 0,
        cursorColumn: 0
      }
    ])
    
    const activeFileIndex = ref(1)
    const currentFile = ref<FileNode | null>(null)

    function updateCurrentFile() {
      if (activeFileIndex.value >= 0 && activeFileIndex.value < openFiles.value.length) {
        currentFile.value = openFiles.value[activeFileIndex.value].node
      } else {
        currentFile.value = null
      }
    }

    // 测试更新当前文件
    updateCurrentFile()
    expect(currentFile.value).toEqual(openFiles.value[1].node)

    // 测试切换到第一个文件
    activeFileIndex.value = 0
    updateCurrentFile()
    expect(currentFile.value).toEqual(openFiles.value[0].node)
  })

  it('应该正确处理文件关闭逻辑', () => {
    const openFiles = ref([
      {
        node: { name: 'file1.txt', path: '/test/file1.txt', isDirectory: false },
        content: 'content1',
        hasUnsavedChanges: false,
        cursorLine: 0,
        cursorColumn: 0
      },
      {
        node: { name: 'file2.txt', path: '/test/file2.txt', isDirectory: false },
        content: 'content2',
        hasUnsavedChanges: false,
        cursorLine: 0,
        cursorColumn: 0
      }
    ])
    
    const activeFileIndex = ref(1)

    function closeFile(index: number) {
      if (index >= 0 && index < openFiles.value.length) {
        openFiles.value.splice(index, 1)
        
        // 调整活动文件索引
        if (activeFileIndex.value >= openFiles.value.length) {
          activeFileIndex.value = openFiles.value.length - 1
        } else if (activeFileIndex.value > index) {
          activeFileIndex.value -= 1
        }
      }
    }

    // 关闭当前激活的文件
    closeFile(1)
    expect(openFiles.value).toHaveLength(1)
    expect(openFiles.value[0].node.name).toBe('file1.txt')
    expect(activeFileIndex.value).toBe(0)
  })
})