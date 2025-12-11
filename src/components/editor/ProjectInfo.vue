<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  projectInfo: any
}>()

// 格式化依赖项显示
const formattedDependencies = computed(() => {
  if (!props.projectInfo?.dependencies || !Array.isArray(props.projectInfo.dependencies)) {
    return []
  }
  return props.projectInfo.dependencies
})

// 获取依赖项类型标签
function getDependencyTypeLabel(type: string): { text: string; color: string } {
  switch (type) {
    case 'hoics':
      return { text: 'HOICS 项目', color: 'bg-hoi4-accent/30 text-hoi4-accent' }
    case 'hoi4mod':
      return { text: 'HOI4 Mod', color: 'bg-blue-500/30 text-blue-400' }
    default:
      return { text: type, color: 'bg-hoi4-border/50 text-hoi4-text-dim' }
  }
}

// 格式化路径显示（只显示文件名或最后几级目录）
function formatPath(path: string): string {
  if (!path) return ''
  const parts = path.split(/[/\\]/)
  // 返回最后3级路径
  return parts.length > 3 ? '...' + parts.slice(-3).join('/') : path
}

// 复制文本到剪贴板
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch (error) {
    console.error('复制失败:', error)
  }
}

</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 项目信息 -->
    <div class="flex-1 overflow-y-auto p-3">
      <div v-if="!projectInfo" class="text-hoi4-text-dim text-sm">加载项目信息...</div>
      <div v-else class="space-y-4">
        <!-- 项目名称 -->
        <div class="relative overflow-hidden bg-gradient-to-r from-hoi4-accent/20 to-hoi4-accent/5 p-4 rounded-xl border border-hoi4-accent/30">
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-hoi4-accent/10 to-transparent animate-pulse"></div>
          <div class="flex items-center gap-3 relative z-10">
            <div class="w-10 h-10 bg-hoi4-accent/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-hoi4-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-hoi4-text-dim text-xs mb-1 font-medium tracking-wide">项目名称</div>
              <div class="text-hoi4-text font-bold text-xl truncate" :title="projectInfo.name">{{ projectInfo.name }}</div>
            </div>
          </div>
        </div>
        
        <!-- 版本 -->
        <div class="bg-hoi4-gray/50 p-3 rounded-lg border border-hoi4-border/40 hover:border-hoi4-accent/30 transition-colors">
          <div class="flex items-center gap-2 mb-2">
            <svg class="w-4 h-4 text-hoi4-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
            </svg>
            <div class="text-hoi4-text-dim text-xs font-medium tracking-wide">当前版本</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center px-2 py-1 rounded-md bg-hoi4-accent/20 text-hoi4-accent text-sm font-semibold">
              v{{ projectInfo.version }}
            </span>
          </div>
        </div>
        
        <!-- 创建时间 -->
        <div class="bg-hoi4-gray/50 p-3 rounded-lg border border-hoi4-border/40 hover:border-hoi4-accent/30 transition-colors">
          <div class="flex items-center gap-2 mb-2">
            <svg class="w-4 h-4 text-hoi4-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <div class="text-hoi4-text-dim text-xs font-medium tracking-wide">创建时间</div>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-hoi4-text text-sm font-medium">
              {{ new Date(projectInfo.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) }}
            </span>
            <span class="text-hoi4-text-dim text-xs">
              {{ new Date(projectInfo.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
            </span>
            <span class="text-xs px-2 py-1 rounded-full bg-hoi4-comment/20 text-hoi4-comment">
              {{ Math.floor((Date.now() - new Date(projectInfo.created_at).getTime()) / (1000 * 60 * 60 * 24)) }} 天前
            </span>
          </div>
        </div>
        
        <!-- Replace Path -->
        <div v-if="projectInfo.replace_path && projectInfo.replace_path.length > 0">
          <div class="text-hoi4-text-dim text-xs mb-2">Replace Path</div>
          <div class="space-y-1">
            <div
              v-for="(path, index) in projectInfo.replace_path"
              :key="index"
              class="bg-hoi4-accent px-2 py-1 rounded text-hoi4-text text-xs"
            >
              {{ path }}
            </div>
          </div>
        </div>
        
        <!-- 依赖项 -->
        <div v-if="formattedDependencies.length > 0" class="space-y-3">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-hoi4-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
            </svg>
            <div class="text-hoi4-text-dim text-xs font-medium tracking-wide">项目依赖</div>
            <span class="ml-auto text-xs px-2 py-1 rounded-full bg-hoi4-accent/20 text-hoi4-accent font-semibold">
              {{ formattedDependencies.length }} 个
            </span>
          </div>
          
          <div class="space-y-3">
            <div
              v-for="(dep, index) in formattedDependencies"
              :key="dep.id || index"
              class="relative group bg-hoi4-gray/50 rounded-xl border border-hoi4-border/40 hover:border-hoi4-accent/40 transition-all duration-200 hover:shadow-lg hover:shadow-hoi4-accent/10 overflow-hidden"
            >
              <!-- 左侧状态指示条 -->
              <div 
                class="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
                :class="dep.enabled ? 'bg-green-400' : 'bg-hoi4-border'"
              ></div>
              
              <!-- 悬停时的发光效果 -->
              <div class="absolute inset-0 bg-gradient-to-r from-hoi4-accent/0 via-hoi4-accent/5 to-hoi4-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div class="p-4 pl-5">
                <!-- 头部信息 -->
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-2 flex-wrap">
                      <span class="text-hoi4-text font-bold text-base truncate" :title="dep.name || '未命名'">
                        {{ dep.name || '未命名' }}
                      </span>
                      <span
                        v-if="dep.type"
                        class="text-xs px-2 py-1 rounded-lg font-semibold"
                        :class="getDependencyTypeLabel(dep.type).color"
                      >
                        {{ getDependencyTypeLabel(dep.type).text }}
                      </span>
                      <span 
                        class="text-xs px-2 py-1 rounded-full font-medium"
                        :class="dep.enabled ? 'bg-green-400/20 text-green-400' : 'bg-hoi4-comment/20 text-hoi4-comment'"
                      >
                        {{ dep.enabled ? '✓ 已启用' : '○ 已禁用' }}
                      </span>
                    </div>
                    
                    <!-- 元信息 -->
                    <div class="flex items-center gap-4 text-xs text-hoi4-comment flex-wrap">
                      <span v-if="dep.addedAt" class="flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        添加于 {{ new Date(dep.addedAt).toLocaleDateString('zh-CN') }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <!-- 路径信息 -->
                <div v-if="dep.path" class="bg-hoi4-border/20 p-3 rounded-lg border border-hoi4-border/30 group-hover:border-hoi4-accent/20 transition-colors">
                  <div class="flex items-center gap-2 mb-2">
                    <svg class="w-3 h-3 text-hoi4-comment" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path>
                    </svg>
                    <div class="text-hoi4-comment text-xs font-medium">存储路径</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="text-hoi4-text text-xs font-mono truncate" :title="dep.path">
                        {{ formatPath(dep.path) }}
                      </div>
                    </div>
                    <button 
                      @click="copyToClipboard(dep.path)"
                      class="flex-shrink-0 p-1.5 rounded-md bg-hoi4-border/30 hover:bg-hoi4-accent/30 transition-colors group"
                      title="复制路径"
                    >
                      <svg class="w-3.5 h-3.5 text-hoi4-comment group-hover:text-hoi4-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 无依赖项时的提示 -->
        <div v-else class="bg-hoi4-gray/30 rounded-lg border border-dashed border-hoi4-border/40 p-6 text-center">
          <svg class="w-8 h-8 text-hoi4-comment mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
          </svg>
          <div class="text-hoi4-comment text-sm mb-1">暂无依赖项</div>
          <div class="text-hoi4-text-dim text-xs">点击左侧"管理依赖项"添加项目依赖</div>
        </div>

        <!-- 项目路径 -->
        <div v-if="projectInfo.path" class="bg-hoi4-gray/50 rounded-xl border border-hoi4-border/40 hover:border-hoi4-accent/30 transition-colors overflow-hidden">
          <div class="flex items-center gap-3 p-4 bg-hoi4-accent/10 border-b border-hoi4-accent/20">
            <svg class="w-5 h-5 text-hoi4-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
            </svg>
            <div class="text-hoi4-text-dim text-xs font-medium tracking-wide">项目路径</div>
            <button 
              @click="copyToClipboard(projectInfo.path)"
              class="ml-auto p-2 rounded-lg bg-hoi4-border/30 hover:bg-hoi4-accent/30 transition-colors group"
              title="复制路径"
            >
              <svg class="w-4 h-4 text-hoi4-comment group-hover:text-hoi4-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
          </div>
          <div class="p-4">
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <div class="text-hoi4-text text-sm font-mono break-all leading-relaxed" :title="projectInfo.path">
                  {{ projectInfo.path }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 其他字段 (排除已处理的字段) -->
        <div v-for="(value, key) in projectInfo" :key="String(key)">
          <template v-if="!['name', 'version', 'created_at', 'replace_path', 'dependencies', 'path'].includes(String(key))">
            <div class="text-hoi4-text-dim text-xs mb-1">{{ key }}</div>
            <div class="text-hoi4-text text-sm break-words">
              {{ typeof value === 'object' ? JSON.stringify(value, null, 2) : value }}
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
