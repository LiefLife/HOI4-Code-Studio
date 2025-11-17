<script setup lang="ts">
import { ref } from 'vue'
import type { Dependency } from '../../types/dependency'
import { openFileDialog } from '../../api/tauri'

defineProps<{
  visible: boolean
  dependencies: Dependency[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  close: []
  add: [path: string]
  remove: [id: string]
  toggle: [id: string]
}>()

const addingPath = ref('')
const isSelecting = ref(false)

// 选择依赖项路径
async function selectPath() {
  isSelecting.value = true
  try {
    const result = await openFileDialog('directory')
    if (result.success && result.path) {
      addingPath.value = result.path
    }
  } finally {
    isSelecting.value = false
  }
}

// 添加依赖项
function handleAdd() {
  if (addingPath.value.trim()) {
    emit('add', addingPath.value.trim())
    addingPath.value = ''
  }
}

// 删除依赖项
function handleRemove(id: string) {
  if (confirm('确定要删除此依赖项吗？')) {
    emit('remove', id)
  }
}

// 格式化时间
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div class="card max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
      <!-- 标题栏 -->
      <div class="flex items-center justify-between mb-4 pb-4 border-b border-hoi4-border">
        <h2 class="text-2xl font-bold text-hoi4-text">依赖项管理</h2>
        <button
          @click="emit('close')"
          class="p-2 hover:bg-hoi4-border/40 rounded-lg transition-colors"
        >
          <svg class="w-6 h-6 text-hoi4-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- 添加依赖项区域 -->
      <div class="mb-6">
        <label class="block text-hoi4-text mb-2 text-sm font-semibold">
          添加新依赖项
        </label>
        <div class="flex gap-2">
          <input
            v-model="addingPath"
            type="text"
            placeholder="选择 HOICS 项目或 HOI4 Mod 目录"
            class="input-field flex-1"
            :disabled="isLoading"
            @keyup.enter="handleAdd"
          />
          <button
            type="button"
            @click="selectPath"
            class="btn-secondary px-4"
            :disabled="isLoading || isSelecting"
          >
            {{ isSelecting ? '选择中...' : '浏览' }}
          </button>
          <button
            type="button"
            @click="handleAdd"
            class="btn-primary px-6"
            :disabled="isLoading || !addingPath.trim()"
          >
            添加
          </button>
        </div>
        <p class="text-hoi4-comment text-xs mt-1">
          支持 HOICS 项目（包含 project.json）和普通 HOI4 Mod（包含 descriptor.mod）
        </p>
      </div>

      <!-- 依赖项列表 -->
      <div class="flex-1 overflow-y-auto">
        <div class="space-y-2">
          <div v-if="dependencies.length === 0" class="text-center py-12 text-hoi4-text-dim">
            <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
            <p>暂无依赖项</p>
            <p class="text-xs mt-2">点击上方"添加"按钮添加依赖项</p>
          </div>

          <div
            v-for="dep in dependencies"
            :key="dep.id"
            class="bg-hoi4-border/20 rounded-lg p-4 border border-hoi4-border/40 hover:border-hoi4-accent/40 transition-colors"
          >
            <div class="flex items-start gap-3">
              <!-- 启用/禁用开关 -->
              <div class="flex-shrink-0 pt-1">
                <button
                  @click="emit('toggle', dep.id)"
                  class="w-12 h-6 rounded-full transition-colors relative"
                  :class="dep.enabled ? 'bg-hoi4-accent' : 'bg-hoi4-border'"
                  :title="dep.enabled ? '点击禁用' : '点击启用'"
                >
                  <span
                    class="block w-4 h-4 rounded-full bg-hoi4-text absolute top-1 transition-transform"
                    :class="dep.enabled ? 'translate-x-7' : 'translate-x-1'"
                  ></span>
                </button>
              </div>

              <!-- 依赖项信息 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="text-hoi4-text font-semibold truncate">{{ dep.name }}</h3>
                  <span
                    class="text-xs px-2 py-0.5 rounded"
                    :class="dep.type === 'hoics' ? 'bg-hoi4-accent/30 text-hoi4-accent' : 'bg-hoi4-border/50 text-hoi4-text-dim'"
                  >
                    {{ dep.type === 'hoics' ? 'HOICS' : 'HOI4 Mod' }}
                  </span>
                  <span
                    v-if="!dep.enabled"
                    class="text-xs px-2 py-0.5 rounded bg-hoi4-border/50 text-hoi4-text-dim"
                  >
                    已禁用
                  </span>
                </div>
                <p class="text-hoi4-comment text-sm truncate mb-1" :title="dep.path">{{ dep.path }}</p>
                <p class="text-hoi4-text-dim text-xs">
                  添加时间: {{ formatDate(dep.addedAt) }}
                </p>
              </div>

              <!-- 删除按钮 -->
              <button
                @click="handleRemove(dep.id)"
                class="flex-shrink-0 p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
                title="删除依赖项"
              >
                <svg class="w-5 h-5 text-hoi4-text-dim group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部提示 -->
      <div class="mt-4 pt-4 border-t border-hoi4-border">
        <div class="flex items-start gap-2 text-hoi4-comment text-sm">
          <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <p class="mb-1">• 禁用的依赖项不会被索引，也不会出现在补全提示中</p>
            <p>• 依赖项的 Idea 和 Tag 数据将在项目加载时自动索引</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
