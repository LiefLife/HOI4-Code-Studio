<script setup lang="ts">
import { onMounted } from 'vue'
import { useAiChat } from '../../composables/useAiChat'
import AIPanelHeader from './ai/AIPanelHeader.vue'
import AIPanelMessages from './ai/AIPanelMessages.vue'
import AIPanelInput from './ai/AIPanelInput.vue'
import AISettingsModal from './ai/AISettingsModal.vue'
import AIHistoryModal from './ai/AIHistoryModal.vue'

const {
  messages,
  input,
  isSending,
  settingsOpen,
  historyOpen,
  openaiApiKey,
  openaiBaseUrl,
  openaiModel,
  renderMarkdown,
  requestReasoning,
  aiRule,
  aiAgentMode,
  agentModeMenuOpen,
  agentModeMenuOpenSettings,
  chatSessions,
  currentSessionId,
  messagesEl,
  canSend,
  groupedMessages,
  assistantHtml,
  openSettings,
  openHistory,
  closeSettings,
  closeHistory,
  startNewChat,
  selectChatSession,
  handleSend,
  handleInputKeydown,
  toggleReasoning,
  isToolResultMessage,
  toolResultInfo,
  saveAiSettings
} = useAiChat()

onMounted(() => {
  void messagesEl.value
})

function toggleAgentMenu() {
  agentModeMenuOpen.value = !agentModeMenuOpen.value
}

function setAgentMode(mode: 'plan' | 'code' | 'ask') {
  aiAgentMode.value = mode
  agentModeMenuOpen.value = false
  void saveAiSettings()
}
</script>

<template>
  <div class="h-full overflow-hidden flex flex-col">
    <AIPanelHeader @open-history="openHistory" @start-new-chat="startNewChat" @open-settings="openSettings" />

    <div ref="messagesEl" class="flex-1 overflow-y-auto p-3 space-y-2">
      <AIPanelMessages
        :messages="messages"
        :grouped-messages="groupedMessages"
        :render-markdown="renderMarkdown"
        :assistant-html="assistantHtml"
        :toggle-reasoning="toggleReasoning"
        :is-tool-result-message="isToolResultMessage"
        :tool-result-info="toolResultInfo"
      />
    </div>

    <AIPanelInput
      v-model="input"
      :can-send="canSend"
      :is-sending="isSending"
      :ai-agent-mode="aiAgentMode"
      :agent-mode-menu-open="agentModeMenuOpen"
      @send="handleSend"
      @keydown="handleInputKeydown"
      @toggle-agent-menu="toggleAgentMenu"
      @set-agent-mode="setAgentMode"
    />

    <AISettingsModal
      :open="settingsOpen"
      :ai-rule="aiRule"
      :ai-agent-mode="aiAgentMode"
      :agent-mode-menu-open-settings="agentModeMenuOpenSettings"
      :render-markdown="renderMarkdown"
      :request-reasoning="requestReasoning"
      :openai-api-key="openaiApiKey"
      :openai-base-url="openaiBaseUrl"
      :openai-model="openaiModel"
      @close="closeSettings"
      @update:ai-rule="aiRule = $event"
      @update:ai-agent-mode="aiAgentMode = $event"
      @update:agent-mode-menu-open-settings="agentModeMenuOpenSettings = $event"
      @update:render-markdown="renderMarkdown = $event"
      @update:request-reasoning="requestReasoning = $event"
      @update:openai-api-key="openaiApiKey = $event"
      @update:openai-base-url="openaiBaseUrl = $event"
      @update:openai-model="openaiModel = $event"
    />

    <AIHistoryModal
      :open="historyOpen"
      :chat-sessions="chatSessions"
      :current-session-id="currentSessionId"
      @close="closeHistory"
      @select="selectChatSession"
    />
  </div>
</template>
