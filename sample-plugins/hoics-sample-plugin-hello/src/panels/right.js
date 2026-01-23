/*
  src/panels/right.js

  右侧面板示例：更偏“交互/表单/信息展示”。
  这里演示：点击按钮后，通过 host.invoke 调用后端命令，并把结果输出到 <pre><code>。
*/

import { appendOutput, clearOutput } from '../shared/dom.js'

export function mountRightPanel(host, els) {
  const { outputEl } = els

  clearOutput(outputEl)
  appendOutput(outputEl, '你正在查看：右侧面板（hello-right）\n')
  appendOutput(outputEl, '提示：右侧面板适合放项目/搜索/诊断等辅助信息。\n')

  const ctx = host.getContext()
  appendOutput(outputEl, `允许的命令（permissions.commands）：${(ctx.allowedCommands || []).join(', ') || '(none)'}\n\n`)
}
