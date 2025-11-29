<script setup lang="ts">
import { useTheme, type Theme } from '../composables/useTheme'

const {
  themes,
  currentThemeId,
  themePanelVisible,
  setTheme,
  closeThemePanel
} = useTheme()

/**
 * 选择主题
 */
function selectTheme(theme: Theme) {
  setTheme(theme.id)
  closeThemePanel()
}

/**
 * 关闭面板（点击背景）
 */
function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    closeThemePanel()
  }
}

/**
 * 处理键盘事件
 */
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeThemePanel()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="themePanelVisible"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        @click="handleBackdropClick"
        @keydown="handleKeydown"
        tabindex="0"
      >
        <div class="bg-theme-bg-secondary border-2 border-theme-border rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
          <!-- 标题栏 -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-theme-border">
            <h2 class="text-xl font-bold text-theme-fg">选择主题</h2>
            <button
              @click="closeThemePanel"
              class="p-2 rounded-lg hover:bg-theme-selection transition-colors text-theme-comment hover:text-theme-fg"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- 主题列表 -->
          <div class="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <button
                v-for="theme in themes"
                :key="theme.id"
                @click="selectTheme(theme)"
                class="relative p-4 rounded-lg border-2 transition-all duration-200 hover:scale-[1.02]"
                :class="[
                  currentThemeId === theme.id
                    ? 'border-theme-accent ring-2 ring-theme-accent ring-opacity-50'
                    : 'border-theme-border hover:border-theme-accent'
                ]"
                :style="{ backgroundColor: theme.colors.bgSecondary }"
              >
                <!-- 主题预览色块 -->
                <div class="flex space-x-1 mb-3">
                  <div
                    class="w-4 h-4 rounded"
                    :style="{ backgroundColor: theme.colors.accent }"
                  ></div>
                  <div
                    class="w-4 h-4 rounded"
                    :style="{ backgroundColor: theme.colors.success }"
                  ></div>
                  <div
                    class="w-4 h-4 rounded"
                    :style="{ backgroundColor: theme.colors.warning }"
                  ></div>
                  <div
                    class="w-4 h-4 rounded"
                    :style="{ backgroundColor: theme.colors.error }"
                  ></div>
                  <div
                    class="w-4 h-4 rounded"
                    :style="{ backgroundColor: theme.colors.keyword }"
                  ></div>
                </div>

                <!-- 主题预览卡片 -->
                <div
                  class="rounded p-2 mb-2"
                  :style="{ backgroundColor: theme.colors.bg }"
                >
                  <div class="flex items-center space-x-2 mb-1">
                    <div
                      class="w-2 h-2 rounded-full"
                      :style="{ backgroundColor: theme.colors.error }"
                    ></div>
                    <div
                      class="w-2 h-2 rounded-full"
                      :style="{ backgroundColor: theme.colors.warning }"
                    ></div>
                    <div
                      class="w-2 h-2 rounded-full"
                      :style="{ backgroundColor: theme.colors.success }"
                    ></div>
                  </div>
                  <div class="space-y-1">
                    <div
                      class="h-1.5 w-3/4 rounded"
                      :style="{ backgroundColor: theme.colors.accent }"
                    ></div>
                    <div
                      class="h-1.5 w-1/2 rounded"
                      :style="{ backgroundColor: theme.colors.comment }"
                    ></div>
                    <div
                      class="h-1.5 w-2/3 rounded"
                      :style="{ backgroundColor: theme.colors.fg }"
                    ></div>
                  </div>
                </div>

                <!-- 主题名称 -->
                <div
                  class="text-sm font-medium text-center"
                  :style="{ color: theme.colors.fg }"
                >
                  {{ theme.name }}
                </div>

                <!-- 当前选中标记 -->
                <div
                  v-if="currentThemeId === theme.id"
                  class="absolute top-2 right-2"
                >
                  <svg
                    class="w-5 h-5"
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
          </div>

          <!-- 底部提示 -->
          <div class="px-6 py-3 border-t border-theme-border bg-theme-bg">
            <p class="text-sm text-theme-comment text-center">
              按 <kbd class="px-2 py-0.5 rounded bg-theme-selection text-theme-fg">Esc</kbd> 关闭 · 
              按 <kbd class="px-2 py-0.5 rounded bg-theme-selection text-theme-fg">Ctrl+Shift+T</kbd> 打开
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .bg-theme-bg-secondary,
.fade-leave-active .bg-theme-bg-secondary {
  transition: transform 0.2s ease;
}

.fade-enter-from .bg-theme-bg-secondary {
  transform: scale(0.95);
}

.fade-leave-to .bg-theme-bg-secondary {
  transform: scale(0.95);
}
</style>
