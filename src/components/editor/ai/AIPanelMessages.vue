<script setup lang="ts">
import { ref } from 'vue'
import type { ChatMessage } from '../../../types/aiChat'

const props = defineProps<{
  messages: ChatMessage[]
  groupedMessages: Array<{ user: ChatMessage; items: ChatMessage[] }>
  renderMarkdown: boolean
  assistantHtml: (m: ChatMessage) => string
  toggleReasoning: (m: ChatMessage) => void
  isToolResultMessage: (m: ChatMessage) => boolean
  toolResultInfo: (m: ChatMessage) => { text: string; status: 'success' | 'fail' | 'unknown' }
}>()

function toolStatusLampClass(status: 'success' | 'fail' | 'unknown') {
  if (status === 'success') return 'bg-emerald-500'
  if (status === 'fail') return 'bg-red-500'
  return 'bg-gray-400'
}

const toolInfoCache = new Map<string, { text: string; status: 'success' | 'fail' | 'unknown' }>()

function getToolInfo(m: ChatMessage) {
  const cached = toolInfoCache.get(m.id)
  if (cached) return cached
  const info = props.toolResultInfo(m)
  toolInfoCache.set(m.id, info)
  return info
}

const detailsOpenMap = ref<Record<string, boolean>>({})

function onToolDetailsToggle(id: string, e: Event) {
  const el = e.target as HTMLDetailsElement | null
  detailsOpenMap.value[id] = !!el?.open
}
</script>

<template>
  <div v-if="messages.length === 0" class="text-hoi4-text-dim text-sm">
    还没有对话，输入内容开始聊天。
  </div>
  <div v-for="g in groupedMessages" :key="g.user.id" class="space-y-2">
    <div class="rounded-xl px-3 py-2 border bg-hoi4-accent/30 border-hoi4-border/80 text-hoi4-text">
      <div class="text-xs text-hoi4-text-dim mb-1 flex items-center gap-2">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-hoi4-border/60 border border-hoi4-border/80">
          <svg class="w-3 h-3 text-hoi4-text" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
              d="M20 21a8 8 0 0 0-16 0"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </div>
      <div class="text-sm whitespace-pre-wrap break-words">{{ g.user.content }}</div>
    </div>

    <div
      v-if="g.items.length > 0"
      class="rounded-xl px-3 py-2 border bg-hoi4-gray/70 border-hoi4-border/80 text-hoi4-text"
    >
      <div class="text-xs text-hoi4-text-dim mb-2 flex items-center gap-2">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-hoi4-border/60 border border-hoi4-border/80">
          <svg class="w-3.5 h-3.5 text-hoi4-accent" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M9 3h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M10 3v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M14 3v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path
              d="M5 11a7 7 0 0 1 14 0v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-4Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M9 14h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            <path d="M15 14h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          </svg>
        </span>
      </div>
      <div class="space-y-2">
        <div v-for="m in g.items" :key="m.id">
          <div v-if="m.reasoning && m.reasoning.trim().length > 0" class="mb-2">
            <button
              class="text-xs px-2 py-1 rounded-lg border border-hoi4-border/80 bg-hoi4-gray/80 hover:bg-hoi4-border/70 transition-colors"
              :class="m.showReasoning ? 'text-hoi4-text' : 'text-hoi4-text-dim'"
              @click="toggleReasoning(m)"
            >
              {{ m.showReasoning ? '隐藏推理链' : '显示推理链' }}
            </button>

            <span v-if="typeof m.reasoningMs === 'number'" class="ml-2 text-xs text-hoi4-text-dim">
              推理耗时 {{ (m.reasoningMs / 1000).toFixed(2) }}s
            </span>

            <div
              v-if="m.showReasoning"
              class="mt-2 rounded-xl border border-hoi4-border/80 bg-hoi4-gray/90 px-3 py-2"
            >
              <div class="text-xs text-hoi4-text-dim mb-1">reasoning</div>
              <div class="text-xs whitespace-pre-wrap break-words text-hoi4-text">
                {{ m.reasoning }}
              </div>
            </div>
          </div>

          <div class="text-sm whitespace-pre-wrap break-words" :class="m.pending ? 'animate-pulse text-hoi4-text-dim' : ''">
            <template v-if="isToolResultMessage(m)">
              <details
                class="rounded-xl border border-hoi4-border/80 bg-hoi4-gray/80 px-3 py-2"
                @toggle="onToolDetailsToggle(m.id, $event)"
              >
                <summary class="cursor-pointer select-none text-xs text-hoi4-text">
                  <span class="flex items-start gap-2">
                    <span
                      class="inline-block w-2 h-2 rounded-full shrink-0 flex-none mt-0.5"
                      :class="toolStatusLampClass(getToolInfo(m).status)"
                    ></span>
                    <span class="text-hoi4-text-dim whitespace-pre-line leading-snug">{{ getToolInfo(m).text }}</span>
                  </span>
                </summary>
                <pre
                  v-if="detailsOpenMap[m.id]"
                  class="mt-2 text-xs whitespace-pre-wrap break-words text-hoi4-text-dim bg-hoi4-gray/90 border border-hoi4-border/80 rounded-lg p-2"
                >{{ m.content }}</pre>
              </details>
            </template>
            <template v-else-if="renderMarkdown && m.role === 'assistant'">
              <div class="ai-markdown" v-html="assistantHtml(m)"></div>
            </template>
            <template v-else>
              {{ m.content }}
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-markdown :deep(h1) {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0.5rem 0 0.25rem;
}

.ai-markdown :deep(h2) {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0.5rem 0 0.25rem;
}

.ai-markdown :deep(h3) {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0.5rem 0 0.25rem;
}

.ai-markdown :deep(h4) {
  font-size: 0.98rem;
  font-weight: 700;
  margin: 0.5rem 0 0.25rem;
}

.ai-markdown :deep(h5) {
  font-size: 0.92rem;
  font-weight: 700;
  margin: 0.5rem 0 0.25rem;
}

.ai-markdown :deep(h6) {
  font-size: 0.88rem;
  font-weight: 700;
  margin: 0.5rem 0 0.25rem;
}

.ai-markdown :deep(p) {
  margin: 0.25rem 0;
}

.ai-markdown :deep(ul),
.ai-markdown :deep(ol) {
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}

.ai-markdown :deep(li) {
  margin: 0.1rem 0;
}

.ai-markdown :deep(ul) {
  list-style: none;
  padding-left: 0.25rem;
}

.ai-markdown :deep(ul > li) {
  position: relative;
  padding-left: 1.05rem;
  color: rgba(160, 160, 160, 0.95);
}

.ai-markdown :deep(ul > li::before) {
  content: '●';
  position: absolute;
  left: 0;
  top: 0;
  color: rgba(160, 160, 160, 0.85);
}

.ai-markdown :deep(code) {
  font-size: 0.85em;
  padding: 0.1rem 0.35rem;
  border-radius: 0.5rem;
  background: rgba(42, 42, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ai-markdown :deep(pre) {
  margin: 0.35rem 0;
  padding: 0.6rem 0.75rem;
  border-radius: 0.85rem;
  background: rgba(20, 20, 20, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.10);
  overflow-x: auto;
}

.ai-markdown :deep(pre code) {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 0.85rem;
  line-height: 1.35;
}

.ai-markdown :deep(blockquote) {
  margin: 0.35rem 0;
  padding: 0.35rem 0.6rem;
  border-left: 3px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 0.5rem;
}

.ai-markdown :deep(a) {
  color: rgba(140, 200, 255, 0.95);
  text-decoration: underline;
}
</style>
