import type { IdeaEntry, IdeaLoadResponse } from '../api/tauri'
import { loadIdeas, resetIdeaCache } from '../api/tauri'
import { logger } from './logger'

let projectRootPath: string | undefined
let gameRootPath: string | undefined
let ideaEntries: IdeaEntry[] = []
let ideaSet: Set<string> = new Set()
let statusMessage = '尚未加载idea'
let lastKey = ''
let refreshing: Promise<IdeaLoadResponse> | null = null
let lastResponse: IdeaLoadResponse = {
  success: false,
  message: statusMessage,
  ideas: []
}

function normalizePath(path?: string): string {
  return (path || '').replace(/\\/g, '/').replace(/\/+/g, '/').trim()
}

export function setRoots(projectRoot?: string, gameDirectory?: string) {
  projectRootPath = normalizePath(projectRoot) || undefined
  gameRootPath = normalizePath(gameDirectory) || undefined
  lastKey = ''
}

export function getRegistry(): Set<string> {
  return ideaSet
}

export function getEntries(): IdeaEntry[] {
  return ideaEntries
}

export function getStatus(): string {
  return statusMessage
}

export function getLastResponse(): IdeaLoadResponse {
  return lastResponse
}

function computeCacheKey(): string {
  return `${projectRootPath ?? ''}||${gameRootPath ?? ''}`
}

export function ensureRefreshed(): Promise<IdeaLoadResponse> {
  const key = computeCacheKey()

  if (refreshing) {
    return refreshing
  }

  if (key === lastKey && ideaEntries.length > 0) {
    return Promise.resolve(lastResponse)
  }

  lastKey = key
  refreshing = (async () => {
    try {
      const response = await loadIdeas(projectRootPath, gameRootPath)
      lastResponse = response

      if (response.success && response.ideas) {
        ideaEntries = response.ideas
        ideaSet = new Set(response.ideas.map((idea) => idea.id))
        statusMessage = `已加载 ${ideaEntries.length} 个idea`
      } else {
        ideaEntries = response.ideas ?? []
        ideaSet = new Set(ideaEntries.map((idea) => idea.id))
        statusMessage = response.message || 'idea加载失败'
      }
      return response
    } catch (error) {
      const message = `idea加载失败: ${String(error)}`
      statusMessage = message
      ideaEntries = []
      ideaSet = new Set()
      lastResponse = {
        success: false,
        message,
        ideas: []
      }
      return lastResponse
    } finally {
      refreshing = null
    }
  })()

  return refreshing
}

export async function clearIdeaCache() {
  try {
    await resetIdeaCache()
  } catch (error) {
    logger.error('重置idea缓存失败:', error)
  }
  ideaEntries = []
  ideaSet = new Set()
  statusMessage = '缓存已清空'
  lastResponse = {
    success: false,
    message: statusMessage,
    ideas: []
  }
  lastKey = ''
}
