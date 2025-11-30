<script setup lang="ts">
import { useFileTreeIcons, type IconSet } from '../composables/useFileTreeIcons'

const {
  iconSets,
  currentIconSetId,
  iconPanelVisible,
  setIconSet,
  closeIconPanel
} = useFileTreeIcons()

/**
 * 选择图标集
 */
function selectIconSet(iconSet: IconSet) {
  setIconSet(iconSet.id)
  closeIconPanel()
}

/**
 * 关闭面板（点击背景）
 */
function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    closeIconPanel()
  }
}

/**
 * 处理键盘事件
 */
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeIconPanel()
  }
}

/**
 * 获取预览文件列表
 */
function getPreviewFiles() {
  return [
    { name: 'common', isDirectory: true, isExpanded: true },
    { name: 'events', isDirectory: true, isExpanded: false },
    { name: 'focus', isDirectory: true, isExpanded: false },
    { name: 'ideas', isDirectory: true, isExpanded: false },
    { name: 'on_actions', isDirectory: true, isExpanded: false },
    { name: 'decisions', isDirectory: true, isExpanded: false },
    { name: 'country_tags.json', isDirectory: false },
    { name: 'state_categories.json', isDirectory: false },
    { name: 'scripted_gui.gui', isDirectory: false },
    { name: 'test_event.txt', isDirectory: false },
    { name: 'readme.md', isDirectory: false },
    { name: 'logo.png', isDirectory: false }
  ]
}

/**
 * 获取图标路径
 */
function getIconPath(iconSet: IconSet, fileName: string, isDirectory: boolean, isExpanded: boolean): string {
  if (isDirectory) {
    const folderIcons = iconSet.icons.folder
    return isExpanded ? folderIcons.open : folderIcons.closed
  }
  
  const ext = fileName.split('.').pop()?.toLowerCase() || 'default'
  return iconSet.icons.files[ext] || iconSet.icons.files.default
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="iconPanelVisible"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        @click="handleBackdropClick"
        @keydown="handleKeydown"
        tabindex="0"
      >
        <div class="bg-theme-bg-secondary border-2 border-theme-border rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden">
          <!-- 标题栏 -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-theme-border">
            <h2 class="text-xl font-bold text-theme-fg">选择文件树图标</h2>
            <button
              @click="closeIconPanel"
              class="p-2 rounded-lg hover:bg-theme-selection transition-colors text-theme-comment hover:text-theme-fg"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- 图标集列表 -->
          <div class="p-6 overflow-y-auto max-h-[65vh] custom-scrollbar">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div
                v-for="iconSet in iconSets"
                :key="iconSet.id"
                @click="selectIconSet(iconSet)"
                class="relative p-4 rounded-lg border-2 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                :class="[
                  currentIconSetId === iconSet.id
                    ? 'border-theme-accent ring-2 ring-theme-accent ring-opacity-50'
                    : 'border-theme-border hover:border-theme-accent'
                ]"
              >
                <!-- 图标集标题 -->
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-lg font-semibold text-theme-fg">{{ iconSet.name }}</h3>
                  <!-- 当前选中标记 -->
                  <div
                    v-if="currentIconSetId === iconSet.id"
                    class="flex items-center text-theme-accent"
                  >
                    <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                    <span class="text-sm">当前使用</span>
                  </div>
                </div>

                <!-- 图标集描述 -->
                <p class="text-sm text-theme-comment mb-4">{{ iconSet.description }}</p>

                <!-- 图标预览 -->
                <div class="bg-theme-bg rounded-lg p-3">
                  <h4 class="text-sm font-medium text-theme-fg mb-2">预览效果</h4>
                  <div class="space-y-1">
                    <div
                      v-for="file in getPreviewFiles()"
                      :key="file.name"
                      class="flex items-center space-x-2 text-sm"
                    >
                      <!-- 图标显示 -->
                      <span class="flex items-center justify-center icon-preview-container">
                        <img
                          v-if="iconSet.type === 'svg'"
                          :src="getIconPath(iconSet, file.name, file.isDirectory, file.isExpanded || false)"
                          :alt="file.name"
                          class="icon-preview-svg"
                          loading="lazy"
                        />
                        <span v-else class="icon-preview-emoji">{{ getIconPath(iconSet, file.name, file.isDirectory, file.isExpanded || false) }}</span>
                      </span>
                      <span class="flex items-center justify-center">
                        <img
                          v-if="iconSet.type === 'svg'"
                          :src="getIconPath(iconSet, file.name, file.isDirectory, file.isExpanded || false)"
                          :alt="file.name"
                          class="w-4 h-4"
                          loading="lazy"
                        />
                        <span v-else class="text-lg">{{ getIconPath(iconSet, file.name, file.isDirectory, file.isExpanded || false) }}</span>
                      </span>
                      <span class="text-theme-fg">{{ file.name }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部提示 -->
          <div class="px-6 py-3 border-t border-theme-border bg-theme-bg">
            <p class="text-sm text-theme-comment text-center">
              按 <kbd class="px-2 py-0.5 rounded bg-theme-selection text-theme-fg">Esc</kbd> 关闭 · 
              按 <kbd class="px-2 py-0.5 rounded bg-theme-selection text-theme-fg">Ctrl+Shift+Y</kbd> 打开
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
/* 图标预览样式 */
.icon-preview-container {
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-preview-svg {
  width: 100%;
  height: 100%;
  object-fit: contain;
  flex-shrink: 0;
}

.icon-preview-emoji {
  font-size: 1rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: var(--theme-bg);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--theme-border);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--theme-comment);
}
</style>