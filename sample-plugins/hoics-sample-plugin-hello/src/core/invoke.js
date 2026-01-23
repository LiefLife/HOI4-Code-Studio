/*
  src/core/invoke.js

  目标：封装插件 -> 宿主 的 `hoics.invoke` 调用协议。

  协议回顾（宿主侧实现见：src/components/plugins/PluginIframeHost.vue）：

  插件发起：
    window.parent.postMessage({
      type: 'hoics.invoke',
      id: 'req-xxx',
      command: 'load_settings',
      payload: { ... }
    }, '*')

  宿主响应：
    window.postMessage({
      type: 'hoics.invoke.result',
      id: 'req-xxx',
      ok: true,
      data: <invoke result>
    }, '*')

  或失败：
    { type: 'hoics.invoke.result', id, ok: false, error: '...' }

  注意：
  - command 是否允许由 About.hoics.permissions.commands 白名单控制。
  - 本示例使用 '*' 作为 postMessage 的 targetOrigin（宿主也使用 '*'）。
    真实产品里建议更严格的 origin 校验。
*/

/**
 * @typedef {Object} InvokeRequest
 * @property {'hoics.invoke'} type
 * @property {string} id
 * @property {string} command
 * @property {any=} payload
 */

/**
 * @typedef {Object} InvokeResponse
 * @property {'hoics.invoke.result'} type
 * @property {string} id
 * @property {boolean} ok
 * @property {any=} data
 * @property {string=} error
 */

function makeId() {
  // 生成请求 id：时间戳 + 随机数。
  // 只要在同一个 iframe 内不重复即可。
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

/**
 * 创建一个 invoke 客户端。
 *
 * @param {() => boolean} isHostReady 用于判断是否已与宿主握手成功
 * @param {number=} timeoutMs 单次请求超时（默认 10 秒）
 */
export function createInvokeClient(isHostReady, timeoutMs = 10000) {
  /** @type {Map<string, {resolve: Function, reject: Function, timer: any}>} */
  const pending = new Map()

  function onMessage(ev) {
    const data = ev.data
    if (!data || data.type !== 'hoics.invoke.result') return

    /** @type {InvokeResponse} */
    const resp = data
    const item = pending.get(resp.id)
    if (!item) return

    clearTimeout(item.timer)
    pending.delete(resp.id)

    if (resp.ok) {
      item.resolve(resp.data)
    } else {
      item.reject(new Error(resp.error || 'Unknown invoke error'))
    }
  }

  // 监听宿主响应。
  window.addEventListener('message', onMessage)

  /**
   * 发起 invoke。
   *
   * @param {string} command 后端 command 名称（必须在 permissions.commands 中）
   * @param {any=} payload invoke 参数对象（对应 Rust command 的参数名）
   */
  function invoke(command, payload) {
    if (!isHostReady()) {
      return Promise.reject(new Error('Host not ready (hoics.host.ready not received).'))
    }

    const id = makeId()

    /** @type {InvokeRequest} */
    const req = {
      type: 'hoics.invoke',
      id,
      command,
      payload: payload || {}
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`Invoke timeout: ${command}`))
      }, timeoutMs)

      pending.set(id, { resolve, reject, timer })

      // 发送给宿主（父窗口）。
      // 这里 targetOrigin 使用 '*'，因为 Tauri file / custom scheme 场景下 origin 不稳定。
      window.parent.postMessage(req, '*')
    })
  }

  /**
   * 清理函数：在插件做 SPA 路由或热重载时可用。
   */
  function dispose() {
    window.removeEventListener('message', onMessage)
    for (const [, p] of pending) {
      clearTimeout(p.timer)
    }
    pending.clear()
  }

  return {
    invoke,
    dispose
  }
}
