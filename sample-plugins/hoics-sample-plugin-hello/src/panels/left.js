/*
  src/panels/left.js

  左侧面板示例：展示宿主上下文 + 允许的命令列表。

  你在 About.hoics 里声明：
    contributes.left_sidebar = [{ id: 'hello-left', title: 'Hello (Left)' }]

  宿主会在左侧“插件”标签页渲染一个 iframe，并通过 query + handshake 把 panelId=hello-left 告诉你。
*/

import { appendOutput, clearOutput } from '../shared/dom.js'

/**
 * 渲染左侧面板内容。
 * @param {import('../core/hostBridge.js').createHostBridge} _unused 这里仅示意类型，实际 JS 不需要
 */
export function mountLeftPanel(host, els) {
  const { outputEl } = els

  clearOutput(outputEl)
  appendOutput(outputEl, '你正在查看：左侧面板（hello-left）\n\n')

  const ctx = host.getContext()

  appendOutput(outputEl, '宿主上下文（来自 query + hoics.host.ready）：\n')
  appendOutput(outputEl, JSON.stringify(ctx, null, 2) + '\n\n')

  appendOutput(outputEl, '提示：左侧面板主要用来放“导航/树/工具”等常驻功能。\n')
}
