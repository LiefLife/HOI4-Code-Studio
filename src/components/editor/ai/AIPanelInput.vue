<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  canSend: boolean
  isSending: boolean
  isOptimizing: boolean
  aiAgentMode: 'plan' | 'code' | 'ask'
  agentModeMenuOpen: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
  optimize: []
  keydown: [e: KeyboardEvent]
  toggleAgentMenu: []
  setAgentMode: [mode: 'plan' | 'code' | 'ask']
}>()
</script>

<template>
  <div class="bg-transparent p-3 pt-0">
    <div class="relative rounded-2xl ui-island">
      <div class="absolute left-2 bottom-2 flex items-center gap-2">
        <div class="flex items-center gap-2 text-xs text-hoi4-text-dim">
          <svg class="w-4 h-4 text-hoi4-accent" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
        </div>
        <div class="relative">
          <button
            class="px-2 py-1 rounded-lg text-xs bg-hoi4-border/50 hover:bg-hoi4-border/70 transition-colors text-hoi4-text"
            @click="emit('toggleAgentMenu')"
            title="切换智能体模式"
          >
            {{ props.aiAgentMode === 'plan' ? 'Plan' : props.aiAgentMode === 'code' ? 'Code' : 'Ask' }}
          </button>
          <div
            v-if="props.agentModeMenuOpen"
            class="absolute left-0 bottom-8 min-w-32 rounded-xl shadow-2xl overflow-hidden z-50 ai-solid-dropdown ui-island"
          >
            <button
              class="w-full text-left px-3 py-2 text-xs transition-colors"
              :class="props.aiAgentMode === 'plan' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
              @click="emit('setAgentMode', 'plan')"
            >
              Plan
            </button>
            <button
              class="w-full text-left px-3 py-2 text-xs transition-colors"
              :class="props.aiAgentMode === 'code' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
              @click="emit('setAgentMode', 'code')"
            >
              Code
            </button>
            <button
              class="w-full text-left px-3 py-2 text-xs transition-colors"
              :class="props.aiAgentMode === 'ask' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
              @click="emit('setAgentMode', 'ask')"
            >
              Ask
            </button>
          </div>
        </div>
      </div>

      <textarea
        :value="props.modelValue"
        class="ui-textarea w-full resize-none text-sm px-3 py-3 pr-20 pb-12 bg-transparent"
        :rows="3"
        placeholder="输入消息... (Enter 发送，Ctrl+Enter 换行)"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        @keydown="emit('keydown', $event)"
      />

      <div class="absolute right-2 bottom-2 flex items-center gap-2">
        <button
          v-if="props.modelValue.trim()"
          class="p-2 rounded-xl text-sm transition-all shadow-sm active:scale-95 bg-hoi4-border/40 hover:bg-hoi4-border/60 text-hoi4-text-dim hover:text-hoi4-accent"
          :class="{ 'animate-pulse pointer-events-none': props.isOptimizing }"
          @click="emit('optimize')"
          title="优化提示词"
        >
          <svg v-if="!props.isOptimizing" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 4V2"/>
            <path d="M15 16v-2"/>
            <path d="M8 9h2"/>
            <path d="M20 9h2"/>
            <path d="M17.8 11.8 19 13"/>
            <path d="M15 9h0"/>
            <path d="M17.8 6.2 19 5"/>
            <path d="m3 21 9-9"/>
            <path d="M12.2 6.2 11 5"/>
          </svg>
          <svg v-else class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </button>

        <button
          class="px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
          :class="props.canSend ? 'bg-hoi4-accent/85 hover:bg-hoi4-border/80 text-hoi4-text' : 'bg-hoi4-border/50 text-hoi4-text-dim cursor-not-allowed'"
          :disabled="!props.canSend"
          @click="emit('send')"
        >
          {{ props.isSending ? '发送中...' : '发送' }}
        </button>
      </div>
    </div>
  </div>
</template>
