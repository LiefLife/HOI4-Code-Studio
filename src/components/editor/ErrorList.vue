<script setup lang="ts">
defineProps<{
  errors: Array<{line: number, msg: string, type: string}>
}>()

const emit = defineEmits<{
  jumpToError: [error: {line: number, msg: string, type: string}]
}>()
</script>

<template>
  <div class="h-full flex flex-col bg-hoi4-dark border-l border-hoi4-border">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-hoi4-border bg-hoi4-gray/50 backdrop-blur-sm flex justify-between items-center sticky top-0 z-10">
      <div class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-onedark-error">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span class="text-hoi4-text font-semibold text-sm tracking-wide">问题</span>
      </div>
      <span v-if="errors.length > 0" class="bg-onedark-error/10 text-onedark-error text-xs px-2 py-0.5 rounded-full font-mono font-medium border border-onedark-error/20">
        {{ errors.length }}
      </span>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
      <!-- Empty State -->
      <div v-if="errors.length === 0" class="h-full flex flex-col items-center justify-center text-hoi4-text-dim opacity-60">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3 text-onedark-success">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <p class="text-sm font-medium">未发现问题</p>
        <p class="text-xs opacity-70 mt-1">您的代码超过了99%写HOI Mod的人类!</p>
      </div>

      <!-- Error Islands -->
      <div
        v-for="(error, index) in errors"
        :key="index"
        @click="emit('jumpToError', error)"
        class="group relative bg-hoi4-gray hover:bg-hoi4-accent/50 border border-hoi4-border hover:border-onedark-error/40 rounded-lg p-3 cursor-pointer transition-all duration-200 ease-out shadow-sm hover:shadow-md overflow-hidden"
      >
        <!-- 左侧强调条 -->
        <div class="absolute left-0 top-0 bottom-0 w-1 bg-onedark-error opacity-60 group-hover:opacity-100 transition-opacity"></div>

        <div class="pl-2 flex gap-3">
          <!-- 行号 Box -->
          <div class="flex-shrink-0 flex flex-col items-center justify-center w-9 h-9 bg-hoi4-dark rounded border border-hoi4-border group-hover:border-onedark-error/20 transition-colors mt-0.5">
            <span class="text-[9px] text-hoi4-text-dim uppercase font-bold scale-75 origin-bottom">Line</span>
            <span class="text-sm font-mono font-bold text-hoi4-text group-hover:text-onedark-error transition-colors">{{ error.line }}</span>
          </div>

          <!-- 信息主体 -->
          <div class="flex-1 min-w-0 flex flex-col justify-center">
            <div class="text-sm text-hoi4-text font-medium leading-tight mb-1.5 truncate group-hover:text-white transition-colors" :title="error.msg">
              {{ error.msg }}
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-onedark-error/10 text-onedark-error border border-onedark-error/10 truncate max-w-full">
                {{ error.type }}
              </span>
            </div>
          </div>
        </div>

        <!-- 悬停时的跳转提示图标 (绝对定位) -->
        <div class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-hoi4-text-dim">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #3a3a3a;
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #4a4a4a;
}
</style>
