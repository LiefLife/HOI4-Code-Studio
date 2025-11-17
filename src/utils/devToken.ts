/**
 * 开发者 Token 管理
 * 用于提供默认的更新检查 Token
 */

/**
 * 获取开发者 Token
 * @returns 开发者提供的 GitHub Token
 */
export function getDevToken(): string {
  // 从环境变量读取 Token，避免硬编码敏感信息
  return import.meta.env.VITE_GITHUB_TOKEN || ''
}

/**
 * 检查是否配置了开发者 Token
 * @returns 如果已配置返回 true
 */
export function hasDevToken(): boolean {
  return getDevToken().length > 0
}
