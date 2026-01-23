/*
  src/panels/index.js

  目标：作为“面板路由器”。

  因为同一个插件入口页面（index.html）会被不同 panel 复用：
  - hello-left
  - hello-right

  所以我们需要根据当前 panelId 决定挂载哪个面板逻辑。
*/

import { mountLeftPanel } from './left.js'
import { mountRightPanel } from './right.js'

/**
 * 根据 panelId 分发面板。
 * @param {ReturnType<import('../core/hostBridge.js').createHostBridge>} host
 * @param {{ outputEl: HTMLElement }} els
 */
export function mountPanel(host, els) {
  const ctx = host.getContext()
  const panelId = ctx.panelId || ctx.query.panelId

  if (panelId === 'hello-left') {
    mountLeftPanel(host, els)
    return
  }

  if (panelId === 'hello-right') {
    mountRightPanel(host, els)
    return
  }

  // 未知面板：输出调试信息。
  els.outputEl.textContent = `Unknown panelId: ${panelId}\n`
}
