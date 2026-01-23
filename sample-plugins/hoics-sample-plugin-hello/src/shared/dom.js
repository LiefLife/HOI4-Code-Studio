/*
  src/shared/dom.js

  目标：把“DOM 相关的零碎操作”集中起来，避免在业务逻辑里到处写 querySelector。

  为什么要抽这个模块？
  - 写插件时，你会经常改 UI；把 DOM 工具收敛起来，能让其他模块更专注于业务。
  - 后续如果你把插件迁移到 Vue/React，这个模块就可以被替换或删除。
*/

/**
 * 便捷查询：返回首个匹配元素。
 * @param {string} selector CSS 选择器
 * @param {ParentNode} root 查询根节点（默认 document）
 */
export function qs(selector, root = document) {
  const el = root.querySelector(selector)
  return el
}

/**
 * 设置元素文本（如果元素不存在则静默忽略，便于开发阶段快速迭代）。
 * @param {Element | null | undefined} el
 * @param {string} text
 */
export function setText(el, text) {
  if (!el) return
  el.textContent = String(text)
}

/**
 * 绑定事件监听（如果元素不存在则静默忽略）。
 * @param {Element | null | undefined} el
 * @param {string} event
 * @param {(ev: any) => void} handler
 */
export function on(el, event, handler) {
  if (!el) return
  el.addEventListener(event, handler)
}

/**
 * 追加一段文本到 <pre><code> 输出区。
 * 这里故意不用 innerHTML，避免把字符串当 HTML 注入。
 * @param {HTMLElement} codeEl
 * @param {string} text
 */
export function appendOutput(codeEl, text) {
  if (!codeEl) return
  const prev = codeEl.textContent ?? ''
  const next = prev + String(text)
  codeEl.textContent = next
}

/**
 * 清空输出区。
 * @param {HTMLElement} codeEl
 */
export function clearOutput(codeEl) {
  if (!codeEl) return
  codeEl.textContent = ''
}
