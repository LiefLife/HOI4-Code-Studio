/*
  src/core/hostBridge.js

  目标：管理“宿主上下文”，并提供：
  - 读取 query 参数（宿主会把 pluginId/side/panelId 等写入 iframe src 的 query）
  - 等待宿主握手消息 hoics.host.ready
  - 创建 invoke 客户端（见 invoke.js）

  你写真实插件时，通常会把“与宿主通信”的代码集中在 core/ 下。
  业务模块（panels/）只关心：
  - 我现在在哪个面板？
  - 我可以调用哪些 command？
  - 如何 invoke？
*/

import { createInvokeClient } from './invoke.js'

/**
 * 解析 query 参数。
 * 宿主在 iframe src 上拼了这些参数（见 PluginIframeHost.vue 的 queryString 逻辑）：
 * - hoicsPlugin
 * - hoicsPluginName
 * - hoicsSide
 * - hoicsPanel
 * - hoicsPanelTitle
 */
function readQuery() {
  const url = new URL(window.location.href)
  const params = url.searchParams
  return {
    pluginId: params.get('hoicsPlugin') || '',
    pluginName: params.get('hoicsPluginName') || '',
    side: params.get('hoicsSide') || '',
    panelId: params.get('hoicsPanel') || '',
    panelTitle: params.get('hoicsPanelTitle') || ''
  }
}

/**
 * 创建宿主桥接。
 *
 * 使用方式：
 *   const host = createHostBridge()
 *   await host.whenReady()
 *   const data = await host.invoke('load_settings')
 */
export function createHostBridge() {
  const query = readQuery()

  // ready 由 hoics.host.ready 消息触发。
  let ready = false

  // 宿主握手信息（来源：PluginIframeHost.vue postInitHandshake）。
  const handshake = {
    pluginId: query.pluginId,
    pluginName: query.pluginName,
    side: query.side,
    panelId: query.panelId,
    panelTitle: query.panelTitle,
    allowedCommands: []
  }

  /** @type {Array<() => void>} */
  const readyListeners = []

  function onMessage(ev) {
    const data = ev.data
    if (!data || data.type !== 'hoics.host.ready') return

    // 宿主不会广播给所有 iframe：它会对每个 iframeRef.contentWindow 单独 postMessage。
    // 所以这里通常不需要检查 source，但你也可以加上。

    ready = true

    handshake.pluginId = String(data.pluginId || handshake.pluginId)
    handshake.pluginName = String(data.pluginName || handshake.pluginName)
    handshake.side = String(data.side || handshake.side)
    handshake.panelId = String(data.panelId || handshake.panelId)
    handshake.panelTitle = String(data.panelTitle || handshake.panelTitle)
    handshake.allowedCommands = Array.isArray(data.allowedCommands) ? data.allowedCommands : []

    // 通知等待者。
    while (readyListeners.length > 0) {
      const fn = readyListeners.shift()
      try {
        fn && fn()
      } catch (_e) {
      }
    }
  }

  window.addEventListener('message', onMessage)

  const invokeClient = createInvokeClient(() => ready)

  function whenReady() {
    if (ready) return Promise.resolve()
    return new Promise(resolve => {
      readyListeners.push(resolve)
    })
  }

  function isReady() {
    return ready
  }

  function getContext() {
    // 返回一份浅拷贝，避免业务层直接改内部状态。
    return {
      ...handshake,
      query: { ...query }
    }
  }

  function invoke(command, payload) {
    return invokeClient.invoke(command, payload)
  }

  function dispose() {
    window.removeEventListener('message', onMessage)
    invokeClient.dispose()
  }

  return {
    whenReady,
    isReady,
    getContext,
    invoke,
    dispose
  }
}
