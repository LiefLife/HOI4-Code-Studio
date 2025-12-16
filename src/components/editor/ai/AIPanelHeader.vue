<script setup lang="ts">
const emit = defineEmits<{
  openHistory: []
  startNewChat: []
  openSettings: []
}>()
</script>

<template>
  <div class="px-3 pt-3">
    <div class="flex items-center justify-between px-3 py-2 bg-hoi4-gray/85 border border-hoi4-border/80 rounded-2xl shadow-lg backdrop-blur-sm">
      <div class="flex items-center gap-2">
        <button
          class="p-2 rounded-xl text-sm bg-hoi4-border/50 hover:bg-hoi4-border/70 active:scale-95 transition-all shadow-sm text-hoi4-text"
          @click="emit('openHistory')"
          title="历史"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
              d="M3 12a9 9 0 1 0 3-6.708"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M3 3v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-hoi4-accent" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
              d="M9 3h6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M10 3v2"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M14 3v2"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M5 11a7 7 0 0 1 14 0v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-4Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M9 14h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            <path d="M15 14h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            <path
              d="M9 18v1"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M15 18v1"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <div class="text-hoi4-text font-bold text-sm tracking-wide">AI</div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="p-2 rounded-xl text-sm bg-hoi4-border/50 hover:bg-hoi4-border/70 active:scale-95 transition-all shadow-sm text-hoi4-text"
          @click="emit('startNewChat')"
          title="新对话"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <button
          class="p-2 rounded-xl text-sm bg-hoi4-accent/85 hover:bg-hoi4-border/80 active:scale-95 transition-all shadow-sm text-hoi4-text"
          @click="emit('openSettings')"
          title="设置"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
              d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M19.4 15a7.97 7.97 0 0 0 .1-1 7.97 7.97 0 0 0-.1-1l2.1-1.6-2-3.4-2.5 1a8.3 8.3 0 0 0-1.7-1l-.4-2.7H9.1l-.4 2.7a8.3 8.3 0 0 0-1.7 1l-2.5-1-2 3.4L4.6 13a7.97 7.97 0 0 0-.1 1c0 .34.03.67.1 1L2.5 16.6l2 3.4 2.5-1c.52.4 1.09.74 1.7 1l.4 2.7h5.8l.4-2.7c.61-.26 1.18-.6 1.7-1l2.5 1 2-3.4-2.1-1.6Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
