/*
  src/main.js

  插件入口脚本：
  - 创建 host bridge（等待 hoics.host.ready 握手）
  - 绑定按钮事件
  - 根据 panelId 挂载不同面板逻辑

  你可以把这个文件当作“一个最小可运行插件的骨架”。
*/

import { qs, setText, on, appendOutput, clearOutput } from './shared/dom.js'
import { createHostBridge } from './core/hostBridge.js'
import { mountPanel } from './panels/index.js'

// ===== DOM 引用 =====
const panelTitleEl = qs('#panelTitle')
const panelMetaEl = qs('#panelMeta')
const btnPingEl = qs('#btnPing')
const btnLoadSettingsEl = qs('#btnLoadSettings')
const btnSaveSettingsEl = qs('#btnSaveSettings')
const btnListThemesEl = qs('#btnListThemes')
const outputEl = qs('#output')

// ===== Host Bridge =====
const host = createHostBridge()

function print(obj) {
  // 统一输出到 <pre><code>
  appendOutput(outputEl, String(obj) + '\n')
}

function printJson(obj) {
  appendOutput(outputEl, JSON.stringify(obj, null, 2) + '\n')
}

function setOutput(text) {
  clearOutput(outputEl)
  outputEl.textContent = text
}

// ===== 绑定事件（即使握手没来，也可以先绑定，等握手后再真正 invoke） =====
on(btnPingEl, 'click', () => {
  const ctx = host.getContext()
  setOutput('Ping Host (本按钮不调用后端，只展示当前上下文)\n\n')
  printJson(ctx)
})

on(btnLoadSettingsEl, 'click', async () => {
  setOutput('调用 load_settings...\n')
  try {
    const res = await host.invoke('load_settings', {})
    print('OK')
    printJson(res)
  } catch (e) {
    print('ERROR')
    print(String(e && e.message ? e.message : e))
  }
})

on(btnSaveSettingsEl, 'click', async () => {
  setOutput('调用 save_settings...\n')
  try {
    // 这里演示写入一个自定义字段：samplePluginHello
    // 注意：save_settings 的参数结构必须匹配后端命令签名。
    // 该项目的 API 约定：save_settings({ settings })，settings 是一个对象。
    // 但在 iframe 插件调用时，我们直接 invoke Rust command，参数名应与 Rust 侧一致。
    // 目前后端 `save_settings` 的参数是 { settings: ... }。

    const now = new Date().toISOString()

    // 先读旧设置，再合并。
    const oldRes = await host.invoke('load_settings', {})
    const oldSettings = (oldRes && oldRes.data) ? oldRes.data : (oldRes || {})

    const newSettings = {
      ...oldSettings,
      samplePluginHello: now
    }

    const res = await host.invoke('save_settings', { settings: newSettings })
    print('OK')
    printJson(res)
  } catch (e) {
    print('ERROR')
    print(String(e && e.message ? e.message : e))
  }
})

on(btnListThemesEl, 'click', async () => {
  setOutput('调用 list_themes（自定义主题列表）...\n')
  try {
    const res = await host.invoke('list_themes', {})
    print('OK')
    printJson(res)
  } catch (e) {
    print('ERROR')
    print(String(e && e.message ? e.message : e))
  }
})

// ===== 启动逻辑 =====

// 1) 先用 query 参数填充 UI（让你在“浏览器直接打开 index.html”时也能看到点东西）
{
  const ctx = host.getContext()
  setText(panelTitleEl, ctx.query.panelTitle || 'Panel')
  setText(panelMetaEl, `query: ${ctx.query.side}/${ctx.query.panelId} · plugin=${ctx.query.pluginId}`)
}

// 2) 等待宿主握手后刷新 UI + 挂载面板（这一步在 HOI4 Code Studio 里一定会触发）
host.whenReady().then(() => {
  const ctx = host.getContext()

  // 更新顶部信息（使用握手数据，最权威）
  setText(panelTitleEl, ctx.panelTitle || 'Panel')
  setText(panelMetaEl, `${ctx.side}/${ctx.panelId} · ${ctx.pluginName} · allowed=${(ctx.allowedCommands || []).length}`)

  // 挂载面板（根据 panelId 分发）
  mountPanel(host, { outputEl })

  // 给初次进入的用户一个提示
  appendOutput(outputEl, '\n\n---\n')
  appendOutput(outputEl, '提示：你可以点击上面的按钮测试 invoke；如果提示 Command not allowed，请检查 About.hoics.permissions.commands。\n')
})

// 3) 可选：在页面卸载时清理监听（一般不必，但写出来便于你学习）
window.addEventListener('beforeunload', () => {
  host.dispose()
})
