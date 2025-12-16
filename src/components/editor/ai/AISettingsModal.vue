<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  aiRule: string
  aiAgentMode: 'plan' | 'code' | 'ask'
  agentModeMenuOpenSettings: boolean
  renderMarkdown: boolean
  requestReasoning: boolean
  openaiApiKey: string
  openaiBaseUrl: string
  openaiModel: string
}>(), {
  open: false
})

const emit = defineEmits<{
  close: []
  'update:aiRule': [value: string]
  'update:aiAgentMode': [value: 'plan' | 'code' | 'ask']
  'update:agentModeMenuOpenSettings': [value: boolean]
  'update:renderMarkdown': [value: boolean]
  'update:requestReasoning': [value: boolean]
  'update:openaiApiKey': [value: string]
  'update:openaiBaseUrl': [value: string]
  'update:openaiModel': [value: string]
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
      class="border border-hoi4-border rounded-2xl shadow-2xl overflow-hidden w-[520px] max-w-[90vw] max-h-[85vh] ai-solid-dropdown"
      @click.stop
    >
      <div class="px-6 py-4 border-b border-hoi4-border">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-hoi4-text">AI 设置</h3>
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

      <div class="px-6 py-5 space-y-4 overflow-y-auto" style="max-height: calc(85vh - 128px);">
        <div>
          <div class="text-sm font-bold text-hoi4-text mb-2">规则</div>
          <textarea
            :value="props.aiRule"
            class="w-full resize-none rounded-xl bg-hoi4-gray/70 border border-hoi4-border/60 text-hoi4-text text-sm px-3 py-2 focus:outline-none focus:border-hoi4-accent"
            :rows="5"
            placeholder="填写规则（单条）..."
            @input="emit('update:aiRule', ($event.target as HTMLTextAreaElement).value)"
          />
          <div class="text-hoi4-text-dim text-xs mt-2">
            层级顺序：系统提示词（内置） &gt; 规则 &gt; 智能体（Plan/Code/Ask） &gt; 用户输入。
          </div>
        </div>

        <div class="rounded-xl border border-hoi4-border/60 bg-hoi4-gray/40 px-3 py-2">
          <div class="text-sm font-bold text-hoi4-text mb-2">智能体</div>
          <div class="relative inline-block">
            <button
              class="px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 bg-hoi4-border/40 hover:bg-hoi4-border/60 text-hoi4-text"
              @click="emit('update:agentModeMenuOpenSettings', !props.agentModeMenuOpenSettings)"
            >
              {{ props.aiAgentMode === 'plan' ? 'Plan' : props.aiAgentMode === 'code' ? 'Code' : 'Ask' }}
            </button>
            <div
              v-if="props.agentModeMenuOpenSettings"
              class="absolute left-0 top-12 min-w-44 rounded-xl border border-hoi4-border shadow-2xl overflow-hidden z-50 ai-solid-dropdown"
            >
              <button
                class="w-full text-left px-3 py-2 text-sm transition-colors"
                :class="props.aiAgentMode === 'plan' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
                @click="emit('update:aiAgentMode', 'plan'); emit('update:agentModeMenuOpenSettings', false)"
              >
                Plan
              </button>
              <button
                class="w-full text-left px-3 py-2 text-sm transition-colors"
                :class="props.aiAgentMode === 'code' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
                @click="emit('update:aiAgentMode', 'code'); emit('update:agentModeMenuOpenSettings', false)"
              >
                Code
              </button>
              <button
                class="w-full text-left px-3 py-2 text-sm transition-colors"
                :class="props.aiAgentMode === 'ask' ? 'bg-hoi4-accent/40 text-hoi4-text' : 'hover:bg-hoi4-border/60 text-hoi4-text-dim'"
                @click="emit('update:aiAgentMode', 'ask'); emit('update:agentModeMenuOpenSettings', false)"
              >
                Ask
              </button>
            </div>
          </div>
          <div class="text-hoi4-text-dim text-xs mt-2">
            内置智能体：Plan（先规划后执行）、Code（偏代码实现）、Ask（先澄清再行动）。
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-bold text-hoi4-text">Markdown 渲染</div>
            <div class="text-hoi4-text-dim text-xs mt-1">assistant 输出使用 Markdown 格式渲染</div>
          </div>
          <button
            class="px-3 py-1 rounded-xl text-sm transition-colors font-medium"
            :class="props.renderMarkdown ? 'bg-hoi4-accent/80 hover:bg-hoi4-border/80 text-hoi4-text' : 'bg-hoi4-border/40 hover:bg-hoi4-border/60 text-hoi4-text-dim'"
            @click="emit('update:renderMarkdown', !props.renderMarkdown)"
          >
            {{ props.renderMarkdown ? '开启' : '关闭' }}
          </button>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-bold text-hoi4-text">返回推理</div>
            <div class="text-hoi4-text-dim text-xs mt-1">向 OpenAI 兼容服务请求返回 reasoning（官方 OpenAI 默认不发送该参数）</div>
          </div>
          <button
            class="px-3 py-1 rounded-xl text-sm transition-colors font-medium"
            :class="props.requestReasoning ? 'bg-hoi4-accent/80 hover:bg-hoi4-border/80 text-hoi4-text' : 'bg-hoi4-border/40 hover:bg-hoi4-border/60 text-hoi4-text-dim'"
            @click="emit('update:requestReasoning', !props.requestReasoning)"
          >
            {{ props.requestReasoning ? '开启' : '关闭' }}
          </button>
        </div>

        <div>
          <div class="text-sm font-bold text-hoi4-text mb-2">OpenAI API Key</div>
          <input
            :value="props.openaiApiKey"
            class="w-full rounded-xl bg-hoi4-gray/70 border border-hoi4-border/60 text-hoi4-text text-sm px-3 py-2 focus:outline-none focus:border-hoi4-accent"
            placeholder="sk-..."
            type="password"
            autocomplete="off"
            spellcheck="false"
            @input="emit('update:openaiApiKey', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div>
          <div class="text-sm font-bold text-hoi4-text mb-2">Base URL</div>
          <input
            :value="props.openaiBaseUrl"
            class="w-full rounded-xl bg-hoi4-gray/70 border border-hoi4-border/60 text-hoi4-text text-sm px-3 py-2 focus:outline-none focus:border-hoi4-accent"
            placeholder="https://api.openai.com"
            type="text"
            autocomplete="off"
            spellcheck="false"
            @input="emit('update:openaiBaseUrl', ($event.target as HTMLInputElement).value)"
          />
          <div class="text-hoi4-text-dim text-xs mt-2">
            兼容 OpenAI 的服务地址（会自动拼接 `/v1/chat/completions`）。
          </div>
        </div>

        <div>
          <div class="text-sm font-bold text-hoi4-text mb-2">Model</div>
          <input
            :value="props.openaiModel"
            class="w-full rounded-xl bg-hoi4-gray/70 border border-hoi4-border/60 text-hoi4-text text-sm px-3 py-2 focus:outline-none focus:border-hoi4-accent"
            placeholder="gpt-4o-mini"
            type="text"
            autocomplete="off"
            spellcheck="false"
            @input="emit('update:openaiModel', ($event.target as HTMLInputElement).value)"
          />
          <div class="text-hoi4-text-dim text-xs mt-2">
            使用的模型名称（不同 OpenAI 兼容服务可能不同）。
          </div>
        </div>
      </div>

      <div class="px-6 py-4 border-t-2 flex justify-end gap-3" style="border-color: #2a2a2a;">
        <button
          class="px-5 py-2 rounded text-sm transition-colors font-medium"
          style="background-color: #2a2a2a; color: #a0a0a0;"
          @click="emit('close')"
        >
          完成
        </button>
      </div>
    </div>
  </div>
</template>
