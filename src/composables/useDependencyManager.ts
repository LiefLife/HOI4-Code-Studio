import { ref, computed } from 'vue'
import type {
  Dependency,
  DependencyValidation,
  DependencyLoadResult,
  DependencySaveResult,
  DependencyIndexStatus
} from '../types/dependency'
import {
  loadDependencies,
  saveDependencies,
  validateDependencyPath,
  indexDependency
} from '../api/tauri'
import { logger } from '../utils/logger'

/**
 * 依赖项管理状态
 */
interface DependencyManagerState {
  /** 依赖项列表 */
  dependencies: Dependency[]
  /** 是否正在加载 */
  loading: boolean
  /** 索引状态映射 */
  indexStatuses: Map<string, DependencyIndexStatus>
  /** 当前项目路径 */
  projectPath: string
}

const state = ref<DependencyManagerState>({
  dependencies: [],
  loading: false,
  indexStatuses: new Map(),
  projectPath: ''
})

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 依赖项管理 Composable
 */
export function useDependencyManager(projectPath?: string) {
  if (projectPath) {
    state.value.projectPath = projectPath
  }

  /**
   * 加载依赖项列表
   */
  async function loadDependenciesList(): Promise<DependencyLoadResult> {
    if (!state.value.projectPath) {
      return {
        success: false,
        message: '项目路径未设置'
      }
    }

    state.value.loading = true
    try {
      const result = await loadDependencies(state.value.projectPath)
      if (result.success && result.dependencies) {
        state.value.dependencies = result.dependencies
      }
      return result
    } catch (error) {
      logger.error('加载依赖项失败:', error)
      return {
        success: false,
        message: `加载失败: ${error}`
      }
    } finally {
      state.value.loading = false
    }
  }

  /**
   * 保存依赖项列表
   */
  async function saveDependenciesList(): Promise<DependencySaveResult> {
    if (!state.value.projectPath) {
      return {
        success: false,
        message: '项目路径未设置'
      }
    }

    try {
      const result = await saveDependencies(
        state.value.projectPath,
        state.value.dependencies
      )
      return result
    } catch (error) {
      logger.error('保存依赖项失败:', error)
      return {
        success: false,
        message: `保存失败: ${error}`
      }
    }
  }

  /**
   * 验证依赖项路径
   */
  async function validatePath(path: string): Promise<DependencyValidation> {
    try {
      const result = await validateDependencyPath(path)
      return result
    } catch (error) {
      logger.error('验证依赖项路径失败:', error)
      return {
        valid: false,
        message: `验证失败: ${error}`
      }
    }
  }

  /**
   * 添加依赖项
   */
  async function addDependency(path: string): Promise<{ success: boolean; message: string }> {
    // 验证路径
    const validation = await validatePath(path)
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message
      }
    }

    // 检查是否已存在
    const exists = state.value.dependencies.some(dep => dep.path === path)
    if (exists) {
      return {
        success: false,
        message: '该依赖项已存在'
      }
    }

    // 添加依赖项
    const newDependency: Dependency = {
      id: generateId(),
      name: validation.name || '未知项目',
      path,
      type: validation.type || 'hoi4mod',
      addedAt: new Date().toISOString(),
      enabled: true
    }

    state.value.dependencies.push(newDependency)

    // 保存到文件
    const saveResult = await saveDependenciesList()
    if (!saveResult.success) {
      // 如果保存失败，回滚
      state.value.dependencies = state.value.dependencies.filter(
        dep => dep.id !== newDependency.id
      )
      return saveResult
    }

    return {
      success: true,
      message: '依赖项添加成功'
    }
  }

  /**
   * 删除依赖项
   */
  async function removeDependency(id: string): Promise<{ success: boolean; message: string }> {
    const index = state.value.dependencies.findIndex(dep => dep.id === id)
    if (index === -1) {
      return {
        success: false,
        message: '依赖项不存在'
      }
    }

    // 移除依赖项
    const removed = state.value.dependencies.splice(index, 1)

    // 保存到文件
    const saveResult = await saveDependenciesList()
    if (!saveResult.success) {
      // 如果保存失败，回滚
      state.value.dependencies.splice(index, 0, ...removed)
      return saveResult
    }

    // 清除索引状态
    state.value.indexStatuses.delete(id)

    return {
      success: true,
      message: '依赖项删除成功'
    }
  }

  /**
   * 切换依赖项启用状态
   */
  async function toggleDependency(id: string): Promise<{ success: boolean; message: string }> {
    const dependency = state.value.dependencies.find(dep => dep.id === id)
    if (!dependency) {
      return {
        success: false,
        message: '依赖项不存在'
      }
    }

    dependency.enabled = !dependency.enabled

    // 保存到文件
    const saveResult = await saveDependenciesList()
    if (!saveResult.success) {
      // 如果保存失败，回滚
      dependency.enabled = !dependency.enabled
      return saveResult
    }

    return {
      success: true,
      message: `依赖项已${dependency.enabled ? '启用' : '禁用'}`
    }
  }

  /**
   * 索引依赖项
   */
  async function indexDependencyData(id: string): Promise<void> {
    const dependency = state.value.dependencies.find(dep => dep.id === id)
    if (!dependency || !dependency.enabled) {
      return
    }

    // 设置索引状态
    state.value.indexStatuses.set(id, {
      dependencyId: id,
      loading: true,
      status: '正在索引...',
      ideaCount: 0,
      tagCount: 0
    })

    try {
      const result = await indexDependency(dependency.path)
      
      state.value.indexStatuses.set(id, {
        dependencyId: id,
        loading: false,
        status: result.success ? '索引完成' : result.message,
        ideaCount: result.ideaCount || 0,
        tagCount: result.tagCount || 0
      })
    } catch (error) {
      logger.error('索引依赖项失败:', error)
      state.value.indexStatuses.set(id, {
        dependencyId: id,
        loading: false,
        status: `索引失败: ${error}`,
        ideaCount: 0,
        tagCount: 0
      })
    }
  }

  /**
   * 索引所有已启用的依赖项
   */
  async function indexAllDependencies(): Promise<void> {
    const enabledDeps = state.value.dependencies.filter(dep => dep.enabled)
    for (const dep of enabledDeps) {
      await indexDependencyData(dep.id)
    }
  }

  /**
   * 获取依赖项索引状态
   */
  function getIndexStatus(id: string): DependencyIndexStatus | undefined {
    return state.value.indexStatuses.get(id)
  }

  // Computed properties
  const dependenciesList = computed(() => state.value.dependencies)
  const enabledDependencies = computed(() => 
    state.value.dependencies.filter(dep => dep.enabled)
  )
  const isLoading = computed(() => state.value.loading)
  const dependencyCount = computed(() => state.value.dependencies.length)

  return {
    // State
    dependencies: dependenciesList,
    enabledDependencies,
    isLoading,
    dependencyCount,

    // Methods
    loadDependencies: loadDependenciesList,
    saveDependencies: saveDependenciesList,
    addDependency,
    removeDependency,
    toggleDependency,
    validatePath,
    indexDependency: indexDependencyData,
    indexAllDependencies,
    getIndexStatus,

    // Utility
    setProjectPath: (path: string) => {
      state.value.projectPath = path
    }
  }
}
