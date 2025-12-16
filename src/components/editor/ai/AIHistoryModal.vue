<script setup lang="ts">
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
}>()
</script>

<template>
  <div
    v-if="props.open"
    class="fixed inset-0 flex items-center justify-center z-50 bg-black/55 backdrop-blur-sm"
    @click.self="emit('close')"
    tabindex="-1"
  >
    <div
      class="border border-hoi4-border rounded-2xl shadow-2xl overflow-hidden w-[560px] max-w-[92vw] max-h-[85vh] ai-solid-dropdown"
      @click.stop
    >
      <div class="px-6 py-4 border-b border-hoi4-border">
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

      <div class="px-6 py-5 overflow-y-auto" style="max-height: calc(85vh - 72px);">
        <div v-if="props.chatSessions.length === 0" class="text-sm text-hoi4-text-dim">
          暂无历史记录。
        </div>

        <div v-else class="space-y-2">
          <button
            v-for="s in props.chatSessions.slice().sort((a,b)=> (b.updatedAt||0)-(a.updatedAt||0))"
            :key="s.id"
            class="w-full text-left rounded-xl border px-3 py-2 transition-colors"
            :class="s.id === props.currentSessionId ? 'border-hoi4-accent/70 bg-hoi4-accent/15' : 'border-hoi4-border/60 hover:bg-hoi4-border/40'"
            @click="emit('select', s.id)"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="text-sm font-bold text-hoi4-text">{{ s.title || '新对话' }}</div>
              <div class="text-xs text-hoi4-text-dim">{{ new Date(s.updatedAt || s.createdAt).toLocaleString() }}</div>
            </div>
            <div class="text-xs text-hoi4-text-dim mt-1">
              {{ (s.messages || []).length }} 条消息
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
