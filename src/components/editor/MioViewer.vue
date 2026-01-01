<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import cytoscape from 'cytoscape'
import type { MioDto, MioPreviewData, MioTraitDto } from '../../api/tauri'
import { parseMioPreview } from '../../api/tauri'
import { useImageProcessor } from '../../composables/useImageProcessor'

const props = defineProps<{
  content: string
  filePath: string
  projectPath?: string
  gameDirectory?: string
  dependencyRoots?: string[]
}>()

const emit = defineEmits<{
  jumpToTrait: [traitId: string, line: number]
}>()

const cyContainerRef = ref<HTMLDivElement | null>(null)
let cy: cytoscape.Core | null = null

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const previewData = ref<MioPreviewData | null>(null)
const selectedMioIndex = ref(0)

const GRID_SIZE = 140

const { initWorkerPool, loadIconsBatch, dispose } = useImageProcessor()

const mios = computed(() => previewData.value?.mios ?? [])
const selectedMio = computed<MioDto | null>(() => {
  const list = mios.value
  if (list.length === 0) return null
  return list[Math.max(0, Math.min(selectedMioIndex.value, list.length - 1))] ?? null
})

const warningsText = computed(() => {
  const mio = selectedMio.value
  if (!mio) return ''
  if (!mio.warnings || mio.warnings.length === 0) return 'No warnings.'
  return mio.warnings.map(w => `- ${w}`).join('\n')
})

const showWarnings = ref(false)

function destroyCy() {
  if (cy) {
    cy.destroy()
    cy = null
  }
}

function normalizeIconName(name?: string): string {
  return (name || '').trim()
}

async function loadData() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const data = await parseMioPreview({
      filePath: props.filePath,
      contentOverride: props.content,
      projectPath: props.projectPath,
      gameDirectory: props.gameDirectory,
      dependencyRoots: props.dependencyRoots
    })
    previewData.value = data
    if (selectedMioIndex.value >= (data.mios?.length ?? 0)) {
      selectedMioIndex.value = 0
    }
  } catch (e: any) {
    console.error('解析 MIO 失败:', e)
    errorMessage.value = (e && typeof e === 'string') ? e : '无法解析 MIO 文件'
    previewData.value = null
  } finally {
    isLoading.value = false
  }
}

function computeAbsolutePositions(traits: MioTraitDto[]) {
  const byId = new Map<string, MioTraitDto>()
  for (const t of traits) byId.set(t.id, t)

  const cache = new Map<string, { x: number; y: number }>()
  const visiting = new Set<string>()

  function dfs(id: string): { x: number; y: number } {
    const cached = cache.get(id)
    if (cached) return cached

    if (visiting.has(id)) {
      // cycle fallback
      return { x: 0, y: 0 }
    }

    const t = byId.get(id)
    if (!t) return { x: 0, y: 0 }

    visiting.add(id)
    let x = t.x ?? 0
    let y = t.y ?? 0

    const rel = t.relative_position_id
    if (rel && byId.has(rel)) {
      const p = dfs(rel)
      x += p.x
      y += p.y
    }

    visiting.delete(id)
    const pos = { x, y }
    cache.set(id, pos)
    return pos
  }

  const out = new Map<string, { x: number; y: number }>()
  for (const t of traits) {
    out.set(t.id, dfs(t.id))
  }
  return out
}

function initCytoscape() {
  destroyCy()

  if (!cyContainerRef.value) return
  const mio = selectedMio.value
  if (!mio) return

  const traits = mio.traits ?? []
  if (traits.length === 0) {
    errorMessage.value = '该 MIO 未解析到 trait'
    return
  }

  const absPos = computeAbsolutePositions(traits)

  const elements: any[] = []

  // nodes
  for (const t of traits) {
    const p = absPos.get(t.id) ?? { x: t.x ?? 0, y: t.y ?? 0 }
    const x = p.x * GRID_SIZE
    const y = p.y * GRID_SIZE

    const nameLine = t.name ? `\n${t.name}` : ''

    elements.push({
      data: {
        id: t.id,
        label: `${t.id}${nameLine}`,
        icon: normalizeIconName(t.icon),
        line: t.line ?? 1
      },
      position: { x, y }
    })
  }

  // edges
  const exists = (id: string) => traits.some(t => t.id === id)

  for (const t of traits) {
    // any_parent dashed
    for (const p of (t.any_parent ?? [])) {
      if (!exists(p)) continue
      elements.push({
        data: {
          id: `${p}->${t.id}#any`,
          source: p,
          target: t.id,
          isAny: true
        }
      })
    }

    // all_parents solid
    for (const p of (t.all_parents ?? [])) {
      if (!exists(p)) continue
      elements.push({
        data: {
          id: `${p}->${t.id}#all`,
          source: p,
          target: t.id,
          isAll: true
        }
      })
    }

    // parent threshold
    const pt = t.parent
    if (pt && Array.isArray(pt.traits) && pt.traits.length > 0) {
      const isDashed = pt.num_needed !== pt.traits.length
      for (const p of pt.traits) {
        if (!exists(p)) continue
        elements.push({
          data: {
            id: `${p}->${t.id}#parent`,
            source: p,
            target: t.id,
            isParent: true,
            isDashed
          }
        })
      }
    }

    // mutually exclusive - avoid duplicates
    for (const e of (t.mutually_exclusive ?? [])) {
      if (!exists(e)) continue
      if (t.id < e) {
        elements.push({
          data: {
            id: `${t.id}<->${e}#ex`,
            source: t.id,
            target: e,
            isExclusive: true
          }
        })
      }
    }
  }

  cy = cytoscape({
    container: cyContainerRef.value,
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': 'transparent',
          'border-color': '#334155',
          'border-width': 0,
          'label': 'data(label)',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'color': '#e2e8f0',
          'font-size': '11px',
          'font-weight': 'bold',
          'width': 96,
          'height': 96,
          'shape': 'rectangle',
          'text-wrap': 'wrap',
          'text-max-width': '92px',
          'text-margin-y': 8,
          'background-fit': 'contain',
          'background-clip': 'none',
          'background-image': 'none',
          'background-position-x': '50%',
          'background-position-y': '35%',
          'background-width': '64px',
          'background-height': '64px',
          'padding': '0px'
        }
      },
      {
        selector: 'node.hovered',
        style: {
          'border-color': '#60a5fa',
          'border-width': 2
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#4a5568',
          'target-arrow-color': '#4a5568',
          'target-arrow-shape': 'triangle',
          'curve-style': 'taxi',
          'taxi-direction': 'vertical',
          'taxi-turn': '50%',
          'taxi-turn-min-distance': 10,
          'arrow-scale': 1.2
        }
      },
      {
        selector: 'edge[isAny]',
        style: {
          'line-style': 'dashed',
          'line-color': '#88aaff',
          'target-arrow-color': '#88aaff'
        }
      },
      {
        selector: 'edge[isAll]',
        style: {
          'line-style': 'solid',
          'line-color': '#4a90e2',
          'target-arrow-color': '#4a90e2'
        }
      },
      {
        selector: 'edge[isParent][isDashed]',
        style: {
          'line-style': 'dashed',
          'line-color': '#88aaff',
          'target-arrow-color': '#88aaff'
        }
      },
      {
        selector: 'edge[isParent][!isDashed]',
        style: {
          'line-style': 'solid',
          'line-color': '#4a90e2',
          'target-arrow-color': '#4a90e2'
        }
      },
      {
        selector: 'edge[isExclusive]',
        style: {
          'line-style': 'dotted',
          'line-color': '#ff4444',
          'target-arrow-shape': 'none',
          'curve-style': 'bezier'
        }
      }
    ],
    layout: { name: 'preset' } as any,
    minZoom: 0.1,
    maxZoom: 3.0,
    wheelSensitivity: 1.5,
    autoungrabify: true
  })

  cy.on('mouseover', 'node', (evt) => {
    evt.target.addClass('hovered')
  })
  cy.on('mouseout', 'node', (evt) => {
    evt.target.removeClass('hovered')
  })

  cy.on('tap', 'node', (evt) => {
    const n = evt.target
    const id = n.id()
    const line = n.data('line')
    if (typeof line === 'number') {
      emit('jumpToTrait', id, line)
    }
  })

  setTimeout(() => {
    if (cy) {
      cy.fit(undefined, 50)
    }
  }, 50)

  // 图标：批量加载 trait.icon 并设置到节点背景
  const iconNames = Array.from(new Set(traits.map(t => normalizeIconName(t.icon)).filter(v => v.length > 0)))
  if (iconNames.length > 0) {
    initWorkerPool(4)
    void loadIconsBatch(iconNames, {
      projectPath: props.projectPath,
      gameDirectory: props.gameDirectory,
      priority: 'normal',
      onItemLoaded: (iconName, dataUrl) => {
        if (!cy) return
        cy.nodes().forEach(n => {
          if (n.data('icon') === iconName) {
            n.style({
              'background-image': `url(${dataUrl})`,
              'background-color': 'transparent',
              'background-fit': 'contain'
            })
          }
        })
      }
    })
  }
}

watch(
  () => [props.filePath, props.content],
  async () => {
    await loadData()
    initCytoscape()
  },
  { deep: false }
)

watch(selectedMioIndex, () => {
  initCytoscape()
})

onMounted(async () => {
  initWorkerPool(4)
  await loadData()
  initCytoscape()
})

onUnmounted(() => {
  destroyCy()
  dispose()
})
</script>

<template>
  <div class="w-full h-full flex flex-col bg-hoi4-gray/50">
    <div class="flex items-center justify-between px-4 py-2 bg-hoi4-accent/70 border-b border-hoi4-border/40">
      <div class="flex items-center space-x-2">
        <span class="text-hoi4-text font-semibold">MIO 预览</span>
        <span v-if="selectedMio" class="text-hoi4-text-dim text-xs">{{ selectedMio.id }}</span>
        <span v-if="isLoading" class="text-hoi4-text-dim text-xs">解析中...</span>
      </div>

      <div class="flex items-center space-x-2">
        <select
          v-if="mios.length > 1"
          v-model="selectedMioIndex"
          class="px-2 py-1 bg-hoi4-gray hover:bg-hoi4-border rounded text-hoi4-text text-xs"
          title="选择组织"
        >
          <option v-for="(m, i) in mios" :key="m.id" :value="i">
            {{ m.id }}
          </option>
        </select>

        <button
          v-if="selectedMio && selectedMio.warnings && selectedMio.warnings.length > 0"
          @click="showWarnings = !showWarnings"
          class="px-3 py-1 bg-hoi4-gray hover:bg-hoi4-border rounded text-hoi4-text text-xs transition-colors"
          title="切换 warnings"
        >
          warnings
        </button>
      </div>
    </div>

    <div class="flex-1 relative overflow-hidden">
      <div v-if="errorMessage" class="absolute inset-0 flex items-center justify-center z-10">
        <div class="bg-hoi4-border/20 p-6 rounded-lg text-center">
          <p class="text-hoi4-text">{{ errorMessage }}</p>
        </div>
      </div>

      <div v-show="!errorMessage" ref="cyContainerRef" class="w-full h-full"></div>

      <div
        v-if="showWarnings"
        class="absolute inset-0 z-20 bg-hoi4-dark/95 p-4 overflow-auto"
      >
        <div class="flex items-center justify-between mb-3">
          <span class="text-hoi4-text font-semibold">Warnings</span>
          <button
            @click="showWarnings = false"
            class="px-3 py-1 bg-hoi4-gray hover:bg-hoi4-border rounded text-hoi4-text text-xs"
          >
            关闭
          </button>
        </div>
        <pre class="text-hoi4-text-dim text-xs whitespace-pre-wrap">{{ warningsText }}</pre>
      </div>
    </div>

    <div class="px-4 py-2 bg-hoi4-accent/70 border-t border-hoi4-border/40">
      <p class="text-hoi4-text-dim text-xs">
        提示: 滚轮缩放 | 拖拽平移 | 点击 trait 跳转到定义
      </p>
    </div>
  </div>
</template>

<style scoped>
</style>
