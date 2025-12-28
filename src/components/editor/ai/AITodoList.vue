<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTodo, type TodoItem } from '../../../composables/useTodo'

const { todos, addTodo, removeTodo, updateTodoStatus } = useTodo()

const completedCount = computed(() => todos.value.filter(t => t.status === 'completed').length)

const newTodoContent = ref('')
const isAdding = ref(false)

function handleAdd() {
  if (!newTodoContent.value.trim()) return
  addTodo({
    content: newTodoContent.value.trim(),
    status: 'pending',
    priority: 'medium'
  })
  newTodoContent.value = ''
  isAdding.value = false
}

function getPriorityClass(priority: TodoItem['priority']) {
  switch (priority) {
    case 'high': return 'text-red-400 bg-red-400/10'
    case 'medium': return 'text-orange-400 bg-orange-400/10'
    case 'low': return 'text-blue-400 bg-blue-400/10'
    default: return 'text-gray-400 bg-gray-400/10'
  }
}

function cycleStatus(todo: TodoItem) {
  const nextStatus: Record<TodoItem['status'], TodoItem['status']> = {
    'pending': 'in_progress',
    'in_progress': 'completed',
    'completed': 'pending'
  }
  updateTodoStatus(todo.id, nextStatus[todo.status])
}
</script>

<template>
  <div class="flex flex-col gap-1.5 p-1.5 bg-hoi4-bg-secondary/40 rounded-xl border border-hoi4-border/30 shadow-sm transition-all duration-300">
    <div class="flex items-center justify-between px-1.5">
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] font-bold text-hoi4-text-dim uppercase tracking-widest">任务计划</span>
        <div v-if="todos.length > 0" class="flex items-center gap-1">
          <span class="w-1 h-1 rounded-full bg-hoi4-accent/60"></span>
          <span class="text-[9px] font-medium text-hoi4-accent/80">{{ completedCount }}/{{ todos.length }}</span>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button 
          @click="isAdding = !isAdding"
          class="p-1 rounded-md hover:bg-white/5 transition-colors text-hoi4-text-dim hover:text-hoi4-text"
          title="添加任务"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Todo 列表 -->
    <div v-if="todos.length > 0" class="flex flex-col gap-1 max-h-[120px] overflow-y-auto custom-scrollbar px-0.5">
      <div 
        v-for="todo in todos" 
        :key="todo.id"
        class="group flex items-start gap-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/5"
      >
        <button 
          @click="cycleStatus(todo)"
          class="mt-0.5 transition-colors"
          :class="todo.status === 'completed' ? 'text-emerald-400' : 'text-hoi4-text-dim hover:text-hoi4-text'"
        >
          <svg v-if="todo.status === 'completed'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M22 4L12 14.01l-3-3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="todo.status === 'in_progress'" class="w-4 h-4 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke-linecap="round"/>
          </svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        </button>

        <div class="flex-1 min-w-0">
          <div 
            class="text-sm transition-all"
            :class="todo.status === 'completed' ? 'text-hoi4-text-dim line-through' : 'text-hoi4-text'"
          >
            {{ todo.content }}
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span 
              class="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
              :class="getPriorityClass(todo.priority)"
            >
              {{ todo.priority }}
            </span>
          </div>
        </div>

        <button 
          @click="removeTodo(todo.id)"
          class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-all"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div v-else-if="!isAdding" class="py-4 text-center">
      <p class="text-xs text-hoi4-text-dim italic">暂无计划任务</p>
    </div>

    <!-- 添加表单 -->
    <div v-if="isAdding" class="p-2 bg-white/5 rounded-lg border border-white/10">
      <textarea
        v-model="newTodoContent"
        class="w-full bg-transparent border-none focus:ring-0 text-sm text-hoi4-text placeholder:text-hoi4-text-dim resize-none"
        placeholder="输入任务内容..."
        rows="2"
        @keydown.enter.prevent="handleAdd"
      ></textarea>
      <div class="flex justify-end gap-2 mt-2">
        <button 
          @click="isAdding = false"
          class="px-2 py-1 text-xs text-hoi4-text-dim hover:text-hoi4-text"
        >
          取消
        </button>
        <button 
          @click="handleAdd"
          class="px-2 py-1 text-xs bg-hoi4-accent/80 hover:bg-hoi4-accent text-hoi4-text rounded font-bold"
        >
          添加
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-spin-slow {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
