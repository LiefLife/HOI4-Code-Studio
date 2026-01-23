<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { readFileContent, readImageAsBase64 } from '../../api/tauri'

const props = defineProps<{
  entryFilePath: string
  pluginId: string
  pluginName: string
  side: 'left' | 'right'
  panelId: string
  panelTitle: string
  allowedCommands: string[]
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const iframeSrc = ref<string>('')
const iframeSrcDoc = ref<string>('')

function isTauriRuntime() {
  const w = window as any
  return !!(w.__TAURI__ || w.__TAURI_INTERNALS__)
}

function toFileUrl(filePath: string): string {
  return `file://${filePath.replace(/\\/g, '/')}`
}

function injectHostScript(html: string, baseHref: string, query: string): string {
  const injection = `<base href="${baseHref}">\n<script>window.__HOICS_QUERY__=${JSON.stringify(query)};<\/script>`
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, match => `${match}\n${injection}`)
  }
  return `${injection}\n${html}`
}

function stripQueryHash(value: string): string {
  return value.split('#')[0]?.split('?')[0] || value
}

function normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  const stack: string[] = []
  for (const part of parts) {
    if (part === '.') continue
    if (part === '..') {
      stack.pop()
      continue
    }
    stack.push(part)
  }
  return stack.join('/')
}

function resolveLocalPath(entryFilePath: string, ref: string): string | null {
  const cleaned = stripQueryHash(ref).replace(/\\/g, '/')
  if (!cleaned) return null
  if (/^[a-zA-Z]+:/.test(cleaned) && !/^[A-Za-z]:/.test(cleaned)) return null
  if (/^\/\//.test(cleaned)) return null

  if (/^[A-Za-z]:/.test(cleaned)) {
    return cleaned
  }

  const baseDir = entryFilePath.replace(/\\/g, '/').replace(/\/[^/]*$/, '')
  if (cleaned.startsWith('/')) {
    const drive = baseDir.match(/^[A-Za-z]:/)
    const normalized = normalizePath(cleaned)
    return drive ? `${drive[0]}${normalized}` : normalized
  }

  const combined = `${baseDir}/${cleaned}`
  const drive = combined.match(/^[A-Za-z]:/)
  const rest = drive ? combined.slice(drive[0].length) : combined
  const normalized = normalizePath(rest)
  return `${drive ? drive[0] : ''}${normalized}`
}

function sanitizeScriptAttrs(attrs: string): string {
  return attrs.replace(/\s*src=["'][^"']+["']/i, '').trim()
}

function toBase64(content: string): string {
  return btoa(unescape(encodeURIComponent(content)))
}

const moduleUrlCache = new Map<string, string>()

async function rewriteModuleImports(content: string, modulePath: string): Promise<string> {
  const importRegex = /(?:import\s+(?:[^"']+?\s+from\s+)?|export\s+[^"']*?\s+from\s+)["']([^"']+)["']/g
  let output = ''
  let lastIndex = 0

  for (const match of content.matchAll(importRegex)) {
    const start = match.index ?? 0
    const full = match[0]
    const spec = match[1]
    output += content.slice(lastIndex, start)

    const resolved = resolveLocalPath(modulePath, spec)
    if (!resolved) {
      output += full
    } else {
      const dataUrl = await moduleToDataUrl(resolved)
      if (dataUrl) {
        output += full.replace(spec, dataUrl)
      } else {
        output += full
      }
    }

    lastIndex = start + full.length
  }

  output += content.slice(lastIndex)
  return output
}

async function moduleToDataUrl(modulePath: string): Promise<string> {
  const cached = moduleUrlCache.get(modulePath)
  if (cached !== undefined) {
    return cached
  }

  moduleUrlCache.set(modulePath, '')
  const result = await readFileContent(modulePath)
  if (!result.success) {
    return ''
  }

  let content = result.content || ''
  content = await rewriteModuleImports(content, modulePath)
  const dataUrl = `data:text/javascript;base64,${toBase64(content)}`
  moduleUrlCache.set(modulePath, dataUrl)
  return dataUrl
}

async function inlineLocalAssets(html: string): Promise<string> {
  let output = html

  const scriptMatches = [...output.matchAll(/<script([^>]*?)src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi)]
  for (const match of scriptMatches) {
    const ref = match[2] || ''
    const resolved = resolveLocalPath(props.entryFilePath, ref)
    if (!resolved) continue
    const result = await readFileContent(resolved)
    if (!result.success) continue
    const mergedAttrs = `${match[1] || ''} ${match[3] || ''}`
    const attrs = sanitizeScriptAttrs(mergedAttrs)
    const isModule = /type\s*=\s*["']module["']/i.test(attrs)
    let scriptContent = result.content || ''
    if (isModule) {
      scriptContent = await rewriteModuleImports(scriptContent, resolved)
    }
    const attrSuffix = attrs ? ` ${attrs}` : ''
    const inline = `<script${attrSuffix}>\n${scriptContent}\n<\/script>`
    output = output.replace(match[0], inline)
  }

  const styleMatches = [...output.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
  for (const match of styleMatches) {
    const ref = match[1] || ''
    const resolved = resolveLocalPath(props.entryFilePath, ref)
    if (!resolved) continue
    const result = await readFileContent(resolved)
    if (!result.success) continue
    const inline = `<style>\n${result.content || ''}\n</style>`
    output = output.replace(match[0], inline)
  }

  const imgMatches = [...output.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)]
  for (const match of imgMatches) {
    const ref = match[1] || ''
    const resolved = resolveLocalPath(props.entryFilePath, ref)
    if (!resolved) continue
    const result = await readImageAsBase64(resolved)
    if (!result.success || !result.base64) continue
    const dataUrl = `data:${result.mimeType || 'image/png'};base64,${result.base64}`
    output = output.replace(match[1], dataUrl)
  }

  return output
}

const queryString = computed(() => {
  const params = new URLSearchParams()
  params.set('hoicsPlugin', props.pluginId)
  params.set('hoicsPluginName', props.pluginName)
  params.set('hoicsSide', props.side)
  params.set('hoicsPanel', props.panelId)
  params.set('hoicsPanelTitle', props.panelTitle)
  return params.toString()
})

async function rebuildSrc() {
  if (isTauriRuntime()) {
    const r = await readFileContent(props.entryFilePath)
    if (r.success) {
      const withAssets = await inlineLocalAssets(r.content || '')
      const html = injectHostScript(withAssets, 'about:blank', queryString.value)
      iframeSrcDoc.value = html
      iframeSrc.value = ''
      return
    }
  }

  const base = toFileUrl(props.entryFilePath)
  const joiner = base.includes('?') ? '&' : '?'
  iframeSrc.value = `${base}${joiner}${queryString.value}`
  iframeSrcDoc.value = ''
}

type InvokeRequest = {
  type: 'hoics.invoke'
  id: string
  command: string
  payload?: any
}

type InvokeResponse = {
  type: 'hoics.invoke.result'
  id: string
  ok: boolean
  data?: any
  error?: string
}

function isAllowedCommand(cmd: string): boolean {
  const allow = props.allowedCommands || []
  return allow.includes(cmd)
}

async function handleMessage(e: MessageEvent) {
  if (!iframeRef.value || e.source !== iframeRef.value.contentWindow) return

  const data = e.data as InvokeRequest
  if (!data || data.type !== 'hoics.invoke') return

  const id = String(data.id || '')
  const cmd = String(data.command || '')

  if (!id || !cmd) return

  if (!isAllowedCommand(cmd)) {
    const resp: InvokeResponse = {
      type: 'hoics.invoke.result',
      id,
      ok: false,
      error: `Command not allowed: ${cmd}`
    }
    iframeRef.value.contentWindow?.postMessage(resp, '*')
    return
  }

  try {
    const mod = await import('@tauri-apps/api/core')
    const invoke = (mod as any).invoke
    const result = await invoke(cmd, data.payload || {})
    const resp: InvokeResponse = {
      type: 'hoics.invoke.result',
      id,
      ok: true,
      data: result
    }
    iframeRef.value.contentWindow?.postMessage(resp, '*')
  } catch (err: any) {
    const resp: InvokeResponse = {
      type: 'hoics.invoke.result',
      id,
      ok: false,
      error: err?.message || String(err)
    }
    iframeRef.value.contentWindow?.postMessage(resp, '*')
  }
}

async function postInitHandshake() {
  if (!iframeRef.value?.contentWindow) return
  const msg = {
    type: 'hoics.host.ready',
    pluginId: props.pluginId,
    pluginName: props.pluginName,
    side: props.side,
    panelId: props.panelId,
    panelTitle: props.panelTitle,
    allowedCommands: props.allowedCommands || []
  }
  iframeRef.value.contentWindow.postMessage(msg, '*')
}

watch(() => [props.entryFilePath, props.pluginId, props.side, props.panelId] as const, rebuildSrc)

onMounted(async () => {
  window.addEventListener('message', handleMessage)
  await rebuildSrc()
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
})

function handleIframeLoad() {
  postInitHandshake()
}
</script>

<template>
  <div class="w-full h-full overflow-hidden flex flex-col">
    <div class="px-3 py-2 ui-island-header ui-separator-bottom flex items-center justify-between">
      <div class="min-w-0">
        <div class="text-xs font-bold text-hoi4-text truncate">{{ panelTitle }}</div>
        <div class="text-[10px] text-hoi4-text-dim truncate">{{ pluginName }} · {{ pluginId }}</div>
      </div>
      <div class="text-[10px] text-hoi4-comment">iframe</div>
    </div>

    <iframe
      ref="iframeRef"
      class="flex-1 w-full"
      :src="iframeSrc"
      :srcdoc="iframeSrcDoc"
      sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
      @load="handleIframeLoad"
    ></iframe>
  </div>
</template>
