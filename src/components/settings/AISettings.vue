<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  openaiApiKey: string
  openaiBaseUrl: string
  openaiModel: string
  aiRenderMarkdown: boolean
  aiRequestReasoning: boolean
  aiRule: string
  aiAgentMode: 'plan' | 'code' | 'ask'
}

interface Emits {
  (e: 'update:openaiApiKey', value: string): void
  (e: 'update:openaiBaseUrl', value: string): void
  (e: 'update:openaiModel', value: string): void
  (e: 'update:aiRenderMarkdown', value: boolean): void
  (e: 'update:aiRequestReasoning', value: boolean): void
  (e: 'update:aiRule', value: string): void
  (e: 'update:aiAgentMode', value: 'plan' | 'code' | 'ask'): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const openaiApiKey = ref(props.openaiApiKey)
const openaiBaseUrl = ref(props.openaiBaseUrl)
const openaiModel = ref(props.openaiModel)
const aiRenderMarkdown = ref(props.aiRenderMarkdown)
const aiRequestReasoning = ref(props.aiRequestReasoning)
const aiRule = ref(props.aiRule)
const aiAgentMode = ref<'plan' | 'code' | 'ask'>(props.aiAgentMode)
const agentModeMenuOpen = ref(false)

function toggleMarkdown() {
  aiRenderMarkdown.value = !aiRenderMarkdown.value
  emit('update:aiRenderMarkdown', aiRenderMarkdown.value)
  emit('save')
}

function toggleReasoning() {
  aiRequestReasoning.value = !aiRequestReasoning.value
  emit('update:aiRequestReasoning', aiRequestReasoning.value)
  emit('save')
}

function handleKeyChange(e: Event) {
  const v = (e.target as HTMLInputElement).value
  openaiApiKey.value = v
  emit('update:openaiApiKey', v)
  emit('save')
}

function handleBaseUrlChange(e: Event) {
  const v = (e.target as HTMLInputElement).value
  openaiBaseUrl.value = v
  emit('update:openaiBaseUrl', v)
  emit('save')
}

function handleModelChange(e: Event) {
  const v = (e.target as HTMLInputElement).value
  openaiModel.value = v
  emit('update:openaiModel', v)
  emit('save')
}

function handleRuleChange(e: Event) {
  const v = (e.target as HTMLTextAreaElement).value
  aiRule.value = v
  emit('update:aiRule', v)
  emit('save')
}

function setAgentMode(mode: 'plan' | 'code' | 'ask') {
  aiAgentMode.value = mode
  emit('update:aiAgentMode', mode)
  emit('save')
}

watch(() => props.openaiApiKey, (v) => { openaiApiKey.value = v })
watch(() => props.openaiBaseUrl, (v) => { openaiBaseUrl.value = v })
watch(() => props.openaiModel, (v) => { openaiModel.value = v })
watch(() => props.aiRenderMarkdown, (v) => { aiRenderMarkdown.value = v })
watch(() => props.aiRequestReasoning, (v) => { aiRequestReasoning.value = v })
watch(() => props.aiRule, (v) => { aiRule.value = v })
watch(() => props.aiAgentMode, (v) => { aiAgentMode.value = v })
</script>

<template>
  <div class="space-y-6">
    <div>
      <div class="text-hoi4-text font-bold mb-2">规则</div>
      <textarea
        class="w-full resize-none rounded-xl bg-hoi4-gray/70 border border-hoi4-border/60 text-hoi4-text text-sm px-3 py-2 focus:outline-none focus:border-hoi4-accent"
        :rows="6"
        placeholder="填写规则（单条）..."
        :value="aiRule"
        @input="handleRuleChange"
      />
      <div class="text-hoi4-text-dim text-sm mt-2">
        层级顺序：系统提示词（内置） &gt; 规则 &gt; 智能体（Plan/Code/Ask） &gt; 用户输入。
      </div>
    </div>

    <div class="rounded-xl border border-hoi4-border/60 bg-hoi4-gray/40 px-4 py-3">
      <div class="text-hoi4-text font-bold mb-3">智能体</div>
      <div class="relative inline-block">
        <button
          class="px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 bg-hoi4-border/40 hover:bg-hoi4-border/60 text-hoi4-text"
          @click="agentModeMenuOpen = !agentModeMenuOpen"
        >
          {{ aiAgentMode === 'plan' ? 'Plan' : aiAgentMode === 'code' ? 'Code' : 'Ask' }}
        </button>
        <div
          v-if="agentModeMenuOpen"
          class="absolute left-0 top-12 min-w-44 rounded-xl border border-hoi4-border shadow-xl overflow-hidden z-50 ai-solid-dropdown"
        >
          <button
            class="w-full text-left px-3 py-2 text-sm transition-colors"
            :class="aiAgentMode === 'plan' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
            @click="setAgentMode('plan'); agentModeMenuOpen = false"
          >
            Plan
          </button>
          <button
            class="w-full text-left px-3 py-2 text-sm transition-colors"
            :class="aiAgentMode === 'code' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
            @click="setAgentMode('code'); agentModeMenuOpen = false"
          >
            Code
          </button>
          <button
            class="w-full text-left px-3 py-2 text-sm transition-colors"
            :class="aiAgentMode === 'ask' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
            @click="setAgentMode('ask'); agentModeMenuOpen = false"
          >
            Ask
          </button>
        </div>
      </div>
      <div class="text-hoi4-text-dim text-sm mt-2">
        内置智能体：Plan（先规划后执行）、Code（偏代码实现）、Ask（先澄清再行动）。
      </div>
    </div>

    <div class="flex items-center justify-between">
      <div>
        <div class="text-hoi4-text font-bold">Markdown 渲染</div>
        <div class="text-hoi4-text-dim text-sm mt-1">assistant 输出使用 Markdown-it 渲染</div>
      </div>
      <button
        class="px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
        :class="aiRenderMarkdown ? 'bg-hoi4-accent/80 hover:bg-hoi4-border/80 text-hoi4-text' : 'bg-hoi4-border/40 hover:bg-hoi4-border/60 text-hoi4-text-dim'"
        @click="toggleMarkdown"
      >
        {{ aiRenderMarkdown ? '开启' : '关闭' }}
      </button>
    </div>

    <div class="flex items-center justify-between">
      <div>
        <div class="text-hoi4-text font-bold">返回推理</div>
        <div class="text-hoi4-text-dim text-sm mt-1">向 OpenAI 兼容服务请求返回 reasoning（官方 OpenAI 默认不发送额外字段）</div>
      </div>
      <button
        class="px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
        :class="aiRequestReasoning ? 'bg-hoi4-accent/80 hover:bg-hoi4-border/80 text-hoi4-text' : 'bg-hoi4-border/40 hover:bg-hoi4-border/60 text-hoi4-text-dim'"
        @click="toggleReasoning"
      >
        {{ aiRequestReasoning ? '开启' : '关闭' }}
      </button>
    </div>

    <div>
      <div class="text-hoi4-text font-bold mb-2">OpenAI API Key</div>
      <input
        class="w-full rounded-xl bg-hoi4-gray/70 border border-hoi4-border/60 text-hoi4-text text-sm px-3 py-2 focus:outline-none focus:border-hoi4-accent"
        placeholder="sk-..."
        type="password"
        autocomplete="off"
        spellcheck="false"
        :value="openaiApiKey"
        @input="handleKeyChange"
      />
    </div>

    <div>
      <div class="text-hoi4-text font-bold mb-2">Base URL</div>
      <input
        class="w-full rounded-xl bg-hoi4-gray/70 border border-hoi4-border/60 text-hoi4-text text-sm px-3 py-2 focus:outline-none focus:border-hoi4-accent"
        placeholder="https://api.openai.com"
        type="text"
        autocomplete="off"
        spellcheck="false"
        :value="openaiBaseUrl"
        @input="handleBaseUrlChange"
      />
    </div>

    <div>
      <div class="text-hoi4-text font-bold mb-2">Model</div>
      <input
        class="w-full rounded-xl bg-hoi4-gray/70 border border-hoi4-border/60 text-hoi4-text text-sm px-3 py-2 focus:outline-none focus:border-hoi4-accent"
        placeholder="gpt-4o-mini"
        type="text"
        autocomplete="off"
        spellcheck="false"
        :value="openaiModel"
        @input="handleModelChange"
      />
    </div>
  </div>
</template>
