import { describe, it, expect } from 'vitest'
import type { 
  DependencyType, 
  Dependency, 
  DependencyValidation, 
  DependencyLoadResult, 
  DependencySaveResult,
  DependencyIndexStatus
} from '@/types/dependency'

describe('依赖项类型定义测试', () => {
  describe('DependencyType 类型测试', () => {
    it('应该正确表示 HOICS 项目类型', () => {
      const type: DependencyType = 'hoics'
      expect(type).toBe('hoics')
      expect(['hoics', 'hoi4mod']).toContain(type)
    })

    it('应该正确表示普通 HOI4 Mod 类型', () => {
      const type: DependencyType = 'hoi4mod'
      expect(type).toBe('hoi4mod')
      expect(['hoics', 'hoi4mod']).toContain(type)
    })
  })

  describe('Dependency 接口测试', () => {
    it('应该正确创建有效的依赖项对象', () => {
      const dependency: Dependency = {
        id: 'test-dep-1',
        name: 'Test Dependency',
        path: 'd:/test/path',
        type: 'hoics',
        addedAt: '2023-01-01T00:00:00Z',
        enabled: true
      }

      expect(dependency.id).toBe('test-dep-1')
      expect(dependency.name).toBe('Test Dependency')
      expect(dependency.path).toBe('d:/test/path')
      expect(dependency.type).toBe('hoics')
      expect(dependency.addedAt).toBe('2023-01-01T00:00:00Z')
      expect(dependency.enabled).toBe(true)
    })

    it('应该支持禁用状态的依赖项', () => {
      const dependency: Dependency = {
        id: 'test-dep-2',
        name: 'Disabled Dependency',
        path: 'd:/disabled/path',
        type: 'hoi4mod',
        addedAt: '2023-01-02T00:00:00Z',
        enabled: false
      }

      expect(dependency.enabled).toBe(false)
      expect(dependency.type).toBe('hoi4mod')
    })
  })

  describe('DependencyValidation 接口测试', () => {
    it('应该正确表示有效的依赖项验证结果', () => {
      const validation: DependencyValidation = {
        valid: true,
        message: '依赖项有效',
        name: 'Valid Dependency',
        type: 'hoics'
      }

      expect(validation.valid).toBe(true)
      expect(validation.message).toBe('依赖项有效')
      expect(validation.name).toBe('Valid Dependency')
      expect(validation.type).toBe('hoics')
    })

    it('应该正确表示无效的依赖项验证结果', () => {
      const validation: DependencyValidation = {
        valid: false,
        message: '依赖项路径不存在'
      }

      expect(validation.valid).toBe(false)
      expect(validation.message).toBe('依赖项路径不存在')
      expect(validation.name).toBeUndefined()
      expect(validation.type).toBeUndefined()
    })
  })

  describe('DependencyLoadResult 接口测试', () => {
    it('应该正确表示成功的依赖项加载结果', () => {
      const dependencies: Dependency[] = [
        {
          id: 'dep-1',
          name: 'Dep 1',
          path: 'd:/dep1',
          type: 'hoics',
          addedAt: '2023-01-01T00:00:00Z',
          enabled: true
        },
        {
          id: 'dep-2',
          name: 'Dep 2',
          path: 'd:/dep2',
          type: 'hoi4mod',
          addedAt: '2023-01-02T00:00:00Z',
          enabled: false
        }
      ]

      const result: DependencyLoadResult = {
        success: true,
        message: '依赖项加载成功',
        dependencies
      }

      expect(result.success).toBe(true)
      expect(result.message).toBe('依赖项加载成功')
      expect(result.dependencies).toEqual(dependencies)
      expect(result.dependencies?.length).toBe(2)
    })

    it('应该正确表示失败的依赖项加载结果', () => {
      const result: DependencyLoadResult = {
        success: false,
        message: '加载依赖项失败，文件不存在'
      }

      expect(result.success).toBe(false)
      expect(result.message).toBe('加载依赖项失败，文件不存在')
      expect(result.dependencies).toBeUndefined()
    })
  })

  describe('DependencySaveResult 接口测试', () => {
    it('应该正确表示成功的依赖项保存结果', () => {
      const result: DependencySaveResult = {
        success: true,
        message: '依赖项保存成功'
      }

      expect(result.success).toBe(true)
      expect(result.message).toBe('依赖项保存成功')
    })

    it('应该正确表示失败的依赖项保存结果', () => {
      const result: DependencySaveResult = {
        success: false,
        message: '保存依赖项失败，权限不足'
      }

      expect(result.success).toBe(false)
      expect(result.message).toBe('保存依赖项失败，权限不足')
    })
  })

  describe('DependencyIndexStatus 接口测试', () => {
    it('应该正确表示正在加载的依赖项索引状态', () => {
      const status: DependencyIndexStatus = {
        dependencyId: 'dep-1',
        loading: true,
        status: '正在索引依赖项...',
        ideaCount: 0,
        tagCount: 0
      }

      expect(status.dependencyId).toBe('dep-1')
      expect(status.loading).toBe(true)
      expect(status.status).toBe('正在索引依赖项...')
      expect(status.ideaCount).toBe(0)
      expect(status.tagCount).toBe(0)
    })

    it('应该正确表示已完成的依赖项索引状态', () => {
      const status: DependencyIndexStatus = {
        dependencyId: 'dep-2',
        loading: false,
        status: '索引完成',
        ideaCount: 15,
        tagCount: 25
      }

      expect(status.loading).toBe(false)
      expect(status.status).toBe('索引完成')
      expect(status.ideaCount).toBe(15)
      expect(status.tagCount).toBe(25)
    })
  })

  describe('类型兼容性测试', () => {
    it('所有依赖项相关类型应该兼容', () => {
      // 创建测试数据
      const dependency: Dependency = {
        id: 'test-compat',
        name: 'Compat Dependency',
        path: 'd:/compat/path',
        type: 'hoics',
        addedAt: '2023-01-01T00:00:00Z',
        enabled: true
      }

      const validation: DependencyValidation = {
        valid: true,
        message: '兼容测试',
        name: dependency.name,
        type: dependency.type
      }

      const loadResult: DependencyLoadResult = {
        success: true,
        message: '兼容测试成功',
        dependencies: [dependency]
      }

      const saveResult: DependencySaveResult = {
        success: true,
        message: '兼容测试保存成功'
      }

      const indexStatus: DependencyIndexStatus = {
        dependencyId: dependency.id,
        loading: false,
        status: '兼容测试索引完成',
        ideaCount: 5,
        tagCount: 10
      }

      // 验证所有类型可以一起使用
      expect(validation.name).toBe(dependency.name)
      expect(loadResult.dependencies?.[0].id).toBe(dependency.id)
      expect(indexStatus.dependencyId).toBe(dependency.id)
      expect(saveResult.success).toBe(true)
    })
  })
})
