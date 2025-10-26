<script setup lang="ts">
import FileTreeNode from '../FileTreeNode.vue'
import type { FileNode } from '../../composables/useFileManager'

defineProps<{
  gameDirectory: string
  gameFileTree: FileNode[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  toggleFolder: [node: FileNode]
  openFile: [node: FileNode]
}>()
</script>

<template>
  <div class="h-full flex flex-col">
    <div v-if="!gameDirectory" class="text-hoi4-text-dim text-sm p-2">
      未设置游戏目录，请前往设置页面配置
    </div>
    <div v-else-if="isLoading" class="text-hoi4-text-dim text-sm p-2">
      加载游戏目录中...
    </div>
    <div v-else-if="gameFileTree.length === 0" class="text-hoi4-text-dim text-sm p-2">
      游戏目录为空
    </div>
    <template v-else>
      <!-- 游戏目录树 -->
      <div class="flex-1 overflow-y-auto p-2">
        <div class="text-hoi4-text text-xs mb-2 font-semibold px-1">
          游戏目录: {{ gameDirectory }}
        </div>
        <FileTreeNode
          v-for="node in gameFileTree"
          :key="node.path"
          :node="node"
          :level="0"
          @toggle="emit('toggleFolder', $event)"
          @open-file="emit('openFile', $event)"
        />
      </div>
    </template>
  </div>
</template>
