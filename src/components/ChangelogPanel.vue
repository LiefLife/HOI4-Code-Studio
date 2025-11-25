<script setup lang="ts">
import { ref } from 'vue'
import { changelog, type ChangelogItem } from '../data/changelog'

// Props
defineProps<{
  visible: boolean
}>()

// Emits
const emit = defineEmits<{
  (e: 'close'): void
}>()

// 展开状态管理：默认展开第一个版本
const expandedVersions = ref<Set<string>>(new Set([changelog[0]?.version || '']))

// 切换版本展开状态
function toggleVersion(version: string) {
  if (expandedVersions.value.has(version)) {
    expandedVersions.value.delete(version)
  } else {
    expandedVersions.value.add(version)
  }
  // 触发响应式更新
  expandedVersions.value = new Set(expandedVersions.value)
}

// 检查版本是否展开
function isExpanded(version: string): boolean {
  return expandedVersions.value.has(version)
}

// 全部展开
function expandAll() {
  changelog.forEach(log => expandedVersions.value.add(log.version))
  expandedVersions.value = new Set(expandedVersions.value)
}

// 全部折叠
function collapseAll() {
  expandedVersions.value.clear()
  expandedVersions.value = new Set(expandedVersions.value)
}

// 获取变更类型的图标和颜色
function getChangeTypeInfo(type: ChangelogItem['type']) {
  switch (type) {
    case 'feature':
      return { 
        icon: 'M12 4v16m8-8H4', 
        color: 'text-onedark-success',
        bgColor: 'bg-onedark-success/20',
        label: '新功能'
      }
    case 'fix':
      return { 
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', 
        color: 'text-onedark-error',
        bgColor: 'bg-onedark-error/20',
        label: '修复'
      }
    case 'improvement':
      return { 
        icon: 'M13 10V3L4 14h7v7l9-11h-7z', 
        color: 'text-onedark-warning',
        bgColor: 'bg-onedark-warning/20',
        label: '优化'
      }
    default:
      return { 
        icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', 
        color: 'text-onedark-comment',
        bgColor: 'bg-onedark-comment/20',
        label: '其他'
      }
  }
}

// 关闭面板
function handleClose() {
  emit('close')
}
</script>

<template>
  <!-- 侧边滑入面板 -->
  <Transition name="slide">
    <div
      v-if="visible"
      class="fixed inset-y-0 right-0 z-50 flex"
    >
      <!-- 背景遮罩 -->
      <div 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm"
        @click="handleClose"
      ></div>
      
      <!-- 面板主体 -->
      <div class="relative w-[min(450px,90vw)] h-full bg-onedark-bg-secondary border-l-2 border-onedark-border shadow-2xl flex flex-col">
        <!-- 头部 -->
        <div class="flex items-center justify-between p-4 border-b border-onedark-border">
          <div class="flex items-center space-x-3">
            <svg class="w-6 h-6 text-onedark-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 class="text-lg font-bold text-onedark-fg">更新日志</h2>
          </div>
          
          <div class="flex items-center space-x-2">
            <!-- 全部展开/折叠按钮 -->
            <button
              @click="expandAll"
              class="p-1.5 rounded hover:bg-onedark-selection transition-colors"
              title="全部展开"
            >
              <svg class="w-4 h-4 text-onedark-comment hover:text-onedark-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button
              @click="collapseAll"
              class="p-1.5 rounded hover:bg-onedark-selection transition-colors"
              title="全部折叠"
            >
              <svg class="w-4 h-4 text-onedark-comment hover:text-onedark-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
              </svg>
            </button>
            
            <!-- 关闭按钮 -->
            <button
              @click="handleClose"
              class="p-1.5 rounded hover:bg-onedark-selection transition-colors ml-2"
              title="关闭"
            >
              <svg class="w-5 h-5 text-onedark-comment hover:text-onedark-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- 时间线内容 -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="relative timeline-container">
            <!-- 版本节点列表 -->
            <div class="space-y-0">
              <div
                v-for="(log, index) in changelog"
                :key="log.version"
                class="relative pl-12 pb-6 last:pb-0"
              >
                <!-- 地铁线风格垂直连接线 -->
                <div 
                  v-if="index < changelog.length - 1"
                  class="timeline-line absolute left-[18px] top-6 bottom-0 w-1 rounded-full"
                  :class="index === 0 ? 'bg-onedark-accent' : 'bg-onedark-border'"
                ></div>
                
                <!-- 节点圆点 - 地铁站风格 -->
                <div 
                  class="timeline-node absolute left-2 top-1 w-6 h-6 rounded-full border-[3px] flex items-center justify-center transition-all duration-200 z-10"
                  :class="[
                    index === 0 
                      ? 'bg-onedark-accent border-onedark-accent shadow-lg shadow-onedark-accent/40' 
                      : isExpanded(log.version) 
                        ? 'bg-onedark-bg-secondary border-onedark-accent'
                        : 'bg-onedark-bg-secondary border-onedark-comment'
                  ]"
                >
                  <!-- 当前版本的内部圆点 -->
                  <div 
                    v-if="index === 0"
                    class="w-2.5 h-2.5 bg-onedark-bg rounded-full"
                  ></div>
                  <!-- 其他版本的内部小圆点 -->
                  <div 
                    v-else
                    class="w-2 h-2 rounded-full transition-colors"
                    :class="isExpanded(log.version) ? 'bg-onedark-accent' : 'bg-onedark-comment'"
                  ></div>
                </div>
                
                <!-- 版本卡片 -->
                <div 
                  class="card !p-0 overflow-hidden transition-all duration-200"
                  :class="{ 'ring-1 ring-onedark-accent': index === 0 }"
                >
                  <!-- 版本标题栏（可点击折叠） -->
                  <button
                    @click="toggleVersion(log.version)"
                    class="w-full flex items-center justify-between p-3 hover:bg-onedark-selection/50 transition-colors text-left"
                  >
                    <div class="flex items-center space-x-3">
                      <!-- 版本号标签 -->
                      <span 
                        class="px-2 py-0.5 rounded text-xs font-mono font-bold"
                        :class="index === 0 ? 'bg-onedark-accent text-onedark-bg' : 'bg-onedark-border text-onedark-fg'"
                      >
                        {{ log.version }}
                      </span>
                      
                      <!-- 当前版本标记 -->
                      <span 
                        v-if="index === 0"
                        class="px-1.5 py-0.5 bg-onedark-success/20 text-onedark-success text-xs rounded"
                      >
                        当前
                      </span>
                    </div>
                    
                    <!-- 展开/折叠图标 -->
                    <svg 
                      class="w-4 h-4 text-onedark-comment transition-transform duration-200"
                      :class="{ 'rotate-180': isExpanded(log.version) }"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  <!-- 版本描述 -->
                  <div 
                    v-if="log.description"
                    class="px-3 pb-2 text-sm text-onedark-comment border-b border-onedark-border/50"
                  >
                    {{ log.description }}
                  </div>
                  
                  <!-- 变更内容（可折叠） -->
                  <Transition name="expand">
                    <div v-if="isExpanded(log.version)" class="px-3 py-2 space-y-1.5">
                      <div
                        v-for="(change, cIndex) in log.changes"
                        :key="cIndex"
                        class="flex items-start space-x-2 text-sm"
                      >
                        <!-- 变更类型图标 -->
                        <div 
                          class="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center mt-0.5"
                          :class="getChangeTypeInfo(change.type).bgColor"
                        >
                          <svg 
                            class="w-3 h-3"
                            :class="getChangeTypeInfo(change.type).color"
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getChangeTypeInfo(change.type).icon" />
                          </svg>
                        </div>
                        
                        <!-- 变更内容 -->
                        <span class="text-onedark-fg leading-relaxed">{{ change.content }}</span>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 底部说明 -->
        <div class="p-3 border-t border-onedark-border text-center">
          <div class="flex items-center justify-center space-x-4 text-xs text-onedark-comment">
            <span class="flex items-center space-x-1">
              <span class="w-2 h-2 rounded-full bg-onedark-success"></span>
              <span>新功能</span>
            </span>
            <span class="flex items-center space-x-1">
              <span class="w-2 h-2 rounded-full bg-onedark-error"></span>
              <span>修复</span>
            </span>
            <span class="flex items-center space-x-1">
              <span class="w-2 h-2 rounded-full bg-onedark-warning"></span>
              <span>优化</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 侧边滑入动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* 展开折叠动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 500px;
}

/* 时间线增强样式 */
.timeline-container {
  position: relative;
}

/* 地铁线风格的连接线 */
.timeline-line {
  background: linear-gradient(
    to bottom,
    var(--theme-border) 0%,
    var(--theme-border) 100%
  );
}

/* 节点悬停效果 */
.timeline-node {
  transition: all 0.2s ease;
  box-shadow: 0 0 0 3px var(--theme-bg-secondary);
}

.timeline-node:hover {
  transform: scale(1.1);
}

/* 当前版本节点发光效果 */
.timeline-node.shadow-lg {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 3px var(--theme-bg-secondary), 
                0 0 10px var(--theme-accent);
  }
  50% {
    box-shadow: 0 0 0 3px var(--theme-bg-secondary), 
                0 0 20px var(--theme-accent);
  }
}
</style>
