<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  menuType: 'file' | 'tree' | 'pane' | 'editor'
  canSplit?: boolean
  currentFilePath?: string
}>()

const emit = defineEmits<{
  action: [actionName: string]
  close: []
}>()

const templateMenuVisible = ref(false)

// 检查当前文件是否在 common/ideas 目录下
const isInCommonIdeas = computed(() => {
  if (!props.currentFilePath) return false
  const normalizedPath = props.currentFilePath.replace(/\\/g, '/')
  return normalizedPath.includes('common/ideas/')
})

// 检查当前文件是否在 history/countries 目录下
const isInHistoryCountries = computed(() => {
  if (!props.currentFilePath) return false
  const normalizedPath = props.currentFilePath.replace(/\\/g, '/')
  return normalizedPath.includes('history/countries/')
})

// 检查当前文件是否在 common/bop 目录下
const isInCommonBop = computed(() => {
  if (!props.currentFilePath) return false
  const normalizedPath = props.currentFilePath.replace(/\\/g, '/')
  return normalizedPath.includes('common/bop/')
})

// 检查是否有任何可用的模板
const hasAnyTemplateAvailable = computed(() => {
  return isInCommonIdeas.value || isInHistoryCountries.value || isInCommonBop.value
})

// 检查二级菜单是否应该显示在左侧
const showSubmenuOnLeft = computed(() => {
  const submenuWidth = 180
  const padding = 20
  return props.x + 200 + submenuWidth > window.innerWidth - padding
})

function handleAction(action: string) {
  emit('action', action)
}

function showTemplateMenu() {
  templateMenuVisible.value = true
}

function hideTemplateMenu() {
  templateMenuVisible.value = false
}
</script>

<template>
  <!-- 文件标签右键菜单 -->
  <div
    v-if="visible && menuType === 'file'"
    class="fixed border rounded-xl shadow-2xl z-50 backdrop-blur-sm"
    :style="{ 
      left: x + 'px', 
      top: y + 'px',
      backgroundColor: 'rgba(10, 10, 10, 0.96)',
      borderColor: 'rgba(58, 58, 58, 0.95)'
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
    class="fixed border rounded-xl shadow-2xl z-50 backdrop-blur-sm"
    :style="{ 
      left: x + 'px', 
      top: y + 'px',
      backgroundColor: 'rgba(10, 10, 10, 0.96)',
      borderColor: 'rgba(58, 58, 58, 0.95)'
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
    <div class="h-px w-full my-1" style="background-color: #2a2a2a;"></div>
    <button
      @click="handleAction('rename')"
      class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item"
      style="color: #e0e0e0;"
    >
      ✏️ 重命名
    </button>
    <button
      @click="handleAction('copyPath')"
      class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item"
      style="color: #e0e0e0;"
    >
      📋 复制路径
    </button>
    <button
      @click="handleAction('showInExplorer')"
      class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item"
      style="color: #e0e0e0;"
    >
      📂 在资源管理器中显示
    </button>
  </div>

  <!-- 编辑器窗格右键菜单 -->
  <div
    v-if="visible && menuType === 'pane'"
    class="fixed border rounded-xl shadow-2xl z-50 backdrop-blur-sm"
    :style="{ 
      left: x + 'px', 
      top: y + 'px',
      backgroundColor: 'rgba(10, 10, 10, 0.96)',
      borderColor: 'rgba(58, 58, 58, 0.95)'
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

  <!-- 编辑器内容右键菜单 -->
  <div
    v-if="visible && menuType === 'editor'"
    class="fixed border rounded-xl shadow-2xl z-50 backdrop-blur-sm"
    :style="{ 
      left: x + 'px', 
      top: y + 'px',
      backgroundColor: 'rgba(10, 10, 10, 0.96)',
      borderColor: 'rgba(58, 58, 58, 0.95)'
    }"
    @click.stop
  >
    <button
      @click="handleAction('copy')"
      class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item"
      style="color: #e0e0e0;"
    >
      📋 复制
    </button>
    <button
      @click="handleAction('cut')"
      class="w-full px-4 py-2 text-left text-sm border-t whitespace-nowrap transition-colors context-menu-item"
      style="color: #e0e0e0; border-color: #2a2a2a;"
    >
      ✂️ 剪切
    </button>
    <button
      @click="handleAction('paste')"
      class="w-full px-4 py-2 text-left text-sm border-t whitespace-nowrap transition-colors context-menu-item"
      style="color: #e0e0e0; border-color: #2a2a2a;"
    >
      📄 粘贴
    </button>
    <div v-if="hasAnyTemplateAvailable" class="h-px w-full my-1" style="background-color: #2a2a2a;"></div>
    <div 
      v-if="hasAnyTemplateAvailable"
      class="relative"
      @mouseenter="showTemplateMenu"
      @mouseleave="hideTemplateMenu"
    >
      <button
        class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item flex items-center justify-between"
        style="color: #e0e0e0;"
      >
        <span>📝 插入模板</span>
        <span>▶</span>
      </button>
      <!-- 二级菜单 -->
      <div
        v-if="templateMenuVisible"
        class="absolute top-0 border rounded-xl shadow-2xl backdrop-blur-sm"
        :class="showSubmenuOnLeft ? 'right-full mr-1' : 'left-full ml-1'"
        :style="{ 
          backgroundColor: 'rgba(10, 10, 10, 0.96)',
          borderColor: 'rgba(58, 58, 58, 0.95)',
          minWidth: '200px'
        }"
      >
        <button
          v-if="isInCommonIdeas"
          @click="handleAction('insertIdeaTemplate')"
          class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item"
          style="color: #e0e0e0;"
        >
          💡 插入Idea模板
        </button>
        <button
          v-if="isInHistoryCountries"
          @click="handleAction('insertTagTemplate')"
          class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item"
          :class="{ 'border-t': isInCommonIdeas }"
          style="color: #e0e0e0; border-color: #2a2a2a;"
        >
          🏷️ 插入Tag初始态定义模板
        </button>
        <button
          v-if="isInCommonBop"
          @click="handleAction('insertBopTemplate')"
          class="w-full px-4 py-2 text-left text-sm whitespace-nowrap transition-colors context-menu-item"
          :class="{ 'border-t': isInCommonIdeas || isInHistoryCountries }"
          style="color: #e0e0e0; border-color: #2a2a2a;"
        >
          ⚖️ 插入权力平衡模板
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.context-menu-item {
  background-color: transparent;
}

.context-menu-item:hover {
  background-color: #333333;
}
</style>
