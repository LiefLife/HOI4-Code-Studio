<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { documentationSections, type DocItem } from '../data/documentationContent'

const router = useRouter()

const firstSection = documentationSections[0]
const firstItem: DocItem | null = firstSection && firstSection.items.length > 0
  ? firstSection.items[0]
  : null

const activeItemId = ref(firstItem ? firstItem.id : '')

const activeItem = computed<DocItem | null>(() => {
  for (const section of documentationSections) {
    const found = section.items.find(item => item.id === activeItemId.value)
    if (found) {
      return found
    }
  }
  return firstItem
})

function handleSelectItem(id: string) {
  activeItemId.value = id
}

function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="h-full w-full flex flex-col p-[2vh] bg-hoi4-dark">
    <!-- 顶部栏 -->
    <div class="flex items-center mb-[3vh]">
      <button
        @click="goBack"
        class="btn-secondary flex items-center space-x-2"
        style="padding: clamp(0.5rem, 1vh, 0.75rem) clamp(1rem, 2vw, 1.5rem)"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>返回</span>
      </button>
      <h1
        class="ml-[3vw] font-bold text-hoi4-text"
        style="font-size: clamp(1.25rem, 2.5vw, 2rem)"
      >
        使用文档
      </h1>
    </div>

    <!-- 主体区域：左菜单 + 右内容 -->
    <div class="flex-1 flex overflow-hidden gap-4">
      <!-- 左侧菜单 -->
      <div class="w-full max-w-xs">
        <div class="card h-full overflow-y-auto p-4 space-y-4">
          <div
            v-for="section in documentationSections"
            :key="section.id"
            class="space-y-2"
          >
            <div class="text-hoi4-text text-sm font-semibold">
              {{ section.title }}
            </div>
            <div class="space-y-1">
              <button
                v-for="item in section.items"
                :key="item.id"
                @click="handleSelectItem(item.id)"
                class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                :class="item.id === activeItemId
                  ? 'bg-hoi4-accent text-hoi4-text shadow-sm'
                  : 'text-hoi4-text-dim hover:bg-hoi4-border/40 hover:text-hoi4-text'"
              >
                {{ item.title }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧内容 -->
      <div class="flex-1 min-w-0">
        <div class="card h-full overflow-y-auto p-6 flex flex-col space-y-4">
          <div v-if="activeItem" class="space-y-4">
            <div>
              <h2 class="text-hoi4-text text-xl font-bold mb-2">
                {{ activeItem.title }}
              </h2>
              <p class="text-hoi4-comment text-sm">
                {{ activeItem.summary }}
              </p>
            </div>

            <ul class="list-disc list-inside space-y-2 text-sm text-hoi4-text">
              <li
                v-for="(line, index) in activeItem.details"
                :key="index"
              >
                {{ line }}
              </li>
            </ul>
          </div>

          <div v-else class="text-hoi4-text-dim text-sm">
            暂无可用文档条目。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
