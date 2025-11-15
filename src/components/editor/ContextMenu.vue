<script setup lang="ts">
defineProps<{
  visible: boolean
  x: number
  y: number
  menuType: 'file' | 'tree' | 'pane'
  canSplit?: boolean
}>()

const emit = defineEmits<{
  action: [actionName: string]
  close: []
}>()

function handleAction(action: string) {
  emit('action', action)
}
</script>

<template>
  <!-- 文件标签右键菜单 -->
  <div
    v-if="visible && menuType === 'file'"
    class="fixed border-2 rounded shadow-lg z-50"
    :style="{ 
      left: x + 'px', 
      top: y + 'px',
      backgroundColor: '#1a1a1a',
      borderColor: '#2a2a2a'
    }"
    @click.stop
  >
    <button
      @click="handleAction('closeAll')"
      class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item"
      style="color: #e0e0e0;"
    >
      关闭全部
    </button>
    <button
      @click="handleAction('closeOthers')"
      class="w-full px-4 py-2 text-left text-sm border-t whitespace-nowrap transition-colors context-menu-item"
      style="color: #e0e0e0; border-color: #2a2a2a;"
    >
      关闭其他
    </button>
  </div>

  <!-- 文件树右键菜单 -->
  <div
    v-if="visible && menuType === 'tree'"
    class="fixed border-2 rounded shadow-lg z-50"
    :style="{ 
      left: x + 'px', 
      top: y + 'px',
      backgroundColor: '#1a1a1a',
      borderColor: '#2a2a2a'
    }"
    @click.stop
  >
    <button
      @click="handleAction('createFile')"
      class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item"
      style="color: #e0e0e0;"
    >
      📄 新建文件
    </button>
    <button
      @click="handleAction('createFolder')"
      class="w-full px-4 py-2 text-left text-sm border-t whitespace-nowrap transition-colors context-menu-item"
      style="color: #e0e0e0; border-color: #2a2a2a;"
    >
      📁 新建文件夹
    </button>
  </div>

  <!-- 编辑器窗格右键菜单 -->
  <div
    v-if="visible && menuType === 'pane'"
    class="fixed border-2 rounded shadow-lg z-50"
    :style="{ 
      left: x + 'px', 
      top: y + 'px',
      backgroundColor: '#1a1a1a',
      borderColor: '#2a2a2a'
    }"
    @click.stop
  >
    <button
      v-if="canSplit"
      @click="handleAction('splitRight')"
      class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item"
      style="color: #e0e0e0;"
    >
      ➡️ 向右分割
    </button>
    <button
      @click="handleAction('closeAll')"
      class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item"
      :class="{ 'border-t': canSplit }"
      style="color: #e0e0e0; border-color: #2a2a2a;"
    >
      关闭全部
    </button>
    <button
      @click="handleAction('closeOthers')"
      class="w-full px-4 py-2 text-left text-sm border-t whitespace-nowrap transition-colors context-menu-item"
      style="color: #e0e0e0; border-color: #2a2a2a;"
    >
      关闭其他
    </button>
  </div>
</template>

<style scoped>
.context-menu-item {
  background-color: transparent;
}

.context-menu-item:hover {
  background-color: #3a3a3a;
}
</style>
