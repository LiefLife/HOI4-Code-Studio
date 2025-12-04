/**
 * 简化的图片处理Web Worker
 * 主要用于异步任务调度和缓存管理
 * 实际的API调用仍在主线程进行（避免Worker中导入Tauri API的复杂性）
 */

// 定义消息类型
interface ImageLoadTask {
  id: string
  iconName: string
  projectPath?: string
  gameDirectory?: string
  priority: 'high' | 'normal' | 'low'
}

interface ImageLoadResult {
  id: string
  success: boolean
  dataUrl?: string
  error?: string
}

interface WorkerMessage {
  type: 'load' | 'result' | 'error' | 'cache'
  task?: ImageLoadTask
  result?: ImageLoadResult
  cacheData?: { iconName: string; dataUrl: string }
}

// 图片缓存（Worker内存）
const workerCache = new Map<string, string>()

/**
 * 模拟图片加载（实际加载由主线程处理）
 * 这里主要用于演示Worker的任务调度能力
 */
async function simulateImageLoad(task: ImageLoadTask): Promise<ImageLoadResult> {
  const { id, iconName } = task

  try {
    // 检查Worker内存缓存
    if (workerCache.has(iconName)) {
      return {
        id,
        success: true,
        dataUrl: workerCache.get(iconName)!
      }
    }

    // 模拟加载延迟（实际中这里应该请求主线程进行加载）
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50))

    // 这里返回一个占位结果，实际的数据由主线程处理
    return {
      id,
      success: false,
      error: 'Worker模式：请使用主线程API进行实际加载'
    }

  } catch (error) {
    return {
      id,
      success: false,
      error: error instanceof Error ? error.message : '加载异常'
    }
  }
}

/**
 * 添加缓存数据（由主线程调用）
 */
function addCache(iconName: string, dataUrl: string) {
  workerCache.set(iconName, dataUrl)
}

/**
 * 处理主线程消息
 */
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, task, cacheData } = event.data

  switch (type) {
    case 'load':
      if (task) {
        const loadResult = await simulateImageLoad(task)
        self.postMessage({
          type: 'result',
          result: loadResult
        } as WorkerMessage)
      }
      break

    case 'cache':
      if (cacheData) {
        addCache(cacheData.iconName, cacheData.dataUrl)
      }
      break

    default:
      console.warn('Worker: 未知消息类型', type)
  }
})

/**
 * 清理缓存
 */
function clearCache() {
  workerCache.clear()
}

/**
 * 获取缓存统计
 */
function getCacheStats() {
  return {
    size: workerCache.size,
    memoryUsage: Array.from(workerCache.values())
      .reduce((total, dataUrl) => total + dataUrl.length, 0)
  }
}

// 导出给主线程调用的接口
export { clearCache, getCacheStats }