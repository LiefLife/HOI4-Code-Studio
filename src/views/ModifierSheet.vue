<script setup lang="ts">
/**
 * Modifier 速查表窗口
 * 
 * 该组件用于展示和搜索所有的 Modifier，并支持点击复制代码。
 * 数据来源：项目根目录下的 modifier.txt
 */
import { ref, onMounted, computed } from 'vue'
import { getModifierList } from '../api/tauri'

interface Modifier {
  code: string
  name: string
}

const modifiers = ref<Modifier[]>([])
const searchQuery = ref('')
const loading = ref(true)
const error = ref('')
const copyStatus = ref<string | null>(null)

/**
 * 挂载时加载 Modifier 数据
 */
onMounted(async () => {
  try {
    const result = await getModifierList()
    if (result.success && result.data) {
      const lines = result.data.split('\n')
      const parsed: Modifier[] = []
      
      for (const line of lines) {
        const trimmed = line.trim()
        // 跳过空行和说明行
        if (!trimmed || trimmed.startsWith('注：')) continue
        
        const parts = trimmed.split(' - ')
        if (parts.length >= 2) {
          parsed.push({
            code: parts[0].trim(),
            name: parts[1].trim()
          })
        }
      }
      modifiers.value = parsed
    } else {
      error.value = result.message
    }
  } catch (err) {
    error.value = '加载失败: ' + String(err)
  } finally {
    loading.value = false
  }
})

/**
 * 根据搜索词过滤 Modifier
 */
const filteredModifiers = computed(() => {
  if (!searchQuery.value) return modifiers.value
  const query = searchQuery.value.toLowerCase()
  return modifiers.value.filter(m => 
    m.code.toLowerCase().includes(query) || 
    m.name.toLowerCase().includes(query)
  )
})

/**
 * 复制代码到剪贴板
 * @param content 要复制的代码内容
 */
async function copyToClipboard(content: string) {
  try {
    await navigator.clipboard.writeText(content)
    copyStatus.value = `已复制: ${content}`
    setTimeout(() => {
      copyStatus.value = null
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
    copyStatus.value = '复制失败'
    setTimeout(() => {
      copyStatus.value = null
    }, 2000)
  }
}
</script>

<template>
  <div class="h-screen flex flex-col bg-hoi4-dark text-hoi4-text overflow-hidden font-sans border-0 shadow-none">
    <!-- 头部搜索 -->
    <div class="p-4 bg-hoi4-gray/70 shadow-md z-10">
      <div class="relative">
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="搜索 Modifier (代码或名称)..." 
          class="w-full bg-hoi4-accent/10 border border-hoi4-border/30 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-hoi4-accent/50 focus:border-hoi4-accent/50 transition-all placeholder:text-hoi4-text-dim/50"
          autofocus
        />
        <svg class="w-4 h-4 absolute left-3 top-2.5 text-hoi4-text-dim/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <!-- 搜索统计 -->
        <div class="absolute right-3 top-2.5 text-[10px] text-hoi4-text-dim/40 font-mono">
          {{ filteredModifiers.length }} / {{ modifiers.length }}
        </div>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-hoi4-dark">
      <div v-if="loading" class="flex flex-col justify-center items-center h-full gap-3">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-hoi4-accent/20 border-b-hoi4-accent"></div>
        <span class="text-sm text-hoi4-text-dim animate-pulse">正在解析 Modifier 数据...</span>
      </div>
      <div v-else-if="error" class="flex flex-col items-center justify-center h-full p-6 text-center">
        <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-red-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="text-red-400 font-bold mb-2">数据加载失败</div>
        <div class="text-sm text-hoi4-text-dim/80">{{ error }}</div>
      </div>
      <div v-else class="flex flex-wrap gap-2 content-start pb-4">
        <button 
          v-for="mod in filteredModifiers" 
          :key="mod.code"
          @click="copyToClipboard(mod.code)"
          class="px-3 py-1.5 bg-hoi4-gray/40 hover:bg-hoi4-accent/20 border border-hoi4-border/20 hover:border-hoi4-accent/40 rounded-md text-sm transition-all active:scale-95 group relative flex flex-col items-start min-w-[80px]"
        >
          <span class="text-hoi4-text group-hover:text-white transition-colors">{{ mod.name }}</span>
          <!-- 悬浮显示代码 (与国策树预览框样式一致) -->
          <div class="absolute pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 ui-island backdrop-blur-md px-3 py-2 rounded-xl shadow-2xl -top-12 left-0 whitespace-nowrap border border-hoi4-border/30">
            <div class="flex items-center gap-2">
              <span class="text-hoi4-text font-bold text-[11px] tracking-wide">{{ mod.code }}</span>
              <span class="text-hoi4-text-dim/60 text-[10px] font-normal">点击复制</span>
            </div>
            <!-- 装饰小三角 -->
            <div class="absolute -bottom-1 left-4 w-2 h-2 bg-hoi4-gray/90 rotate-45 border-r border-b border-hoi4-border/30"></div>
          </div>
        </button>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="p-3 border-t border-hoi4-border/20 bg-hoi4-gray/80 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-[11px] text-hoi4-text-dim/80">
          <svg class="w-3.5 h-3.5 text-yellow-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          如遇到不生效的问题，请尝试删除或增加前缀 <code class="bg-hoi4-accent/30 px-1 rounded font-mono text-hoi4-text text-[10px]">MODIFIER_</code>
        </div>
        
        <!-- 复制成功提示 -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform translate-y-2 opacity-0"
          enter-to-class="transform translate-y-0 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="transform translate-y-0 opacity-100"
          leave-to-class="transform translate-y-2 opacity-0"
        >
          <div v-if="copyStatus" class="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded border border-green-500/30 flex items-center gap-1.5">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            {{ copyStatus }}
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(var(--hoi4-accent-rgb), 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--hoi4-accent-rgb), 0.3);
}

/* 按钮点击波纹效果 */
button::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: inherit;
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.3s ease-out;
  pointer-events: none;
}

button:active::after {
  transform: translate(-50%, -50%) scale(1.5);
  opacity: 0;
}
</style>
