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
        color: 'text-theme-success',
        bgColor: 'theme-success-bg',
        label: '新功能'
      }
    case 'fix':
      return { 
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', 
        color: 'text-theme-error',
        bgColor: 'theme-error-bg',
        label: '修复'
      }
    case 'improvement':
      return { 
        icon: 'M13 10V3L4 14h7v7l9-11h-7z', 
        color: 'text-theme-warning',
        bgColor: 'theme-warning-bg',
        label: '优化'
      }
    default:
      return { 
        icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', 
        color: 'text-theme-comment',
        bgColor: 'theme-comment-bg',
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
        class="fixed inset-0 bg-hoi4-dark/60 backdrop-blur-md"
        @click="handleClose"
      ></div>
      
      <!-- 面板主体 - Island风格 -->
      <div class="relative w-[min(480px,90vw)] h-full flex flex-col">
        <div class="absolute inset-0 bg-gradient-to-b from-hoi4-gray/95 via-hoi4-gray/90 to-hoi4-dark/95 backdrop-blur-2xl border-l border-hoi4-border/20">
          <!-- 背景装饰 -->
          <div class="absolute inset-0 opacity-5">
            <div class="absolute top-20 right-20 w-32 h-32 bg-hoi4-accent rounded-full filter blur-2xl animate-pulse"></div>
            <div class="absolute bottom-40 left-10 w-24 h-24 bg-hoi4-accent/50 rounded-full filter blur-xl animate-pulse delay-500"></div>
          </div>
        </div>
        
        <div class="relative z-10 h-full flex flex-col">
          <!-- 顶部导航岛 -->
          <header class="p-6 pb-4">
            <div class="island inline-flex items-center justify-between w-full p-4">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-lg bg-hoi4-accent/10 flex items-center justify-center">
                  <svg class="w-5 h-5 text-hoi4-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 class="text-xl font-bold text-theme-fg">
                  更新日志
                </h2>
              </div>
              
              <!-- 操作按钮组 -->
              <div class="flex items-center space-x-2">
                <!-- 全部展开按钮 -->
                <button
                  @click="expandAll"
                  class="btn-icon p-2 rounded-xl bg-hoi4-gray/20 hover:bg-hoi4-accent/10 border border-hoi4-border/10 hover:border-hoi4-accent/30 transition-all duration-300 group"
                  title="全部展开"
                >
                  <svg class="w-4 h-4 text-theme-comment group-hover:text-theme-fg transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                
                <!-- 全部折叠按钮 -->
                <button
                  @click="collapseAll"
                  class="btn-icon p-2 rounded-xl bg-hoi4-gray/20 hover:bg-hoi4-accent/10 border border-hoi4-border/10 hover:border-hoi4-accent/30 transition-all duration-300 group"
                  title="全部折叠"
                >
                  <svg class="w-4 h-4 text-theme-comment group-hover:text-theme-fg transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                  </svg>
                </button>
                
                <!-- 关闭按钮 -->
                <button
                  @click="handleClose"
                  class="btn-icon p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 group"
                  title="关闭"
                >
                  <svg class="w-5 h-5 text-red-400 group-hover:text-red-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </header>
          
          <!-- 时间线内容 -->
          <main class="flex-1 px-6 pb-6 overflow-hidden">
            <div class="h-full overflow-y-auto custom-scrollbar pr-2">
              <div class="relative timeline-container">
                <!-- 版本节点列表 -->
                <div class="space-y-4">
                  <div
                    v-for="(log, index) in changelog"
                    :key="log.version"
                    class="relative pl-16 pb-4 last:pb-0 version-entry"
                    :class="{ 'version-entry-current': index === 0 }"
                  >
                    <!-- 时间线连接线 -->
                    <div 
                      v-if="index < changelog.length - 1"
                      class="timeline-connection absolute left-[34px] top-[34px] bottom-0 w-0.5"
                      :class="index === 0 ? 'timeline-connection-current' : 'timeline-connection-normal'"
                    ></div>
                    
                    <!-- 时间线节点 -->
                    <div 
                      class="timeline-node absolute left-7 top-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer"
                      :class="[
                        index === 0 
                          ? 'timeline-node-current' 
                          : isExpanded(log.version) 
                            ? 'timeline-node-active'
                            : 'timeline-node-inactive'
                      ]"
                      @click="toggleVersion(log.version)"
                    >
                      <div 
                        class="w-3 h-3 rounded-full transition-all duration-300"
                        :class="index === 0 || isExpanded(log.version) ? 'bg-theme-fg' : 'bg-theme-border'"
                      ></div>
                    </div>
                    
                    <!-- 版本卡片岛 -->
                    <div 
                      class="version-island cursor-pointer transition-all duration-300"
                      :class="{ 
                        'version-island-current': index === 0,
                        'version-island-expanded': isExpanded(log.version)
                      }"
                      @click="toggleVersion(log.version)"
                    >
                      <!-- 版本头部 -->
                      <div class="version-header">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center space-x-3">
                            <!-- 版本号标签 -->
                            <span 
                              class="version-badge"
                              :class="index === 0 ? 'version-badge-current' : 'version-badge-normal'"
                            >
                              {{ log.version }}
                            </span>
                            
                            <!-- 当前版本标记 -->
                            <span 
                              v-if="index === 0"
                              class="current-badge"
                            >
                              <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full theme-success opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 theme-success"></span>
                              </span>
                              当前版本
                            </span>
                          </div>
                          
                          <!-- 展开/折叠图标 -->
                          <svg 
                            class="w-5 h-5 text-theme-comment transition-all duration-300"
                            :class="{ 'rotate-180 text-theme-accent': isExpanded(log.version) }"
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      
                      <!-- 版本描述 -->
                      <div 
                        v-if="log.description"
                        class="version-description"
                      >
                        {{ log.description }}
                      </div>
                      
                      <!-- 变更内容 -->
                      <Transition name="version-expand">
                        <div v-if="isExpanded(log.version)" class="version-changes">
                          <div class="space-y-2">
                            <div
                              v-for="(change, cIndex) in log.changes"
                              :key="cIndex"
                              class="change-item"
                            >
                              <div class="flex items-start space-x-3">
                                <!-- 变更类型图标 -->
                                <div 
                                  class="change-icon"
                                  :class="getChangeTypeInfo(change.type).bgColor"
                                >
                                  <svg 
                                    class="w-3.5 h-3.5"
                                    :class="getChangeTypeInfo(change.type).color"
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getChangeTypeInfo(change.type).icon" />
                                  </svg>
                                </div>
                                
                                <!-- 变更内容 -->
                                <span class="change-text">{{ change.content }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Transition>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
          
          <!-- 底部说明岛 -->
          <footer class="p-6 pt-2">
            <div class="island p-4">
              <div class="flex items-center justify-center space-x-6 text-xs">
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 rounded-full theme-success shadow-sm"></div>
                  <span class="text-theme-comment">新功能</span>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 rounded-full theme-error shadow-sm"></div>
                  <span class="text-theme-comment">修复</span>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 rounded-full theme-warning shadow-sm"></div>
                  <span class="text-theme-comment">优化</span>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 rounded-full theme-comment shadow-sm"></div>
                  <span class="text-theme-comment">其他</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 侧边滑入动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* 版本展开/折叠动画 */
.version-expand-enter-active,
.version-expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.version-expand-enter-from,
.version-expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.version-expand-enter-to,
.version-expand-leave-from {
  opacity: 1;
  max-height: 1000px;
  transform: translateY(0);
}

/* 按钮图标样式 */
.btn-icon {
  position: relative;
  overflow: hidden;
}

.btn-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 255, 255, 0.1), 
    transparent);
  transition: left 0.5s ease;
}

.btn-icon:hover::before {
  left: 100%;
}

/* 时间线容器 */
.timeline-container {
  position: relative;
}

/* 版本条目样式 */
.version-entry {
  animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  animation-fill-mode: both;
}

.version-entry:nth-child(1) { animation-delay: 0.1s; }
.version-entry:nth-child(2) { animation-delay: 0.2s; }
.version-entry:nth-child(3) { animation-delay: 0.3s; }
.version-entry:nth-child(4) { animation-delay: 0.4s; }
.version-entry:nth-child(5) { animation-delay: 0.5s; }

/* 时间线连接线 */
.timeline-connection {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--theme-accent-glow) 20%,
    var(--theme-accent-glow) 80%,
    transparent 100%
  );
}

.timeline-connection-current {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--theme-accent) 20%,
    var(--theme-accent) 80%,
    transparent 100%
  );
  box-shadow: 0 0 10px var(--theme-accent-glow);
}

.timeline-connection-normal {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--theme-border) 20%,
    var(--theme-border) 80%,
    transparent 100%
  );
}

/* 时间线节点 */
.timeline-node {
  border: 2px solid;
  z-index: 20;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.timeline-node-current {
  background: var(--theme-accent);
  border-color: var(--theme-accent);
  box-shadow: 
    0 0 20px var(--theme-accent-glow),
    0 0 40px var(--theme-accent-glow),
    inset 0 1px 0 var(--theme-fg-glass);
  animation: pulse-node 2s ease-in-out infinite;
}

.timeline-node-active {
  background: var(--theme-accent-bg);
  border-color: var(--theme-accent);
  box-shadow: 
    0 0 10px var(--theme-accent-glow),
    inset 0 1px 0 var(--theme-fg-glass);
}

.timeline-node-inactive {
  background: var(--theme-bg-secondary);
  border-color: var(--theme-border);
}

.timeline-node:hover {
  transform: scale(1.15);
  box-shadow: 
    0 0 20px var(--theme-accent-glow),
    inset 0 1px 0 var(--theme-fg-glass);
}

/* 版本卡片岛 */
.version-island {
  padding: 1rem;
  background: var(--theme-island-bg);
  border: 1px solid var(--theme-border);
  border-radius: 0.75rem;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 
    var(--theme-island-shadow),
    var(--theme-island-border),
    inset 0 1px 0 var(--theme-fg-glass);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.version-island-current {
  background: var(--theme-accent-island-bg);
  border-color: var(--theme-accent);
  box-shadow: 
    var(--theme-accent-shadow),
    0 0 0 1px var(--theme-accent),
    inset 0 1px 0 var(--theme-fg-glass);
}

.version-island-expanded {
  transform: translateX(4px);
  border-color: var(--theme-accent);
}

.version-island:hover {
  transform: translateY(-2px);
  box-shadow: 
    var(--theme-island-hover-shadow),
    0 0 0 1px var(--theme-accent),
    inset 0 1px 0 var(--theme-fg-glass);
}

.version-island-current:hover {
  box-shadow: 
    var(--theme-accent-hover-shadow),
    0 0 0 1px var(--theme-accent),
    inset 0 1px 0 var(--theme-fg-glass);
}

/* 版本头部 */
.version-header {
  padding: 0.5rem 0;
}

/* 版本号标签 */
.version-badge {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

.version-badge-current {
  background: var(--theme-accent);
  color: var(--theme-bg);
  box-shadow: 0 2px 8px var(--theme-accent-glow);
}

.version-badge-normal {
  background: var(--theme-bg-secondary);
  color: var(--theme-fg);
  border: 1px solid var(--theme-border);
}

/* 当前版本标记 */
.current-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: var(--theme-success-bg);
  color: var(--theme-success);
  font-size: 0.7rem;
  font-weight: 500;
  border-radius: 0.375rem;
  border: 1px solid var(--theme-success);
}

/* 版本描述 */
.version-description {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--theme-bg-secondary);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--theme-comment);
  line-height: 1.5;
}

/* 变更内容区域 */
.version-changes {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--theme-border);
}

/* 变更条目 */
.change-item {
  padding: 0.75rem;
  background: var(--theme-bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.change-item:hover {
  background: var(--theme-bg-hover);
  border-color: var(--theme-border);
  transform: translateX(2px);
}

/* 变更类型图标 */
.change-icon {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.125rem;
}

/* 变更文本 */
.change-text {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--theme-fg);
}

/* 主题相关的类 */
.theme-success {
  background-color: var(--theme-success);
}

.theme-success-bg {
  background-color: var(--theme-success);
  opacity: 0.2;
}

.theme-error {
  background-color: var(--theme-error);
}

.theme-error-bg {
  background-color: var(--theme-error);
  opacity: 0.2;
}

.theme-warning {
  background-color: var(--theme-warning);
}

.theme-warning-bg {
  background-color: var(--theme-warning);
  opacity: 0.2;
}

.theme-comment {
  background-color: var(--theme-comment);
}

.theme-comment-bg {
  background-color: var(--theme-comment);
  opacity: 0.2;
}

/* 动画关键帧 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse-node {
  0%, 100% {
    box-shadow: 
      0 0 20px var(--theme-accent-glow),
      0 0 40px var(--theme-accent-glow),
      inset 0 1px 0 var(--theme-fg-glass);
  }
  50% {
    box-shadow: 
      0 0 30px var(--theme-accent),
      0 0 60px var(--theme-accent-glow),
      inset 0 1px 0 var(--theme-fg-glass);
  }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .version-island {
    padding: 0.75rem;
  }
  
  .version-badge {
    padding: 0.2rem 0.5rem;
    font-size: 0.7rem;
  }
  
  .current-badge {
    padding: 0.2rem 0.5rem;
    font-size: 0.65rem;
  }
}
</style>
