/**
 * 依赖项类型定义
 */

/**
 * 依赖项类型
 * - hoics: HOICS 项目
 * - hoi4mod: 普通 HOI4 Mod
 */
export type DependencyType = 'hoics' | 'hoi4mod'

/**
 * 依赖项接口
 */
export interface Dependency {
  /** 依赖项唯一ID */
  id: string
  /** 依赖项名称 */
  name: string
  /** 依赖项路径 */
  path: string
  /** 依赖项类型 */
  type: DependencyType
  /** 添加时间 */
  addedAt: string
  /** 是否启用 */
  enabled: boolean
}

/**
 * 依赖项验证结果
 */
export interface DependencyValidation {
  /** 是否有效 */
  valid: boolean
  /** 验证消息 */
  message: string
  /** 依赖项名称（如果找到） */
  name?: string
  /** 依赖项类型（如果找到） */
  type?: DependencyType
}

/**
 * 依赖项加载结果
 */
export interface DependencyLoadResult {
  /** 是否成功 */
  success: boolean
  /** 消息 */
  message: string
  /** 依赖项列表 */
  dependencies?: Dependency[]
}

/**
 * 依赖项保存结果
 */
export interface DependencySaveResult {
  /** 是否成功 */
  success: boolean
  /** 消息 */
  message: string
}

/**
 * 依赖项索引状态
 */
export interface DependencyIndexStatus {
  /** 依赖项ID */
  dependencyId: string
  /** 是否正在加载 */
  loading: boolean
  /** 状态消息 */
  status: string
  /** Idea 数量 */
  ideaCount: number
  /** Tag 数量 */
  tagCount: number
}
