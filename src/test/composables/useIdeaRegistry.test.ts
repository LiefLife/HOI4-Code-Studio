/**
 * useIdeaRegistry 组合式测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { IdeaEntry, IdeaLoadResponse } from '../../../src/api/tauri'

const mockLoadIdeas = vi.fn()
const mockResetIdeaCache = vi.fn()

vi.mock('../../../src/api/tauri', () => ({
  loadIdeas: (...args: unknown[]) => mockLoadIdeas(...args),
  resetIdeaCache: (...args: unknown[]) => mockResetIdeaCache(...args)
}))

type IdeaRegistryModule = typeof import('../../../src/composables/useIdeaRegistry')

let useIdeaRegistry: IdeaRegistryModule['useIdeaRegistry']
let ensureIdeaRegistry: IdeaRegistryModule['ensureIdeaRegistry']
let setIdeaRoots: IdeaRegistryModule['setIdeaRoots']
let clearIdeaCache: IdeaRegistryModule['clearIdeaCache']

async function reloadModule() {
  vi.resetModules()
  const module = await import('../../../src/composables/useIdeaRegistry')
  useIdeaRegistry = module.useIdeaRegistry
  ensureIdeaRegistry = module.ensureIdeaRegistry
  setIdeaRoots = module.setIdeaRoots
  clearIdeaCache = module.clearIdeaCache
}

describe('useIdeaRegistry', () => {
  beforeEach(async () => {
    mockLoadIdeas.mockReset()
    mockResetIdeaCache.mockReset()
    mockLoadIdeas.mockResolvedValue({ success: true, message: 'ok', ideas: [] })
    mockResetIdeaCache.mockResolvedValue(undefined)
    await reloadModule()
  })

  it('默认状态应为未加载且数据为空', () => {
    const registry = useIdeaRegistry()
    expect(registry.isLoading.value).toBe(false)
    expect(registry.ideas.value).toEqual([])
    expect(registry.statusMessage.value).toBe('')
  })

  it('ensureIdeaRegistry 成功后应更新 idea 列表与状态', async () => {
    const ideas: IdeaEntry[] = [
      { id: 'idea_a', source: 'project' },
      { id: 'idea_b', source: 'game' }
    ]
    mockLoadIdeas.mockResolvedValueOnce({ success: true, message: 'loaded', ideas })

    const resp = await ensureIdeaRegistry()
    const registry = useIdeaRegistry()

    expect(resp.success).toBe(true)
    expect(mockLoadIdeas).toHaveBeenCalledTimes(1)
    expect(registry.ideas.value).toEqual(ideas)
    expect(registry.statusMessage.value).toBe('已加载 2 个idea')
  })

  it('ensureIdeaRegistry 失败时应记录消息并清空数据', async () => {
    mockLoadIdeas.mockResolvedValueOnce({ success: false, message: '加载失败', ideas: undefined })

    const resp = await ensureIdeaRegistry()
    const registry = useIdeaRegistry()

    expect(resp.success).toBe(false)
    expect(registry.ideas.value).toEqual([])
    expect(registry.statusMessage.value).toBe('加载失败')
  })

  it('setIdeaRoots 应影响加载参数', async () => {
    setIdeaRoots('proj/path', 'game/path', ['dep1', 'dep2'])
    await ensureIdeaRegistry()

    expect(mockLoadIdeas).toHaveBeenCalledWith('proj/path', 'game/path', ['dep1', 'dep2'])
  })

  it('正在加载时再次调用 ensureIdeaRegistry 应返回提示信息', async () => {
    let resolveLoad: ((value: IdeaLoadResponse) => void) | undefined
    const pendingPromise = new Promise<IdeaLoadResponse>((resolve) => {
      resolveLoad = resolve
    })
    mockLoadIdeas.mockReturnValueOnce(pendingPromise)

    const firstPromise = ensureIdeaRegistry()
    const secondResp = await ensureIdeaRegistry()

    expect(secondResp.success).toBe(false)
    expect(secondResp.message).toBe('idea加载进行中，请稍后')

    resolveLoad?.({ success: true, message: 'done', ideas: [] })
    await firstPromise
  })

  it('clearIdeaCache 应重置状态并调用底层清理', async () => {
    mockLoadIdeas.mockResolvedValueOnce({
      success: true,
      message: 'loaded',
      ideas: [{ id: 'idea_a', source: 'project' }]
    })
    await ensureIdeaRegistry()

    await clearIdeaCache()

    const registry = useIdeaRegistry()
    expect(mockResetIdeaCache).toHaveBeenCalledTimes(1)
    expect(registry.ideas.value).toEqual([])
    expect(registry.statusMessage.value).toBe('缓存已清空')
  })
})
