import type { TagEntry, TagLoadResponse } from '../api/tauri'
import { loadCountryTags } from '../api/tauri'

let projectRootPath: string | undefined
let gameRootPath: string | undefined
let dependencyRootPaths: string[] = []
let tagEntries: TagEntry[] = []
let tagSet: Set<string> = new Set()
let statusMessage = ''
let lastKey = ''
let refreshing: Promise<TagLoadResponse> | null = null
let lastResponse: TagLoadResponse = {
  success: false,
  message: '尚未加载tag',
  tags: []
}

function normalizePath(path?: string): string {
  return (path || '').replace(/\\/g, '/').replace(/\/+/g, '/').trim()
}

export function setTagRoots(projectRoot?: string, gameRoot?: string, dependencyRoots?: string[]) {
  projectRootPath = normalizePath(projectRoot) || undefined
  gameRootPath = normalizePath(gameRoot) || undefined
  dependencyRootPaths = (dependencyRoots || []).map(p => normalizePath(p)).filter(Boolean)
  // 强制下次刷新
  lastKey = ''
}

export function getRegistry(): Set<string> {
  return tagSet
}

export function getEntries(): TagEntry[] {
  return tagEntries
}

export function getStatus(): string {
  return statusMessage
}

export function getLastResponse(): TagLoadResponse {
  return lastResponse
}

export function getRoots(): { projectRoot?: string; gameRoot?: string; dependencyRoots: string[] } {
  return {
    projectRoot: projectRootPath,
    gameRoot: gameRootPath,
    dependencyRoots: dependencyRootPaths
  }
}

export function ensureRefreshed(): Promise<TagLoadResponse> {
  const key = `${projectRootPath ?? ''}||${gameRootPath ?? ''}||${dependencyRootPaths.join('|')}`

  if (refreshing) {
    return refreshing
  }

  if (key === lastKey && tagEntries.length > 0) {
    return Promise.resolve(lastResponse)
  }

  lastKey = key

  refreshing = (async () => {
    try {
      const response = await loadCountryTags(projectRootPath, gameRootPath, dependencyRootPaths)
      lastResponse = response

      if (response.success && response.tags) {
        tagEntries = response.tags
        tagSet = new Set(response.tags.map(tag => tag.code.toUpperCase()))
        statusMessage = `已加载 ${tagEntries.length} 个tag`
      } else {
        tagEntries = response.tags ?? []
        tagSet = new Set(tagEntries.map(tag => tag.code.toUpperCase()))
        statusMessage = response.message || 'tag加载失败'
      }
      return response
    } catch (error) {
      const message = `tag加载失败: ${String(error)}`
      statusMessage = message
      tagEntries = []
      tagSet = new Set()
      lastResponse = {
        success: false,
        message,
        tags: []
      }
      return lastResponse
    } finally {
      refreshing = null
    }
  })()

  return refreshing
}
