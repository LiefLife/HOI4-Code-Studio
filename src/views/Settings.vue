<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { loadSettings, saveSettings, validateGameDirectory, openFileDialog } from '../api/tauri'

const router = useRouter()

// 设置数据
const gameDirectory = ref('')
const autoSave = ref(true)
const showGrid = ref(false)
const syntaxHighlight = ref(true)

// 状态
const showStatus = ref(false)
const statusMessage = ref('')
const isSaving = ref(false)

// 显示状态消息
function displayStatus(message: string, duration: number = 3000) {
  statusMessage.value = message
  showStatus.value = true
  
  setTimeout(() => {
    showStatus.value = false
  }, duration)
}

// 加载设置
async function loadUserSettings() {
  const result = await loadSettings()
  if (result.success && result.data) {
    const data = result.data as any
    gameDirectory.value = data.gameDirectory || ''
    autoSave.value = data.autoSave !== false
    showGrid.value = data.showGrid === true
    syntaxHighlight.value = data.syntaxHighlight !== false
  }
}

// 选择游戏目录
async function selectGameDirectory() {
  const result = await openFileDialog('directory')
  if (result.success && result.path) {
    const validation = await validateGameDirectory(result.path)
    if (validation.valid) {
      gameDirectory.value = result.path
      displayStatus('游戏目录验证成功', 2000)
    } else {
      displayStatus(`无效的游戏目录: ${validation.message}`, 3000)
    }
  }
}

// 保存设置
async function handleSave() {
  isSaving.value = true
  
  const settings = {
    gameDirectory: gameDirectory.value,
    autoSave: autoSave.value,
    showGrid: showGrid.value,
    syntaxHighlight: syntaxHighlight.value
  }
  
  const result = await saveSettings(settings)
  
  if (result.success) {
    displayStatus('设置保存成功', 2000)
  } else {
    displayStatus(`保存失败: ${result.message}`, 3000)
  }
  
  isSaving.value = false
}

// 返回主界面
function goBack() {
  router.push('/')
}

onMounted(() => {
  loadUserSettings()
})
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
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        <span>返回</span>
      </button>
      <h1 class="ml-[3vw] font-bold text-hoi4-text" style="font-size: clamp(1.25rem, 2.5vw, 2rem)">
        设置
      </h1>
    </div>

    <!-- 设置表单 -->
    <div class="flex-1 overflow-y-auto">
      <div class="card max-w-3xl mx-auto space-y-6">
        <!-- 游戏目录 -->
        <div>
          <label class="block text-hoi4-text mb-2 text-lg font-semibold">
            HOI4 游戏目录
          </label>
          <div class="flex space-x-2">
            <input
              v-model="gameDirectory"
              type="text"
              readonly
              placeholder="选择 Hearts of Iron IV 游戏目录"
              class="input-field flex-1"
            />
            <button
              type="button"
              @click="selectGameDirectory"
              class="btn-primary px-6"
            >
              浏览
            </button>
          </div>
        </div>

        <!-- 编辑器设置 -->
        <div class="space-y-4">
          <h2 class="text-hoi4-text text-lg font-semibold">编辑器设置</h2>
          
          <label class="flex items-center space-x-3 cursor-pointer">
            <input
              v-model="autoSave"
              type="checkbox"
              class="w-5 h-5 rounded border-2 border-hoi4-border bg-hoi4-accent"
            />
            <span class="text-hoi4-text">自动保存</span>
          </label>

          <label class="flex items-center space-x-3 cursor-pointer">
            <input
              v-model="showGrid"
              type="checkbox"
              class="w-5 h-5 rounded border-2 border-hoi4-border bg-hoi4-accent"
            />
            <span class="text-hoi4-text">显示网格</span>
          </label>

          <label class="flex items-center space-x-3 cursor-pointer">
            <input
              v-model="syntaxHighlight"
              type="checkbox"
              class="w-5 h-5 rounded border-2 border-hoi4-border bg-hoi4-accent"
            />
            <span class="text-hoi4-text">语法高亮</span>
          </label>
        </div>

        <!-- 保存按钮 -->
        <div class="flex justify-end pt-4">
          <button
            @click="handleSave"
            :disabled="isSaving"
            class="btn-primary px-8"
            :class="{ 'opacity-50 cursor-not-allowed': isSaving }"
          >
            {{ isSaving ? '保存中...' : '保存设置' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 状态提示 -->
    <div v-if="showStatus" class="fixed bottom-[2vh] right-[2vw] z-50">
      <div class="bg-hoi4-gray border-2 border-hoi4-border rounded-lg shadow-lg p-4">
        <p class="text-hoi4-text">{{ statusMessage }}</p>
      </div>
    </div>
  </div>
</template>
