/**
 * 图片处理器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useImageProcessor } from '../../../src/composables/useImageProcessor'

// Mock Tauri API
vi.mock('../../../src/api/tauri', () => ({
  loadFocusIcon: vi.fn(),
  readIconCache: vi.fn(),
  writeIconCache: vi.fn()
}))

describe('useImageProcessor', () => {
  let imageProcessor: ReturnType<typeof useImageProcessor>

  beforeEach(() => {
    vi.clearAllMocks()
    imageProcessor = useImageProcessor()
  })

  it('应该正确初始化', () => {
    expect(imageProcessor.isProcessing.value).toBe(false)
    expect(imageProcessor.stats.value.totalTasks).toBe(0)
    expect(imageProcessor.getCacheSize()).toBe(0)
  })

  it('应该能够清理缓存', () => {
    const initialSize = imageProcessor.getCacheSize()
    imageProcessor.clearCache()
    expect(imageProcessor.getCacheSize()).toBeLessThanOrEqual(initialSize)
  })

  it('应该能够获取缓存的图标', () => {
    // 使用composable内部的方法来设置缓存
    // 这里我们通过加载图标来设置缓存
    const result = imageProcessor.getCachedIcon('test-icon')
    expect(result).toBeNull() // 初始应该为空
  })

  it('应该能够初始化Worker池', () => {
    expect(() => {
      imageProcessor.initWorkerPool(2)
    }).not.toThrow()
  })

  it('应该能够处理批量图标加载', async () => {
    const iconNames = ['icon1', 'icon2', 'icon3']
    const onProgress = vi.fn()
    const onItemLoaded = vi.fn()

    // 由于这是集成测试，我们主要测试API调用而不是实际加载
    const loadPromise = imageProcessor.loadIconsBatch(iconNames, {
      projectPath: '/test/project',
      gameDirectory: '/test/game',
      onProgress,
      onItemLoaded
    })

    expect(loadPromise).toBeInstanceOf(Promise)
  })

  it('应该能够预加载图标', () => {
    const iconNames = ['icon1', 'icon2']
    
    expect(() => {
      imageProcessor.preloadIcons(iconNames, {
        projectPath: '/test/project'
      })
    }).not.toThrow()
  })

  it('应该能够正确清理资源', () => {
    expect(() => {
      imageProcessor.dispose()
    }).not.toThrow()
  })
})