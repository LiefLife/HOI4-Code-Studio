<script setup lang="ts">

defineProps<{
  projectInfo: any
}>()

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
        
        <!-- 其他字段 -->
        <div v-for="(value, key) in projectInfo" :key="String(key)">
          <template v-if="!['name', 'version', 'created_at', 'replace_path'].includes(String(key))">
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
