<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChatSession } from '../../../types/aiChat'

const props = withDefaults(defineProps<{
  open: boolean
  chatSessions: ChatSession[]
  currentSessionId: string
}>(), {
  open: false
})

const emit = defineEmits<{
  close: []
  select: [sessionId: string]
  deleteSessions: [sessionIds: string[]]
}>()

type SessionGroup = {
  key: string
  label: string
  sessions: ChatSession[]
}

function dateKey(ts: number) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function groupLabelFromKey(key: string) {
  const now = new Date()
  const todayKey = dateKey(now.getTime())
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const yesterdayKey = dateKey(yesterday.getTime())
  if (key === todayKey) return '今天'
  if (key === yesterdayKey) return '昨天'
  return key
}

const grouped = computed<SessionGroup[]>(() => {
  const sorted = props.chatSessions
    .slice()
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

  const map = new Map<string, ChatSession[]>()
  for (const s of sorted) {
    const ts = (s.updatedAt || s.createdAt || 0) as number
    const key = dateKey(ts)
    const list = map.get(key) || []
    list.push(s)
    map.set(key, list)
  }

  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, sessions]) => ({ key, label: groupLabelFromKey(key), sessions }))
})

function onDeleteGroup(g: SessionGroup) {
  const ids = g.sessions.map(s => s.id).filter(Boolean)
  if (ids.length === 0) return
  const ok = window.confirm(`确认删除“${g.label}”分组下的 ${ids.length} 条对话吗？该操作不可恢复。`)
  if (!ok) return
  emit('deleteSessions', ids)
}

const selectedIds = ref<Record<string, boolean>>({})

const selectedCount = computed(() => {
  return Object.values(selectedIds.value).filter(Boolean).length
})

function toggleSelected(id: string) {
  if (!id) return
  selectedIds.value = {
    ...selectedIds.value,
    [id]: !selectedIds.value[id]
  }
}

function clearSelected() {
  selectedIds.value = {}
}

function deleteSelected() {
  const ids = Object.entries(selectedIds.value)
    .filter(([, v]) => !!v)
    .map(([k]) => k)
  if (ids.length === 0) return
  const ok = window.confirm(`确认删除已选择的 ${ids.length} 条对话吗？该操作不可恢复。`)
  if (!ok) return
  emit('deleteSessions', ids)
  clearSelected()
}

const contextMenu = ref<{ open: boolean; x: number; y: number; sessionId: string }>({
  open: false,
  x: 0,
  y: 0,
  sessionId: ''
})

function openContextMenu(e: MouseEvent, sessionId: string) {
  e.preventDefault()
  contextMenu.value = {
    open: true,
    x: e.clientX,
    y: e.clientY,
    sessionId
  }
}

function closeContextMenu() {
  contextMenu.value = { open: false, x: 0, y: 0, sessionId: '' }
}

function deleteOneFromMenu() {
  const id = contextMenu.value.sessionId
  if (!id) return
  const ok = window.confirm('确认删除该条对话吗？该操作不可恢复。')
  if (!ok) return
  emit('deleteSessions', [id])
  closeContextMenu()
  if (selectedIds.value[id]) {
    const next = { ...selectedIds.value }
    delete next[id]
    selectedIds.value = next
  }
}
</script>

<template>
  <div
    v-if="props.open"
    class="fixed inset-0 flex items-center justify-center z-50 bg-black/55 backdrop-blur-sm"
    @click.self="emit('close')"
    tabindex="-1"
  >
    <div
      class="ui-island overflow-hidden w-[560px] max-w-[92vw] max-h-[85vh] ai-solid-dropdown"
      @click.stop
    >
      <div class="px-6 py-4 ui-island-header ui-separator-bottom">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-hoi4-text">历史对话</h3>
          <button
            class="px-3 text-hoi4-text-dim hover:text-hoi4-text rounded-full hover:bg-hoi4-border/60 transition-colors"
            @click="emit('close')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="px-6 py-5 overflow-y-auto" style="max-height: calc(85vh - 72px);" @click="closeContextMenu">
        <div v-if="props.chatSessions.length === 0" class="text-sm text-hoi4-text-dim">
          暂无历史记录。
        </div>

        <div v-else class="space-y-4">
          <div v-for="g in grouped" :key="g.key" class="space-y-2">
            <div class="flex items-center justify-between">
              <div class="text-xs font-bold text-hoi4-text-dim">{{ g.label }}</div>
              <button
                class="text-xs px-2 py-1 rounded-lg bg-hoi4-border/40 hover:bg-hoi4-border/60 transition-colors text-hoi4-text"
                @click="onDeleteGroup(g)"
              >
                删除该组
              </button>
            </div>

            <button
              v-for="s in g.sessions"
              :key="s.id"
              class="w-full text-left rounded-xl px-3 py-2 transition-colors ui-surface-1"
              :class="s.id === props.currentSessionId ? 'bg-hoi4-accent/15' : 'hover:bg-hoi4-border/40'"
              @click="emit('select', s.id)"
              @contextmenu="openContextMenu($event, s.id)"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    class="accent-[color:var(--theme-accent)]"
                    :checked="!!selectedIds[s.id]"
                    @click.stop
                    @change.stop="toggleSelected(s.id)"
                  />
                  <div class="text-sm font-bold text-hoi4-text truncate">{{ s.title || '新对话' }}</div>
                </div>
                <div class="text-xs text-hoi4-text-dim">{{ new Date(s.updatedAt || s.createdAt).toLocaleString() }}</div>
              </div>
              <div class="text-xs text-hoi4-text-dim mt-1">
                {{ (s.messages || []).length }} 条消息
              </div>
            </button>
          </div>
        </div>
      </div>

      <div v-if="selectedCount > 0" class="px-6 py-3 ui-separator-bottom flex items-center justify-between">
        <div class="text-xs text-hoi4-text-dim">已选择 {{ selectedCount }} 条</div>
        <div class="flex items-center gap-2">
          <button
            class="text-xs px-2 py-1 rounded-lg bg-hoi4-border/40 hover:bg-hoi4-border/60 transition-colors text-hoi4-text"
            @click="clearSelected"
          >
            清空选择
          </button>
          <button
            class="text-xs px-2 py-1 rounded-lg bg-red-600/70 hover:bg-red-600/85 transition-colors text-white"
            @click="deleteSelected"
          >
            删除所选
          </button>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="contextMenu.open"
    class="fixed z-[60] min-w-32 rounded-xl shadow-2xl ai-solid-dropdown ui-island"
    :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    @click.stop
  >
    <button
      class="w-full text-left px-3 py-2 text-xs hover:bg-hoi4-border/60 transition-colors text-hoi4-text"
      @click="deleteOneFromMenu"
    >
      删除此对话
    </button>
    <button
      class="w-full text-left px-3 py-2 text-xs hover:bg-hoi4-border/60 transition-colors text-hoi4-text-dim"
      @click="closeContextMenu"
    >
      取消
    </button>
  </div>
</template>
