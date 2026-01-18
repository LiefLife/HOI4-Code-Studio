<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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

function isTauriRuntime() {
  const w = window as any
  return !!(w.__TAURI__ || w.__TAURI_INTERNALS__)
}

async function toWebviewUrl(filePath: string): Promise<string> {
  if (!isTauriRuntime()) {
    return `file://${filePath.replace(/\\/g, '/')}`
  }

  try {
    const mod = await import('@tauri-apps/api/core')
    const convertFileSrc = (mod as any).convertFileSrc
    if (typeof convertFileSrc === 'function') {
      const u1 = convertFileSrc(filePath)
      return u1
    }
  } catch (_e) {
  }

  return `file://${filePath.replace(/\\/g, '/')}`
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
  const base = await toWebviewUrl(props.entryFilePath)
  const joiner = base.includes('?') ? '&' : '?' 
  iframeSrc.value = `${base}${joiner}${queryString.value}`
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
      sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
      @load="handleIframeLoad"
    ></iframe>
  </div>
</template>
