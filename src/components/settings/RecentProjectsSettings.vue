<template>
  <div class="settings-form-group">
    <label class="settings-form-label">最近项目显示方式</label>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      <label 
        class="relative cursor-pointer"
        :class="{ 'ring-2 ring-hoi4-accent': recentProjectsLayout === 'four-columns' }"
      >
        <input
          type="radio"
          :checked="recentProjectsLayout === 'four-columns'"
          value="four-columns"
          @change="handleLayoutChange('four-columns')"
          class="sr-only"
        />
        <div class="card p-3 text-center hover:border-hoi4-accent transition-colors">
          <svg class="w-8 h-8 mx-auto mb-2 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
          </svg>
          <span class="text-hoi4-text text-sm">四列</span>
          <span v-if="recentProjectsLayout === 'four-columns'" class="block text-hoi4-accent text-xs mt-1">默认</span>
        </div>
      </label>

      <label 
        class="relative cursor-pointer"
        :class="{ 'ring-2 ring-hoi4-accent': recentProjectsLayout === 'three-columns' }"
      >
        <input
          type="radio"
          :checked="recentProjectsLayout === 'three-columns'"
          value="three-columns"
          @change="handleLayoutChange('three-columns')"
          class="sr-only"
        />
        <div class="card p-3 text-center hover:border-hoi4-accent transition-colors">
          <svg class="w-8 h-8 mx-auto mb-2 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z"></path>
          </svg>
          <span class="text-hoi4-text text-sm">三列</span>
        </div>
      </label>

      <label 
        class="relative cursor-pointer"
        :class="{ 'ring-2 ring-hoi4-accent': recentProjectsLayout === 'two-columns' }"
      >
        <input
          type="radio"
          :checked="recentProjectsLayout === 'two-columns'"
          value="two-columns"
          @change="handleLayoutChange('two-columns')"
          class="sr-only"
        />
        <div class="card p-3 text-center hover:border-hoi4-accent transition-colors">
          <svg class="w-8 h-8 mx-auto mb-2 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z"></path>
          </svg>
          <span class="text-hoi4-text text-sm">二列</span>
        </div>
      </label>

      <label 
        class="relative cursor-pointer"
        :class="{ 'ring-2 ring-hoi4-accent': recentProjectsLayout === 'one-column' }"
      >
        <input
          type="radio"
          :checked="recentProjectsLayout === 'one-column'"
          value="one-column"
          @change="handleLayoutChange('one-column')"
          class="sr-only"
        />
        <div class="card p-3 text-center hover:border-hoi4-accent transition-colors">
          <svg class="w-8 h-8 mx-auto mb-2 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
          <span class="text-hoi4-text text-sm">一列</span>
        </div>
      </label>

      <label 
        class="relative cursor-pointer"
        :class="{ 'ring-2 ring-hoi4-accent': recentProjectsLayout === 'masonry' }"
      >
        <input
          type="radio"
          :checked="recentProjectsLayout === 'masonry'"
          value="masonry"
          @change="handleLayoutChange('masonry')"
          class="sr-only"
        />
        <div class="card p-3 text-center hover:border-hoi4-accent transition-colors">
          <svg class="w-8 h-8 mx-auto mb-2 text-hoi4-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"></path>
          </svg>
          <span class="text-hoi4-text text-sm">磁吸</span>
        </div>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  modelValue: 'four-columns' | 'three-columns' | 'two-columns' | 'one-column' | 'masonry'
}

interface Emits {
  (e: 'update:modelValue', value: 'four-columns' | 'three-columns' | 'two-columns' | 'one-column' | 'masonry'): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const recentProjectsLayout = ref(props.modelValue)

// 处理布局切换
function handleLayoutChange(layout: 'four-columns' | 'three-columns' | 'two-columns' | 'one-column' | 'masonry') {
  recentProjectsLayout.value = layout
  emit('update:modelValue', layout)
  emit('save')
}

// 监听外部变化
watch(() => props.modelValue, (newValue) => {
  recentProjectsLayout.value = newValue
})
</script>