import { vi } from 'vitest'

/**
 * 创建模拟的文件节点
 */
export function createMockFileNode(
  name: string,
  isDirectory: boolean = false,
  children?: any[]
) {
  return {
    name,
    path: `/mock/${name}`,
    isDirectory,
    children: children || undefined,
    expanded: false,
    size: isDirectory ? undefined : 1024,
  }
}

/**
 * 创建模拟的打开文件
 */
export function createMockOpenFile(
  _path: string = '/mock/file.txt',
  content: string = 'mock content'
) {
  return {
    node: createMockFileNode('file.txt', false),
    content,
    hasUnsavedChanges: false,
    cursorLine: 0,
    cursorColumn: 0,
  }
}

/**
 * 模拟API响应
 */
export const mockApiResponses = {
  fileTree: {
    success: true,
    message: '文件树构建成功',
    tree: [
      createMockFileNode('src', true, [
        createMockFileNode('components', true),
        createMockFileNode('views', true),
        createMockFileNode('App.vue'),
      ]),
    ],
  },
  fileContent: {
    success: true,
    content: 'mock file content',
  },
  settings: {
    gameDirectory: '/mock/game/path',
    theme: 'dark',
    autoSave: true,
  },
}

/**
 * 快速设置常见mock
 */
export function setupCommonMocks() {
  // Mock各个API函数
  const mockedApi = {
    buildDirectoryTreeFast: vi.fn(() => Promise.resolve(mockApiResponses.fileTree)),
    readFileContent: vi.fn(() => Promise.resolve(mockApiResponses.fileContent)),
    loadSettings: vi.fn(() => Promise.resolve(mockApiResponses.settings)),
    writeFileContent: vi.fn(() => Promise.resolve({ success: true })),
    saveSettings: vi.fn(() => Promise.resolve(undefined)),
    createFile: vi.fn(() => Promise.resolve({ success: true })),
    createFolder: vi.fn(() => Promise.resolve({ success: true })),
    renamePath: vi.fn(() => Promise.resolve({ success: true })),
    openFolder: vi.fn(() => Promise.resolve(undefined)),
    launchGame: vi.fn(() => Promise.resolve(undefined)),
    writeJsonFile: vi.fn(() => Promise.resolve({ success: true })),
    readImageAsBase64: vi.fn(() => Promise.resolve({
      success: true,
      base64: '',
      mimeType: 'image/png'
    }))
  }
  
  // 直接模拟模块
  vi.mock('@/api/tauri', () => ({
    ...mockedApi,
  }))
}

/**
 * 清理所有mock
 */
export function clearAllMocks() {
  vi.clearAllMocks()
}