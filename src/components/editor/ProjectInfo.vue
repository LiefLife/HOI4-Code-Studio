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

</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 项目信息 -->
    <div class="flex-1 overflow-y-auto p-3">
      <div v-if="!projectInfo" class="text-hoi4-text-dim text-sm">加载项目信息...</div>
      <div v-else class="space-y-4">
        <!-- 项目名称 -->
        <div class="bg-hoi4-accent p-3 rounded">
          <div class="text-hoi4-text-dim text-xs mb-1">项目名称</div>
          <div class="text-hoi4-text font-bold text-lg">{{ projectInfo.name }}</div>
        </div>
        
        <!-- 版本 -->
        <div>
          <div class="text-hoi4-text-dim text-xs mb-1">版本</div>
          <div class="text-hoi4-text text-sm">{{ projectInfo.version }}</div>
        </div>
        
        <!-- 创建时间 -->
        <div>
          <div class="text-hoi4-text-dim text-xs mb-1">创建时间</div>
          <div class="text-hoi4-text text-sm">{{ new Date(projectInfo.created_at).toLocaleString('zh-CN') }}</div>
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
        <div v-if="formattedDependencies.length > 0">
          <div class="text-hoi4-text-dim text-xs mb-2">依赖项 ({{ formattedDependencies.length }})</div>
          <div class="space-y-2">
            <div
              v-for="(dep, index) in formattedDependencies"
              :key="dep.id || index"
              class="bg-hoi4-border/20 p-3 rounded-lg border border-hoi4-border/40 hover:border-hoi4-accent/40 transition-colors"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-hoi4-text font-semibold">{{ dep.name || '未命名' }}</span>
                    <span
                      v-if="dep.type"
                      class="text-xs px-2 py-0.5 rounded"
                      :class="getDependencyTypeLabel(dep.type).color"
                    >
                      {{ getDependencyTypeLabel(dep.type).text }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-hoi4-comment">
                    <span :class="dep.enabled ? 'text-green-400' : 'text-hoi4-text-dim'">
                      {{ dep.enabled ? '● 已启用' : '○ 已禁用' }}
                    </span>
                    <span v-if="dep.addedAt" class="text-hoi4-comment">
                      添加于 {{ new Date(dep.addedAt).toLocaleDateString('zh-CN') }}
                    </span>
                  </div>
                </div>
              </div>
              <div v-if="dep.path" class="bg-hoi4-border/20 p-2 rounded text-xs">
                <div class="text-hoi4-comment mb-1">路径：</div>
                <div class="text-hoi4-text font-mono truncate" :title="dep.path">
                  {{ formatPath(dep.path) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 项目路径 -->
        <div v-if="projectInfo.path">
          <div class="text-hoi4-text-dim text-xs mb-2">项目路径</div>
          <div class="bg-hoi4-border/20 p-3 rounded-lg border border-hoi4-border/40">
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-hoi4-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
              <div class="flex-1 min-w-0">
                <div class="text-hoi4-text text-sm font-mono break-all">{{ projectInfo.path }}</div>
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
