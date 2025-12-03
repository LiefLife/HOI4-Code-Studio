<template>
  <div class="space-y-4">
    <!-- 主题标题和切换按钮 -->
    <div class="flex items-center justify-between mb-2">
      <label class="block text-hoi4-text text-base font-semibold">
        界面主题
      </label>
      <button
        @click="showThemeOptions = !showThemeOptions"
        class="flex items-center space-x-1 text-hoi4-accent hover:text-hoi4-accent/80 transition-colors"
      >
        <svg
          class="w-5 h-5 transition-transform duration-300"
          :class="showThemeOptions ? 'transform rotate-180' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
        <span class="text-sm">{{ showThemeOptions ? '收起' : '展开' }}</span>
      </button>
    </div>
    
    <!-- 主题选择网格 - 带过渡动画 -->
    <div
      class="overflow-hidden transition-all duration-300 ease-in-out"
      :class="showThemeOptions ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'"
    >
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 overflow-y-auto max-h-[400px] custom-scrollbar">
        <button
          v-for="theme in themes"
          :key="theme.id"
          @click="setTheme(theme.id)"
          class="relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-[1.02]"
          :class="[
            currentThemeId === theme.id
              ? 'border-hoi4-accent ring-2 ring-hoi4-accent ring-opacity-50'
              : 'border-hoi4-border hover:border-hoi4-accent'
          ]"
          :style="{ backgroundColor: theme.colors.bgSecondary }"
        >
          <!-- 主题预览色块 -->
          <div class="flex space-x-1 mb-2 justify-center">
            <div
              class="w-3 h-3 rounded"
              :style="{ backgroundColor: theme.colors.accent }"
            ></div>
            <div
              class="w-3 h-3 rounded"
              :style="{ backgroundColor: theme.colors.success }"
            ></div>
            <div
              class="w-3 h-3 rounded"
              :style="{ backgroundColor: theme.colors.warning }"
            ></div>
            <div
              class="w-3 h-3 rounded"
              :style="{ backgroundColor: theme.colors.error }"
            ></div>
          </div>
          <!-- 主题名称 -->
          <div
            class="text-xs font-medium text-center"
            :style="{ color: theme.colors.fg }"
          >
            {{ theme.name }}
          </div>
          <!-- 当前选中标记 -->
          <div
            v-if="currentThemeId === theme.id"
            class="absolute top-1 right-1"
          >
            <svg
              class="w-4 h-4"
              :style="{ color: theme.colors.accent }"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </div>
        </button>
      </div>
      <p class="text-hoi4-comment text-sm mt-2">
        在编辑器中可按 <kbd class="px-1.5 py-0.5 rounded bg-hoi4-gray border border-hoi4-border text-hoi4-text">Ctrl+Shift+T</kbd> 快速切换主题
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTheme, themes } from '../../composables/useTheme'

const { currentThemeId, setTheme } = useTheme()
const showThemeOptions = ref(true)
</script>