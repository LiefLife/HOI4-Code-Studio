/**
 * 开发者 Token 管理
 * 用于提供默认的更新检查 Token
 */

/**
 * 获取开发者 Token
 * @returns GitHub Token（当前使用未认证访问，返回空字符串）
 */
export function getDevToken(): string {
  // 使用未认证访问 GitHub API (60次/小时限制)
  return ''
}

/**
 * 检查是否配置了开发者 Token
 * @returns 如果已配置返回 true
 */
export function hasDevToken(): boolean {
  return getDevToken().length > 0
}
