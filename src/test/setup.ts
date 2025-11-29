import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { RouterLinkStub, mount } from '@vue/test-utils'

// Mock Tauri API
vi.mock('../api/tauri', () => ({
  loadSettings: vi.fn(() => Promise.resolve({})),
  saveSettings: vi.fn(() => Promise.resolve()),
  buildDirectoryTreeFast: vi.fn(() => Promise.resolve({ success: true, tree: [] })),
  readFileContent: vi.fn(() => Promise.resolve({ success: true, content: '' })),
  writeFileContent: vi.fn(() => Promise.resolve({ success: true })),
  createFile: vi.fn(() => Promise.resolve({ success: true })),
  createFolder: vi.fn(() => Promise.resolve({ success: true })),
  renamePath: vi.fn(() => Promise.resolve({ success: true })),
  openFolder: vi.fn(() => Promise.resolve()),
  launchGame: vi.fn(() => Promise.resolve()),
  writeJsonFile: vi.fn(() => Promise.resolve({ success: true })),
}))

// Mock router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
  }),
  useRoute: () => ({
    path: '/',
    params: {},
    query: {},
  }),
}))

// Mock Prism.js
vi.mock('prismjs', () => ({
  default: {
    highlightElement: vi.fn(),
    languages: {},
  },
}))

// Setup global mocks
beforeAll(() => {
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    writable: true,
  })

  // Mock fetch
  global.fetch = vi.fn()

  // Mock console methods in test environment
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  vi.restoreAllMocks()
})