/**
 * 版本管理工具
 */

/**
 * 解析版本字符串为标签格式
 * @param version 版本字符串 (例如: "v0.1.1-dev" 或 "v0.1.1")
 * @returns 标签格式 (例如: "Dev_0_1_1" 或 "v0_1_1")
 */
export function parseVersionToTag(version: string): string {
  // 移除开头的 'v'
  const cleanVersion = version.startsWith('v') ? version.slice(1) : version
  
  // 检查是否包含 -dev 后缀
  if (cleanVersion.endsWith('-dev')) {
    // 移除 -dev 并替换点为下划线
    const versionNumbers = cleanVersion.replace('-dev', '').replace(/\./g, '_')
    return `Dev_${versionNumbers}`
  } else {
    // 替换点为下划线并添加 v 前缀
    const versionNumbers = cleanVersion.replace(/\./g, '_')
    return `v${versionNumbers}`
  }
}

/**
 * 将标签格式转换回版本字符串
 * @param tag 标签格式 (例如: "Dev_0_1_1" 或 "v0_1_1")
 * @returns 版本字符串 (例如: "v0.1.1-dev" 或 "v0.1.1")
 */
export function parseTagToVersion(tag: string): string {
  // 检查是否是 Dev 标签
  if (tag.startsWith('Dev_')) {
    // 移除 Dev_ 前缀，替换下划线为点，添加 v 前缀和 -dev 后缀
    const versionNumbers = tag.replace('Dev_', '').replace(/_/g, '.')
    return `v${versionNumbers}-dev`
  } else if (tag.startsWith('v')) {
    // 移除 v 前缀，替换下划线为点，重新添加 v 前缀
    const versionNumbers = tag.slice(1).replace(/_/g, '.')
    return `v${versionNumbers}`
  } else {
    // 如果格式不符合预期，直接返回原标签
    return tag
  }
}

/**
 * 比较两个版本号
 * @param version1 版本1 (例如: "0.1.1-dev")
 * @param version2 版本2 (例如: "0.2.0")
 * @returns 如果 version2 > version1 返回 true
 */
export function compareVersions(version1: string, version2: string): boolean {
  // 清理版本字符串
  const clean1 = version1.replace(/^v/, '').replace(/-dev$/, '')
  const clean2 = version2.replace(/^v/, '').replace(/-dev$/, '')
  
  const parts1 = clean1.split('.').map(Number)
  const parts2 = clean2.split('.').map(Number)
  
  // 比较主版本、次版本、补丁版本
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0
    const num2 = parts2[i] || 0
    
    if (num2 > num1) return true
    if (num2 < num1) return false
  }
  
  // 如果版本号相同，检查是否有 -dev 后缀
  // 正式版本 > dev 版本
  const isDev1 = version1.includes('-dev')
  const isDev2 = version2.includes('-dev')
  
  if (!isDev2 && isDev1) return true
  
  return false
}

/**
 * 从 GitHub 获取最新版本信息
 * @param currentVersion 当前版本
 * @returns 如果有新版本返回版本信息，否则返回 null
 */
export async function checkForUpdates(currentVersion: string): Promise<{
  hasUpdate: boolean
  latestVersion?: string
  releaseUrl?: string
  error?: string
}> {
  try {
    const response = await fetch('https://api.github.com/repos/LiefLife/HOI4-Code-Studio/releases/latest', {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`GitHub API 请求失败: ${response.status}`)
    }
    
    const data = await response.json()
    const tagName = data.tag_name // 例如: "v0_2_0" 或 "Dev_0_1_1"
    const releaseUrl = data.html_url
    
    // 将标签格式转换为版本格式
    const latestVersion = parseTagToVersion(tagName)
    
    // 比较版本
    const hasUpdate = compareVersions(currentVersion, latestVersion)
    
    return {
      hasUpdate,
      latestVersion,
      releaseUrl
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    return {
      hasUpdate: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}
