<template>
  <div class="space-y-4">
    <!-- 主题标题和切换按钮 -->
    <div class="flex items-center justify-between mb-2">
      <label class="block text-hoi4-text text-base font-semibold">
        界面主题
      </label>
      <button
        @click="showThemeOptions = !showThemeOptions"
        class="flex items-center space-x-1 text-hoi4-accent hover:text-hoi4-accent/80 transition-colors"
      >
        <svg
          class="w-5 h-5 transition-transform duration-300"
          :class="showThemeOptions ? 'transform rotate-180' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
        <span class="text-sm">{{ showThemeOptions ? '收起' : '展开' }}</span>
      </button>
    </div>
    
    <!-- 主题选择网格 - 带过渡动画 -->
    <div
      class="overflow-hidden transition-all duration-300 ease-in-out"
      :class="showThemeOptions ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'"
    >
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 overflow-y-auto max-h-[400px] custom-scrollbar">
        <button
          v-for="theme in themes"
          :key="theme.id"
          @click="setTheme(theme.id)"
          class="relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-[1.02]"
          :class="[
            currentThemeId === theme.id
              ? 'border-hoi4-accent ring-2 ring-hoi4-accent ring-opacity-50'
              : 'border-hoi4-border hover:border-hoi4-accent'
          ]"
          :style="{ backgroundColor: theme.colors.bgSecondary }"
        >
          <!-- 主题预览色块 -->
          <div class="flex space-x-1 mb-2 justify-center">
            <div
              class="w-3 h-3 rounded"
              :style="{ backgroundColor: theme.colors.accent }"
            ></div>
            <div
              class="w-3 h-3 rounded"
              :style="{ backgroundColor: theme.colors.success }"
            ></div>
            <div
              class="w-3 h-3 rounded"
              :style="{ backgroundColor: theme.colors.warning }"
            ></div>
            <div
              class="w-3 h-3 rounded"
              :style="{ backgroundColor: theme.colors.error }"
            ></div>
          </div>
          <!-- 主题名称 -->
          <div
            class="text-xs font-medium text-center"
            :style="{ color: theme.colors.fg }"
          >
            {{ theme.name }}
          </div>
          <!-- 当前选中标记 -->
          <div
            v-if="currentThemeId === theme.id"
            class="absolute top-1 right-1"
          >
            <svg
              class="w-4 h-4"
              :style="{ color: theme.colors.accent }"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </div>
        </button>
      </div>
      <p class="text-hoi4-comment text-sm mt-2">
        在编辑器中可按 <kbd class="px-1.5 py-0.5 rounded bg-hoi4-gray border border-hoi4-border text-hoi4-text">Ctrl+Shift+T</kbd> 快速切换主题
      </p>
      <button
        @click="createCustomThemeFromCurrent"
        class="text-xs text-hoi4-accent hover:text-hoi4-accent/80"
      >
        从当前主题创建
      </button>
    </div>

    <div class="ui-surface-1 rounded-lg p-3 space-y-2">
      <div class="flex items-center justify-between">
        <div class="text-hoi4-text font-semibold">自定义主题</div>
        <button class="btn-primary px-3" @click="createCustomThemeFromCurrent">从当前主题复制创建</button>
      </div>

      <div v-if="customThemes.length === 0" class="text-hoi4-text-dim text-sm">暂无自定义主题</div>
      <div v-else class="space-y-2">
        <div
          v-for="t in customThemes"
          :key="t.id"
          class="ui-surface-2 rounded-lg p-3 flex items-start justify-between gap-3"
        >
          <div class="min-w-0">
            <div class="text-hoi4-text font-semibold truncate">{{ t.name }}</div>
            <div class="text-hoi4-comment text-xs truncate">{{ t.id }}</div>
            <div class="mt-2 flex items-center gap-2">
              <button class="btn-secondary px-3" @click="setTheme(t.id)">应用</button>
              <button class="btn-secondary px-3" @click="renameCustomTheme(t.id)">重命名</button>
              <button class="btn-secondary px-3" @click="overwriteCustomThemeWithCurrent(t.id)">用当前覆盖</button>
              <button class="btn-danger px-3" @click="removeCustomTheme(t.id)">删除</button>
            </div>
          </div>
          <div class="flex space-x-1 pt-1">
            <div class="w-3 h-3 rounded" :style="{ backgroundColor: t.colors.accent }"></div>
            <div class="w-3 h-3 rounded" :style="{ backgroundColor: t.colors.success }"></div>
            <div class="w-3 h-3 rounded" :style="{ backgroundColor: t.colors.warning }"></div>
            <div class="w-3 h-3 rounded" :style="{ backgroundColor: t.colors.error }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTheme, type Theme } from '../../composables/useTheme'

const {
  themes,
  customThemes,
  currentThemeId,
  currentTheme,
  setTheme,
  refreshCustomThemes,
  upsertCustomTheme,
  deleteCustomTheme
} = useTheme()
const showThemeOptions = ref(true)

async function createCustomThemeFromCurrent() {
  const id = window.prompt('请输入主题 ID（唯一）')
  if (!id) return
  const name = window.prompt('请输入主题名称')
  if (!name) return

  const base = currentTheme.value
  const t: Theme = {
    id,
    name,
    colors: {
      ...base.colors
    }
  }
  await upsertCustomTheme(t)
}

async function renameCustomTheme(themeId: string) {
  const t = customThemes.value.find(x => x.id === themeId)
  if (!t) return
  const name = window.prompt('请输入新的主题名称', t.name)
  if (!name) return
  await upsertCustomTheme({
    ...t,
    name
  })
}

async function overwriteCustomThemeWithCurrent(themeId: string) {
  const t = customThemes.value.find(x => x.id === themeId)
  if (!t) return
  if (!window.confirm('确认用“当前主题”的配色覆盖该自定义主题？')) return
  const base = currentTheme.value
  await upsertCustomTheme({
    ...t,
    colors: {
      ...base.colors
    }
  })
}

async function removeCustomTheme(themeId: string) {
  if (!window.confirm('确认删除该自定义主题？')) return
  await deleteCustomTheme(themeId)
}

onMounted(async () => {
  await refreshCustomThemes()
})
</script>