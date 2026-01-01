<template>
  <div class="w-full h-full bg-[var(--theme-bg)] text-[var(--theme-fg)] flex flex-col overflow-hidden">
    <div class="flex items-center justify-between px-4 py-2 bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-border)] shrink-0">
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold">GFX 预览</span>
        <span class="text-xs text-[var(--theme-comment)]">{{ items.length }} sprites</span>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="filter"
          type="text"
          placeholder="Filter..."
          class="bg-[var(--theme-bg)] text-xs text-[var(--theme-fg)] border border-[var(--theme-border)] rounded px-2 py-1 focus:outline-none focus:border-[var(--theme-accent)] w-56"
        />
        <button
          class="px-2 py-1 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-selection)] border border-[var(--theme-border)] rounded text-xs"
          @click="reload"
        >
          刷新
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-auto p-3">
      <div v-if="loading" class="text-xs text-[var(--theme-comment)]">Loading...</div>
      <div v-else-if="error" class="text-xs text-red-400 whitespace-pre-wrap">{{ error }}</div>

      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        <div
          v-for="it in filtered"
          :key="it.name + '|' + (it.texturefile || '') + '|' + it.sourceLine"
          class="border border-[var(--theme-border)] rounded p-2 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-selection)] transition-colors cursor-pointer"
          :title="tooltip(it)"
          @click="handleClick(it)"
        >
          <div class="w-full h-24 flex items-center justify-center bg-black/20 rounded overflow-hidden">
            <div
              v-if="it.imgUrl"
              class="w-full h-full"
              :style="spriteBoxStyle(it)"
            ></div>
            <div v-else class="text-[10px] text-[var(--theme-comment)] px-2 text-center">
              {{ it.error || 'MISSING' }}
            </div>
          </div>
          <div class="mt-2 text-xs font-mono truncate">{{ it.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { parseGfxPreview } from '../../api/tauri'

type GfxSpritePreviewItem = {
  name: string
  texturefile?: string | null
  noOfFrames: number
  borderSize?: any
  sourceLine: number
  resolvedPath?: string | null
  cachedPngPath?: string | null
  error?: string | null
}

type ViewItem = GfxSpritePreviewItem & { imgUrl?: string | null }

const props = defineProps<{
  content: string
  filePath: string
  projectPath?: string
  gameDirectory?: string
  dependencyRoots?: string[]
}>()

const emit = defineEmits<{
  jumpToLine: [line: number]
}>()

const filter = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const items = ref<ViewItem[]>([])

function safeLower(s: string) {
  return (s || '').toLowerCase()
}

const filtered = computed(() => {
  const f = safeLower(filter.value.trim())
  if (!f) return items.value
  return items.value.filter(i => safeLower(i.name).includes(f))
})

function spriteBoxStyle(it: ViewItem): Record<string, string> {
  const url = it.imgUrl
  if (!url) return {}

  const frames = Math.max(1, Number(it.noOfFrames || 1))
  const border = (it.borderSize && typeof it.borderSize === 'object') ? it.borderSize : null
  const borderX = border && typeof border.x === 'number' ? border.x : 0
  const borderY = border && typeof border.y === 'number' ? border.y : 0

  // 9-slice preview for corneredTileSpriteType
  if (border && (borderX > 0 || borderY > 0)) {
    // Use border-image. We must set border widths, otherwise border-image won't show.
    return {
      boxSizing: 'border-box',
      width: '100%',
      height: '100%',
      borderStyle: 'solid',
      borderWidth: `${borderY}px ${borderX}px`,
      borderImageSource: `url(${url})`,
      borderImageSlice: `${borderY} ${borderX}`,
      borderImageWidth: `${borderY}px ${borderX}px`,
      borderImageRepeat: 'stretch',
      background: 'transparent',
    }
  }

  // Frame strip preview (assume horizontal sheet)
  if (frames > 1) {
    // Show the first frame (frame index 1)
    return {
      width: '100%',
      height: '100%',
      backgroundImage: `url(${url})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${frames * 100}% 100%`,
      backgroundPosition: '0% 0%',
    }
  }

  // Default: scale to fit box
  return {
    width: '100%',
    height: '100%',
    backgroundImage: `url(${url})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
    backgroundPosition: 'center',
  }
}

function tooltip(it: ViewItem): string {
  const parts: string[] = []
  parts.push(it.name)
  const normalizeForDisplay = (p: string) => p.replace(/\\/g, '/')
  if (it.texturefile) parts.push(`texturefile: ${normalizeForDisplay(it.texturefile)}`)
  if (it.resolvedPath) parts.push(`resolved: ${normalizeForDisplay(it.resolvedPath)}`)
  if (it.cachedPngPath) parts.push(`cache: ${normalizeForDisplay(it.cachedPngPath)}`)
  if (it.noOfFrames && it.noOfFrames !== 1) parts.push(`frames: ${it.noOfFrames}`)
  if (it.error) parts.push(`error: ${it.error}`)
  parts.push(`line: ${it.sourceLine}`)
  return parts.join('\n')
}

function handleClick(it: ViewItem) {
  if (it.sourceLine && it.sourceLine > 0) {
    emit('jumpToLine', it.sourceLine)
  }
}

async function buildImgUrlFromCachedPath(p: string): Promise<string> {
  // Prefer file URL mode (B). If not available, return a data URL fallback.
  const isTauriRuntime = () => {
    const w = window as any
    return !!(w.__TAURI__ || w.__TAURI_INTERNALS__)
  }

  const tryLoad = async (url: string): Promise<boolean> => {
    return await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = url
    })
  }

  if (isTauriRuntime()) {
    try {
      const mod = await import('@tauri-apps/api/core')
      const convertFileSrc = (mod as any).convertFileSrc
      if (typeof convertFileSrc === 'function') {
        const u1 = convertFileSrc(p)
        if (await tryLoad(u1)) {
          return u1
        }

        // Windows path sometimes behaves better when normalized
        const u2 = convertFileSrc(p.replace(/\\/g, '/'))
        if (await tryLoad(u2)) {
          return u2
        }

        console.warn('[GfxViewer] convertFileSrc url failed to load, fallback to base64', { p, u1, u2 })
      }
    } catch (e) {
      console.warn('[GfxViewer] convertFileSrc not available, fallback to base64', e)
    }
  }

  // Fallback: read cached png and display via data URL
  const { readImageAsBase64 } = await import('../../api/tauri')
  const r = await readImageAsBase64(p)
  if (r.success && r.base64) {
    return `data:${r.mimeType || 'image/png'};base64,${r.base64}`
  }

  throw new Error(r.message || 'Unable to build image URL')
}

async function reload() {
  loading.value = true
  error.value = null
  try {
    const data = await parseGfxPreview({
      filePath: props.filePath,
      contentOverride: props.content,
      projectPath: props.projectPath,
      gameDirectory: props.gameDirectory,
      dependencyRoots: props.dependencyRoots
    })

    const next: ViewItem[] = []
    for (const it of data) {
      const v: ViewItem = { ...it }
      if (it.cachedPngPath) {
        try {
          v.imgUrl = await buildImgUrlFromCachedPath(it.cachedPngPath)
        } catch (e: any) {
          v.imgUrl = null
          v.error = v.error || (e?.toString?.() ?? 'Failed to load image')
        }
      } else {
        v.imgUrl = null
      }
      next.push(v)
    }

    items.value = next
  } catch (e: any) {
    console.error('parseGfxPreview failed:', e)
    error.value = (e && typeof e === 'string') ? e : (e?.message || 'parseGfxPreview failed')
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.filePath, reload)
watch(() => props.content, reload)

onMounted(reload)
</script>
