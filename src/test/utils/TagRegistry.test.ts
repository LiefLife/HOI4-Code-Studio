/**
 * TagRegistry.ts 测试文件
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadCountryTags, type TagLoadResponse } from '../../api/tauri'

// Mock the Tauri API
vi.mock('../../api/tauri', () => ({
  loadCountryTags: vi.fn()
}))

const mockLoadCountryTags = vi.mocked(loadCountryTags)

// 辅助函数创建正确类型的测试数据
function createMockTag(code: string, name: string, source: 'project' | 'game' | 'dependency') {
  return { code, name, source }
}

function createMockResponse(success: boolean, message: string, tags: ReturnType<typeof createMockTag>[]): TagLoadResponse {
  return { success, message, tags }
}

// 动态导入 TagRegistry 以避免状态污染
let TagRegistry: typeof import('../../utils/TagRegistry')

describe('TagRegistry.ts', () => {
  beforeEach(async () => {
    // 重置所有 mocks
    vi.clearAllMocks()
    // 重置模块以清除内部状态
    vi.resetModules()
    // 重新导入 TagRegistry
    TagRegistry = await import('../../utils/TagRegistry')
    // 清除所有状态
    TagRegistry.setTagRoots()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('normalizePath (内部函数测试)', () => {
    it('应该规范化Windows路径', () => {
      // 由于 normalizePath 是内部函数，我们通过 setTagRoots 的行为来测试
      TagRegistry.setTagRoots('C:\\Users\\Test\\Project', 'D:\\Game\\HOI4')
      const roots = TagRegistry.getRoots()
      
      expect(roots.projectRoot).toBe('C:/Users/Test/Project')
      expect(roots.gameRoot).toBe('D:/Game/HOI4')
    })

    it('应该规范化Unix路径', () => {
      TagRegistry.setTagRoots('/home/user/project', '/opt/game/hoi4')
      const roots = TagRegistry.getRoots()
      
      expect(roots.projectRoot).toBe('/home/user/project')
      expect(roots.gameRoot).toBe('/opt/game/hoi4')
    })

    it('应该处理多余的斜杠', () => {
      TagRegistry.setTagRoots('C://Project\\\\Folder', 'D://Game\\\\HOI4')
      const roots = TagRegistry.getRoots()
      
      expect(roots.projectRoot).toBe('C:/Project/Folder')
      expect(roots.gameRoot).toBe('D:/Game/HOI4')
    })

    it('应该处理空字符串和undefined', () => {
      TagRegistry.setTagRoots('', undefined, [''])
      const roots = TagRegistry.getRoots()
      
      expect(roots.projectRoot).toBeUndefined()
      expect(roots.gameRoot).toBeUndefined()
      expect(roots.dependencyRoots).toEqual([])
    })
  })

  describe('setTagRoots', () => {
    it('应该设置正确的根路径', () => {
      TagRegistry.setTagRoots('/project', '/game', ['/dep1', '/dep2'])
      const roots = TagRegistry.getRoots()
      
      expect(roots.projectRoot).toBe('/project')
      expect(roots.gameRoot).toBe('/game')
      expect(roots.dependencyRoots).toEqual(['/dep1', '/dep2'])
    })

    it('应该过滤空的依赖路径', () => {
      TagRegistry.setTagRoots('/project', '/game', ['/dep1', '', '/dep2', null as any, undefined])
      const roots = TagRegistry.getRoots()
      
      expect(roots.dependencyRoots).toEqual(['/dep1', '/dep2'])
    })

    it('应该强制下次刷新', () => {
      // 先设置根路径并刷新一次
      TagRegistry.setTagRoots('/project', '/game')
      
      const mockResponse = createMockResponse(
        true,
        'success',
        [createMockTag('USA', 'United States', 'game')]
      )
      mockLoadCountryTags.mockResolvedValue(mockResponse)
      
      const promise1 = TagRegistry.ensureRefreshed()
      const promise2 = TagRegistry.ensureRefreshed() // 应该复用第一次的结果
      
      return Promise.all([promise1, promise2]).then(() => {
        expect(mockLoadCountryTags).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('getRegistry', () => {
    it('应该返回空的初始注册表', () => {
      const registry = TagRegistry.getRegistry()
      expect(registry).toBeInstanceOf(Set)
      expect(registry.size).toBe(0)
    })

    it('应该在成功加载后返回标签集合', async () => {
      const mockResponse = createMockResponse(
        true,
        'success',
        [
          createMockTag('USA', 'United States', 'game'),
          createMockTag('GER', 'Germany', 'game'),
          createMockTag('SOV', 'Soviet Union', 'game')
        ]
      )
      mockLoadCountryTags.mockResolvedValue(mockResponse)
      
      await TagRegistry.ensureRefreshed()
      const registry = TagRegistry.getRegistry()
      
      expect(registry.size).toBe(3)
      expect(registry.has('USA')).toBe(true)
      expect(registry.has('GER')).toBe(true)
      expect(registry.has('SOV')).toBe(true)
      expect(registry.has('usa')).toBe(false) // 应该是大写
    })
  })

  describe('getEntries', () => {
    it('应该返回空的初始条目数组', () => {
      const entries = TagRegistry.getEntries()
      expect(entries).toEqual([])
    })

    it('应该在成功加载后返回标签条目', async () => {
      const mockTags = [
        createMockTag('USA', 'United States', 'project'),
        createMockTag('GER', 'Germany', 'game')
      ]
      const mockResponse = createMockResponse(
        true,
        'success',
        mockTags
      )
      mockLoadCountryTags.mockResolvedValue(mockResponse)
      
      await TagRegistry.ensureRefreshed()
      const entries = TagRegistry.getEntries()
      
      expect(entries).toEqual(mockTags)
    })

    it('应该在加载失败时返回空数组', async () => {
      const mockResponse = {
        success: false,
        message: 'Failed to load',
        tags: []
      }
      mockLoadCountryTags.mockResolvedValue(mockResponse)
      
      await TagRegistry.ensureRefreshed()
      const entries = TagRegistry.getEntries()
      
      expect(entries).toEqual([])
    })
  })

  describe('getStatus', () => {
    it('应该返回初始状态消息', () => {
      const status = TagRegistry.getStatus()
      expect(status).toBe('')
    })

    it('应该在成功加载后返回状态消息', async () => {
      const mockResponse = createMockResponse(
        true,
        'success',
        [createMockTag('USA', 'United States', 'game')]
      )
      mockLoadCountryTags.mockResolvedValue(mockResponse)
      
      await TagRegistry.ensureRefreshed()
      const status = TagRegistry.getStatus()
      
      expect(status).toBe('已加载 1 个tag')
    })

    it('应该在加载失败后返回错误消息', async () => {
      const mockResponse = {
        success: false,
        message: 'Load failed',
        tags: []
      }
      mockLoadCountryTags.mockResolvedValue(mockResponse)
      
      await TagRegistry.ensureRefreshed()
      const status = TagRegistry.getStatus()
      
      expect(status).toBe('Load failed')
    })
  })

  describe('getLastResponse', () => {
    it('应该返回初始响应对象', () => {
      const response = TagRegistry.getLastResponse()
      expect(response).toEqual({
        success: false,
        message: '尚未加载tag',
        tags: []
      })
    })

    it('应该返回最新的响应', async () => {
      const mockResponse = createMockResponse(
        true,
        'success',
        [createMockTag('USA', 'United States', 'game')]
      )
      mockLoadCountryTags.mockResolvedValue(mockResponse)
      
      await TagRegistry.ensureRefreshed()
      const lastResponse = TagRegistry.getLastResponse()
      
      expect(lastResponse).toEqual(mockResponse)
    })
  })

  describe('ensureRefreshed', () => {
    it('应该在第一次调用时加载数据', async () => {
      const mockResponse = createMockResponse(
        true,
        'success',
        [createMockTag('USA', 'United States', 'game')]
      )
      mockLoadCountryTags.mockResolvedValue(mockResponse)
      
      const result = await TagRegistry.ensureRefreshed()
      
      expect(mockLoadCountryTags).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockResponse)
    })

    it('应该复用正在进行的请求', async () => {
      let resolveMock: (value: TagLoadResponse) => void
      const mockPromise = new Promise<TagLoadResponse>(resolve => {
        resolveMock = resolve
      })
      mockLoadCountryTags.mockReturnValue(mockPromise)
      
      const promise1 = TagRegistry.ensureRefreshed()
      const promise2 = TagRegistry.ensureRefreshed()
      
      expect(promise1).toBe(promise2) // 应该是同一个 Promise
      
      resolveMock!({
        success: true,
        message: 'success',
        tags: [{ code: 'USA', name: 'United States', source: 'dependency' }]
      })
      
      const [result1, result2] = await Promise.all([promise1, promise2])
      expect(result1).toEqual(result2)
    })

    it('应该在配置未变时复用缓存', async () => {
      const mockResponse = createMockResponse(
        true,
        'success',
        [createMockTag('USA', 'United States', 'game')]
      )
      mockLoadCountryTags.mockResolvedValue(mockResponse)
      
      TagRegistry.setTagRoots('/project', '/game')
      
      // 第一次调用
      await TagRegistry.ensureRefreshed()
      
      // 第二次调用应该复用结果
      const result = await TagRegistry.ensureRefreshed()
      
      expect(mockLoadCountryTags).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockResponse)
    })

    it('应该在配置改变时重新加载', async () => {
      const mockResponse1 = createMockResponse(
        true,
        'success',
        [createMockTag('USA', 'United States', 'dependency')]
      )
      const mockResponse2 = createMockResponse(
        true,
        'success',
        [createMockTag('GER', 'Germany', 'project')]
      )
      mockLoadCountryTags
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)
      
      // 第一次配置
      TagRegistry.setTagRoots('/project1', '/game1')
      await TagRegistry.ensureRefreshed()
      
      // 改变配置
      TagRegistry.setTagRoots('/project2', '/game2')
      await TagRegistry.ensureRefreshed()
      
      expect(mockLoadCountryTags).toHaveBeenCalledTimes(2)
      expect(mockLoadCountryTags).toHaveBeenNthCalledWith(1, '/project1', '/game1', [])
      expect(mockLoadCountryTags).toHaveBeenNthCalledWith(2, '/project2', '/game2', [])
    })

    it('应该处理加载成功的情况', async () => {
      const mockTags = [
        createMockTag('USA', 'United States', 'project'),
        createMockTag('GER', 'Germany', 'game')
      ]
      const mockResponse = createMockResponse(
        true,
        'success',
        mockTags
      )
      mockLoadCountryTags.mockResolvedValue(mockResponse)
      
      const result = await TagRegistry.ensureRefreshed()
      
      expect(result.success).toBe(true)
      expect(result.tags).toEqual(mockTags)
      expect(TagRegistry.getRegistry().size).toBe(2)
      expect(TagRegistry.getEntries()).toEqual(mockTags)
      expect(TagRegistry.getStatus()).toBe('已加载 2 个tag')
    })

    it('应该处理加载失败但有部分数据的情况', async () => {
      const mockTags = [createMockTag('USA', 'United States', 'game')]
      const mockResponse = createMockResponse(
        false,
        'Partial failure',
        mockTags
      )
      mockLoadCountryTags.mockResolvedValue(mockResponse)
      
      const result = await TagRegistry.ensureRefreshed()
      
      expect(result.success).toBe(false)
      expect(result.tags).toEqual(mockTags)
      expect(TagRegistry.getEntries()).toEqual(mockTags)
      expect(TagRegistry.getStatus()).toBe('Partial failure')
    })

    it('应该处理完全失败的情况', async () => {
      const mockResponse = {
        success: false,
        message: 'Complete failure',
        tags: []
      }
      mockLoadCountryTags.mockResolvedValue(mockResponse)
      
      const result = await TagRegistry.ensureRefreshed()
      
      expect(result.success).toBe(false)
      expect(result.tags).toEqual([])
      expect(TagRegistry.getEntries()).toEqual([])
      expect(TagRegistry.getStatus()).toBe('Complete failure')
    })

    it('应该处理网络异常', async () => {
      const error = new Error('Network error')
      mockLoadCountryTags.mockRejectedValue(error)
      
      const result = await TagRegistry.ensureRefreshed()
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('tag加载失败: Error: Network error')
      expect(result.tags).toEqual([])
      expect(TagRegistry.getEntries()).toEqual([])
      expect(TagRegistry.getStatus()).toContain('tag加载失败')
    })

    it('应该传递正确的参数到 loadCountryTags', async () => {
      const mockResponse = {
        success: true,
        message: 'success',
        tags: []
      }
      mockLoadCountryTags.mockResolvedValue(mockResponse)
      
      const projectRoot = '/project'
      const gameRoot = '/game'
      const dependencyRoots = ['/dep1', '/dep2']
      
      TagRegistry.setTagRoots(projectRoot, gameRoot, dependencyRoots)
      await TagRegistry.ensureRefreshed()
      
      expect(mockLoadCountryTags).toHaveBeenCalledWith(projectRoot, gameRoot, dependencyRoots)
    })
  })

  describe('集成测试', () => {
    it('应该正确处理完整的工作流程', async () => {
      // 设置初始配置
      TagRegistry.setTagRoots('/project', '/game', ['/dep1'])
      
      // 模拟成功的加载
      const mockTags = [
        createMockTag('USA', 'United States', 'project'),
        createMockTag('GER', 'Germany', 'game')
      ]
      mockLoadCountryTags.mockResolvedValue(createMockResponse(
        true,
        'success',
        mockTags
      ))
      
      // 第一次刷新
      let result = await TagRegistry.ensureRefreshed()
      expect(result.success).toBe(true)
      expect(TagRegistry.getRegistry().size).toBe(2)
      
      // 第二次刷新（应该复用缓存）
      result = await TagRegistry.ensureRefreshed()
      expect(result.success).toBe(true)
      expect(mockLoadCountryTags).toHaveBeenCalledTimes(1)
      
      // 改变配置
      TagRegistry.setTagRoots('/project2', '/game2', ['/dep2'])
      mockLoadCountryTags.mockResolvedValue({
        success: true,
        message: 'success',
        tags: [{ code: 'SOV', name: 'Soviet Union', source: 'dependency' }]
      })
      
      // 应该重新加载
      result = await TagRegistry.ensureRefreshed()
      expect(result.success).toBe(true)
      expect(TagRegistry.getRegistry().size).toBe(1)
      expect(TagRegistry.getRegistry().has('SOV')).toBe(true)
    })
  })
})