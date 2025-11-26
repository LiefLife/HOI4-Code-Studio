<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
  expanded?: boolean
}

const props = defineProps<{
  node: FileNode
  level: number
  selectedPath?: string | null
}>()

const emit = defineEmits<{
  toggle: [node: FileNode]
  openFile: [node: FileNode]
  contextmenu: [event: MouseEvent, node: FileNode]
}>()

function handleClick() {
  if (props.node.isDirectory) {
    emit('toggle', props.node)
  } else {
    emit('openFile', props.node)
  }
}

function getFileIcon(node: FileNode): string {
  if (node.isDirectory) {
    return node.expanded ? '📂' : '📁'
  }
  
  const ext = node.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'json': return '📄'
    case 'js': case 'ts': return '📜'
    case 'vue': return '💚'
    case 'css': return '🎨'
    case 'png': case 'jpg': case 'jpeg': return '🖼️'
    case 'txt': case 'md': return '📝'
    case 'mod': return '⚙️'
    default: return '📄'
  }
}
</script>

<template>
  <div>
    <div
      class="flex items-center px-2 py-1 rounded cursor-pointer text-sm file-tree-node transition-colors"
      :class="[selectedPath === node.path ? 'bg-hoi4-selected text-white' : 'hover:bg-hoi4-accent/50']"
      :style="{ paddingLeft: (level * 16 + 8) + 'px' }"
      @click="handleClick"
      @contextmenu.stop.prevent="(e) => emit('contextmenu', e, props.node)"
    >
      <span class="mr-2">{{ getFileIcon(node) }}</span>
      <span class="text-hoi4-text truncate">{{ node.name }}</span>
    </div>
    
    <div v-if="node.isDirectory && node.expanded && node.children">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :level="level + 1"
        :selected-path="selectedPath"
        @toggle="(n) => emit('toggle', n)"
        @open-file="(n) => emit('openFile', n)"
        @contextmenu="(e, n) => emit('contextmenu', e, n)"
      />
    </div>
  </div>
</template>
