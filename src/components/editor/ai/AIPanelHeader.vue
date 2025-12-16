<script setup lang="ts">
const emit = defineEmits<{
  openHistory: []
  startNewChat: []
  openSettings: []
}>()
</script>

<template>
  <div class="px-3 pt-3">
    <div class="flex items-center justify-between px-3 py-2 bg-hoi4-gray/70 border border-hoi4-border/60 rounded-2xl shadow-lg backdrop-blur-sm">
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1 rounded-xl text-sm bg-hoi4-border/40 hover:bg-hoi4-border/60 active:scale-95 transition-all shadow-sm text-hoi4-text"
          @click="emit('openHistory')"
        >
          历史
        </button>
        <div class="text-hoi4-text font-bold text-sm tracking-wide">AI</div>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1 rounded-xl text-sm bg-hoi4-border/40 hover:bg-hoi4-border/60 active:scale-95 transition-all shadow-sm text-hoi4-text"
          @click="emit('startNewChat')"
        >
          新对话
        </button>
        <button
          class="px-3 py-1 rounded-xl text-sm bg-hoi4-accent/80 hover:bg-hoi4-border/80 active:scale-95 transition-all shadow-sm"
          @click="emit('openSettings')"
        >
          设置
        </button>
      </div>
    </div>
  </div>
</template>
