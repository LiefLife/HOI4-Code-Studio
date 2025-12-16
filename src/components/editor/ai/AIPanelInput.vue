<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  canSend: boolean
  isSending: boolean
  aiAgentMode: 'plan' | 'code' | 'ask'
  agentModeMenuOpen: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
  keydown: [e: KeyboardEvent]
  toggleAgentMenu: []
  setAgentMode: [mode: 'plan' | 'code' | 'ask']
}>()
</script>

<template>
  <div class="bg-transparent p-3 pt-0">
    <div class="relative rounded-2xl bg-hoi4-gray/70 border border-hoi4-border/60 shadow-lg">
      <div class="absolute left-2 bottom-2 flex items-center gap-2">
        <div class="text-xs text-hoi4-text-dim">智能体：</div>
        <div class="relative">
          <button
            class="px-2 py-1 rounded-lg text-xs border border-hoi4-border/60 bg-hoi4-gray/60 hover:bg-hoi4-border/60 transition-colors text-hoi4-text"
            @click="emit('toggleAgentMenu')"
          >
            {{ props.aiAgentMode === 'plan' ? 'Plan' : props.aiAgentMode === 'code' ? 'Code' : 'Ask' }}
          </button>
          <div
            v-if="props.agentModeMenuOpen"
            class="absolute left-0 bottom-8 min-w-32 rounded-xl border border-hoi4-border shadow-2xl overflow-hidden z-50 ai-solid-dropdown"
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
        class="w-full resize-none rounded-2xl bg-transparent text-hoi4-text text-sm px-3 py-3 pr-20 pb-12 focus:outline-none focus:border-hoi4-accent"
        :rows="3"
        placeholder="输入消息... (Enter 发送，Ctrl+Enter 换行)"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        @keydown="emit('keydown', $event)"
      />

      <button
        class="absolute right-2 bottom-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
        :class="props.canSend ? 'bg-hoi4-accent/80 hover:bg-hoi4-border/80 text-hoi4-text' : 'bg-hoi4-border/40 text-hoi4-text-dim cursor-not-allowed'"
        :disabled="!props.canSend"
        @click="emit('send')"
      >
        {{ props.isSending ? '发送中...' : '发送' }}
      </button>
    </div>
  </div>
</template>
