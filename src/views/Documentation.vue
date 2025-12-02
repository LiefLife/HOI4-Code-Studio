<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { documentationSections, type DocItem } from '../data/documentationContent'

const router = useRouter()
const isLoading = ref(true)
const hoveredSection = ref<string | null>(null)
const hoveredItem = ref<string | null>(null)

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

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false
  }, 300)
})
</script>

<template>
  <div class="h-full w-full flex flex-col bg-gradient-to-br from-hoi4-dark via-hoi4-dark/95 to-hoi4-gray/90 relative overflow-hidden">
    <!-- 背景装饰 -->
    <div class="absolute inset-0 opacity-10">
      <div class="absolute top-10 left-10 w-64 h-64 bg-hoi4-accent rounded-full filter blur-3xl animate-pulse"></div>
      <div class="absolute bottom-10 right-10 w-96 h-96 bg-hoi4-accent/30 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-hoi4-dark/80 backdrop-blur-sm z-50">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-hoi4-accent border-t-transparent mb-4"></div>
        <p class="text-hoi4-text text-sm animate-pulse">正在加载文档...</p>
      </div>
    </div>

    <!-- 顶部导航岛 -->
    <header class="relative z-10 p-6">
      <div class="island-container max-w-7xl mx-auto">
        <div class="island inline-flex items-center space-x-4 p-4 backdrop-blur-xl bg-hoi4-gray/30 border border-hoi4-border/20">
          <button
            @click="goBack"
            class="btn-island flex items-center space-x-2 px-4 py-2 rounded-xl bg-hoi4-accent/10 hover:bg-hoi4-accent/20 border border-hoi4-accent/30 hover:border-hoi4-accent/50 text-hoi4-text transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-hoi4-accent/20"
          >
            <svg class="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span class="font-medium">返回</span>
          </button>
          <div class="h-8 w-px bg-hoi4-border/30"></div>
          <h1 class="text-2xl font-bold text-hoi4-text bg-gradient-to-r from-hoi4-text to-hoi4-accent bg-clip-text text-transparent">
            使用文档
          </h1>
        </div>
      </div>
    </header>

    <!-- 主体内容区域 -->
    <main class="flex-1 relative z-10 px-6 pb-6 overflow-hidden">
      <div class="max-w-7xl mx-auto h-full flex gap-6">
        <!-- 左侧导航岛 -->
        <aside class="w-80 flex-shrink-0 h-full scroll-container">
          <div class="island h-full p-6 backdrop-blur-xl bg-hoi4-gray/30 border border-hoi4-border/20 flex flex-col">
            <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 scroll-content">
              <div
                v-for="section in documentationSections"
                :key="section.id"
                class="section-island"
                @mouseenter="hoveredSection = section.id"
                @mouseleave="hoveredSection = null"
              >
                <div 
                  class="section-header"
                  :class="{ 'section-header-active': hoveredSection === section.id }"
                >
                  <h3 class="text-hoi4-text font-semibold text-base flex items-center">
                    <span class="w-2 h-2 rounded-full mr-2 transition-all duration-300"
                          :class="hoveredSection === section.id ? 'bg-hoi4-accent scale-125' : 'bg-hoi4-border'"></span>
                    {{ section.title }}
                  </h3>
                </div>
                <div class="mt-3 space-y-1">
                  <div
                    v-for="item in section.items"
                    :key="item.id"
                    @click="handleSelectItem(item.id)"
                    @mouseenter="hoveredItem = item.id"
                    @mouseleave="hoveredItem = null"
                    class="item-card cursor-pointer"
                    :class="{
                      'item-card-active': item.id === activeItemId,
                      'item-card-hover': hoveredItem === item.id && item.id !== activeItemId
                    }"
                  >
                    <div class="flex items-center space-x-3">
                      <div class="w-1.5 h-1.5 rounded-full transition-all duration-300"
                           :class="item.id === activeItemId ? 'bg-hoi4-accent' : 'bg-hoi4-border/50'"></div>
                      <span class="text-sm font-medium">{{ item.title }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- 右侧内容岛 -->
        <section class="flex-1 min-w-0 h-full scroll-container">
          <div class="island h-full p-8 backdrop-blur-xl bg-hoi4-gray/30 border border-hoi4-border/20 flex flex-col">
            <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 scroll-content">
              <div v-if="activeItem" class="content-animate space-y-8">
                <!-- 标题区域 -->
                <div class="content-header-island p-6 bg-hoi4-accent/5 border-l-4 border-hoi4-accent rounded-r-xl">
                  <h2 class="text-3xl font-bold text-hoi4-text mb-4">
                    {{ activeItem.title }}
                  </h2>
                  <p class="text-hoi4-comment leading-relaxed text-base">
                    {{ activeItem.summary }}
                  </p>
                </div>

                <!-- 详细内容 -->
                <div class="content-body-island">
                  <ul class="space-y-4">
                    <li
                      v-for="(line, index) in activeItem.details"
                      :key="index"
                      class="content-item p-4 bg-hoi4-gray/20 rounded-xl border border-hoi4-border/10 hover:border-hoi4-accent/20 transition-all duration-300 hover:shadow-lg hover:shadow-hoi4-accent/5"
                    >
                      <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 w-6 h-6 rounded-full bg-hoi4-accent/10 flex items-center justify-center mt-0.5">
                          <div class="w-2 h-2 rounded-full bg-hoi4-accent"></div>
                        </div>
                        <p class="text-hoi4-text leading-relaxed flex-1">
                          {{ line }}
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div v-else class="flex items-center justify-center h-full">
                <div class="text-center">
                  <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-hoi4-gray/20 flex items-center justify-center">
                    <svg class="w-10 h-10 text-hoi4-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p class="text-hoi4-text-dim text-sm">暂无可用文档条目</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
