/**
 * useDependencyManager composable 的单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDependencyManager, state } from '../../../src/composables/useDependencyManager'
import type { Dependency } from '../../../src/types/dependency'

// 模拟 Tauri API
vi.mock('../../../src/api/tauri', () => ({
  loadDependencies: vi.fn(),
  saveDependencies: vi.fn(),
  validateDependencyPath: vi.fn(),
  indexDependency: vi.fn()
}))

import { 
  loadDependencies, 
  saveDependencies, 
  validateDependencyPath, 
  indexDependency 
} from '../../../src/api/tauri'

// 模拟 logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    error: vi.fn()
  }
}))

describe('useDependencyManager', () => {
  let dependencyManager: ReturnType<typeof useDependencyManager>
  const mockProjectPath = '/test/project'

  beforeEach(() => {
    vi.clearAllMocks()
    
    // 重置状态
    state.value.dependencies = []
    state.value.loading = false
    state.value.indexStatuses = new Map()
    state.value.projectPath = ''
    
    dependencyManager = useDependencyManager(mockProjectPath)
  })

  it('应该正确初始化状态', () => {
    expect(dependencyManager.dependencies.value).toEqual([])
    expect(dependencyManager.enabledDependencies.value).toEqual([])
    expect(dependencyManager.isLoading.value).toBe(false)
    expect(dependencyManager.dependencyCount.value).toBe(0)
  })

  it('应该正确设置项目路径', () => {
    const newPath = '/new/project/path'
    dependencyManager.setProjectPath(newPath)
    
    // 验证路径是否被设置（通过依赖加载来间接验证）
    vi.mocked(loadDependencies).mockResolvedValue({
        success: true,
        dependencies: [],
        message: ''
    })
    
    dependencyManager.loadDependencies()
    expect(loadDependencies).toHaveBeenCalledWith(newPath)
  })

  it('应该正确加载依赖项', async () => {
    const mockDependencies: Dependency[] = [
      {
        id: 'dep_1',
        name: 'Test Mod 1',
        path: '/test/mod1',
        type: 'hoi4mod',
        addedAt: new Date().toISOString(),
        enabled: true
      },
      {
        id: 'dep_2',
        name: 'Test Mod 2',
        path: '/test/mod2',
        type: 'hoi4mod',
        addedAt: new Date().toISOString(),
        enabled: false
      }
    ]
    
    vi.mocked(loadDependencies).mockResolvedValue({
        success: true,
        dependencies: mockDependencies,
        message: ''
    })
    
    await dependencyManager.loadDependencies()
    
    expect(dependencyManager.dependencies.value).toEqual(mockDependencies)
    expect(dependencyManager.enabledDependencies.value).toEqual([mockDependencies[0]])
    expect(dependencyManager.dependencyCount.value).toBe(2)
  })

  it('应该处理依赖项加载失败的情况', async () => {
    vi.mocked(loadDependencies).mockResolvedValue({
      success: false,
      message: '加载失败'
    })
    
    const result = await dependencyManager.loadDependencies()
    
    expect(result).toEqual({
      success: false,
      message: '加载失败'
    })
    expect(dependencyManager.dependencies.value).toEqual([])
  })

  it('应该正确验证依赖项路径', async () => {
    const testPath = '/test/valid/path'
    
    vi.mocked(validateDependencyPath).mockResolvedValue({
        valid: true,
        name: 'Valid Mod',
        type: 'hoi4mod',
        message: ''
    })
    
    const result = await dependencyManager.validatePath(testPath)
    
    expect(result).toEqual({
      valid: true,
      name: 'Valid Mod',
      type: 'hoi4mod',
      message: ''
    })
    expect(validateDependencyPath).toHaveBeenCalledWith(testPath)
  })

  it('应该正确添加依赖项', async () => {
    const testPath = '/test/new/mod'
    
    vi.mocked(validateDependencyPath).mockResolvedValue({
        valid: true,
        name: 'New Mod',
        type: 'hoi4mod',
        message: ''
    })
    vi.mocked(saveDependencies).mockResolvedValue({
      success: true,
      message: '保存成功'
    })
    
    const result = await dependencyManager.addDependency(testPath)
    
    expect(result).toEqual({
      success: true,
      message: '依赖项添加成功'
    })
    expect(dependencyManager.dependencies.value.length).toBe(1)
    expect(dependencyManager.dependencies.value[0].name).toBe('New Mod')
    expect(dependencyManager.dependencies.value[0].path).toBe(testPath)
    expect(dependencyManager.dependencies.value[0].enabled).toBe(true)
    expect(saveDependencies).toHaveBeenCalled()
  })

  it('应该拒绝添加无效路径的依赖项', async () => {
    const testPath = '/test/invalid/path'
    
    vi.mocked(validateDependencyPath).mockResolvedValue({
      valid: false,
      message: '无效路径'
    })
    
    const result = await dependencyManager.addDependency(testPath)
    
    expect(result).toEqual({
      success: false,
      message: '无效路径'
    })
    expect(dependencyManager.dependencies.value.length).toBe(0)
    expect(saveDependencies).not.toHaveBeenCalled()
  })

  it('应该拒绝添加已存在的依赖项', async () => {
    const testPath = '/test/existing/mod'
    const mockDependency: Dependency = {
      id: 'dep_1',
      name: 'Existing Mod',
      path: testPath,
      type: 'hoi4mod',
      addedAt: new Date().toISOString(),
      enabled: true
    }
    
    vi.mocked(validateDependencyPath).mockResolvedValue({
        valid: true,
        name: 'Existing Mod',
        type: 'hoi4mod',
        message: ''
    })
    
    // 直接设置到state中
    state.value.dependencies = [mockDependency]
    
    const result = await dependencyManager.addDependency(testPath)
    
    expect(result).toEqual({
      success: false,
      message: '该依赖项已存在'
    })
    expect(dependencyManager.dependencies.value.length).toBe(1)
    expect(saveDependencies).not.toHaveBeenCalled()
  })

  it('应该正确删除依赖项', async () => {
    const mockDependency: Dependency = {
      id: 'dep_1',
      name: 'Test Mod',
      path: '/test/mod',
      type: 'hoi4mod',
      addedAt: new Date().toISOString(),
      enabled: true
    }
    
    vi.mocked(saveDependencies).mockResolvedValue({
      success: true,
      message: '保存成功'
    })
    
    // 直接设置到state中
    state.value.dependencies = [mockDependency]
    
    const result = await dependencyManager.removeDependency(mockDependency.id)
    
    expect(result).toEqual({
      success: true,
      message: '依赖项删除成功'
    })
    expect(dependencyManager.dependencies.value.length).toBe(0)
    expect(saveDependencies).toHaveBeenCalled()
  })

  it('应该处理删除不存在的依赖项', async () => {
    const result = await dependencyManager.removeDependency('non_existent_id')
    
    expect(result).toEqual({
      success: false,
      message: '依赖项不存在'
    })
    expect(saveDependencies).not.toHaveBeenCalled()
  })

  it('应该正确切换依赖项启用状态', async () => {
    // 设置项目路径
    dependencyManager.setProjectPath('/test/project')
    
    const mockDependency: Dependency = {
      id: 'dep_1',
      name: 'Test Mod',
      path: '/test/mod',
      type: 'hoi4mod',
      addedAt: new Date().toISOString(),
      enabled: true
    }
    
    // 模拟saveDependencies
    vi.mocked(saveDependencies).mockResolvedValue({
      success: true,
      message: '保存成功'
    })
    
    // 直接访问并修改state
    state.value.dependencies = [mockDependency]
    
    // 测试禁用依赖项
    let result = await dependencyManager.toggleDependency(mockDependency.id)
    
    expect(result).toEqual({
      success: true,
      message: '依赖项已禁用'
    })
    expect(dependencyManager.dependencies.value[0].enabled).toBe(false)
    expect(dependencyManager.enabledDependencies.value.length).toBe(0)
    
    // 测试启用依赖项
    result = await dependencyManager.toggleDependency(mockDependency.id)
    
    expect(result).toEqual({
      success: true,
      message: '依赖项已启用'
    })
    expect(dependencyManager.dependencies.value[0].enabled).toBe(true)
    expect(dependencyManager.enabledDependencies.value.length).toBe(1)
  })

  it('应该正确索引依赖项', async () => {
    // 设置项目路径
    dependencyManager.setProjectPath('/test/project')
    
    const mockDependency: Dependency = {
      id: 'dep_1',
      name: 'Test Mod',
      path: '/test/mod',
      type: 'hoi4mod',
      addedAt: new Date().toISOString(),
      enabled: true
    }
    
    vi.mocked(indexDependency).mockResolvedValue({
        success: true,
        ideaCount: 10,
        tagCount: 5,
        message: ''
    })
    
    // 直接访问并修改state
    state.value.dependencies = [mockDependency]
    
    await dependencyManager.indexDependency(mockDependency.id)
    
    expect(indexDependency).toHaveBeenCalledWith(mockDependency.path)
    
    const indexStatus = dependencyManager.getIndexStatus(mockDependency.id)
    expect(indexStatus).toBeDefined()
    expect(indexStatus?.loading).toBe(false)
    expect(indexStatus?.status).toBe('索引完成')
    expect(indexStatus?.ideaCount).toBe(10)
    expect(indexStatus?.tagCount).toBe(5)
  })
})
