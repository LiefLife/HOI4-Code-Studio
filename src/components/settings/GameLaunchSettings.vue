<template>
  <div class="space-y-4">
    <!-- 游戏版本选择 -->
    <div class="settings-option">
      <div class="settings-option-control">
        <input
          :checked="useSteamVersion"
          type="radio"
          name="gameVersion"
          :value="true"
          @change="handleVersionChange('steam')"
          class="w-5 h-5 border-2 border-hoi4-border"
        />
      </div>
      <div class="settings-option-content">
        <div class="settings-option-title">使用 Steam 版本启动</div>
        <div class="settings-option-description">通过 Steam 平台启动游戏</div>
      </div>
    </div>

    <div class="settings-option">
      <div class="settings-option-control">
        <input
          :checked="usePirateVersion"
          type="radio"
          name="gameVersion"
          :value="true"
          @change="handleVersionChange('pirate')"
          class="w-5 h-5 border-2 border-hoi4-border"
        />
      </div>
      <div class="settings-option-content">
        <div class="settings-option-title">使用学习版启动</div>
        <div class="settings-option-description">直接启动游戏可执行文件</div>
      </div>
    </div>

    <!-- 学习版选项 -->
    <div v-if="usePirateVersion" class="ml-8 space-y-4">
      <div class="settings-form-group">
        <label class="settings-form-label">选择启动程序</label>
        <div class="flex space-x-4">
          <label class="flex items-center space-x-2 cursor-pointer">
            <input
              :checked="pirateExecutable === 'dowser'"
              type="radio"
              value="dowser"
              @change="handleExecutableChange('dowser')"
              class="w-4 h-4 border-2 border-hoi4-border"
            />
            <span>dowser.exe</span>
          </label>
          <label class="flex items-center space-x-2 cursor-pointer">
            <input
              :checked="pirateExecutable === 'hoi4'"
              type="radio"
              value="hoi4"
              @change="handleExecutableChange('hoi4')"
              class="w-4 h-4 border-2 border-hoi4-border"
            />
            <span>hoi4.exe</span>
          </label>
        </div>
      </div>

      <!-- 提示信息 -->
      <div class="p-3 bg-hoi4-gray rounded-lg border border-hoi4-border">
        <div class="flex items-start space-x-2">
          <svg class="w-5 h-5 text-hoi4-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div class="text-hoi4-comment text-sm">
            <strong class="text-hoi4-text">提示：</strong>学习版启动将使用上方设置的 HOI4 游戏目录，请确保该目录包含 {{ pirateExecutable }}.exe 文件。
          </div>
        </div>
      </div>
    </div>

    <!-- 调试模式选项 -->
    <div class="settings-option">
      <div class="settings-option-control">
        <input
          :checked="launchWithDebug"
          type="checkbox"
          @change="handleDebugChange"
          class="w-4 h-4 border-2 border-hoi4-border rounded"
        />
      </div>
      <div class="settings-option-content">
        <div class="settings-option-title">启动时附加调试参数 (--debug)</div>
        <div class="settings-option-description">启用后，游戏启动时将自动添加 --debug 参数，用于调试和开发目的。</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  useSteamVersion: boolean
  usePirateVersion: boolean
  pirateExecutable: 'dowser' | 'hoi4'
  launchWithDebug: boolean
}

interface Emits {
  (e: 'update:useSteamVersion', value: boolean): void
  (e: 'update:usePirateVersion', value: boolean): void
  (e: 'update:pirateExecutable', value: 'dowser' | 'hoi4'): void
  (e: 'update:launchWithDebug', value: boolean): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const useSteamVersion = ref(props.useSteamVersion)
const usePirateVersion = ref(props.usePirateVersion)
const pirateExecutable = ref(props.pirateExecutable)
const launchWithDebug = ref(props.launchWithDebug)

// 处理版本切换
function handleVersionChange(version: 'steam' | 'pirate') {
  if (version === 'steam') {
    useSteamVersion.value = true
    usePirateVersion.value = false
    emit('update:useSteamVersion', true)
    emit('update:usePirateVersion', false)
  } else {
    useSteamVersion.value = false
    usePirateVersion.value = true
    emit('update:useSteamVersion', false)
    emit('update:usePirateVersion', true)
  }
  emit('save')
}

// 处理启动程序切换
function handleExecutableChange(executable: 'dowser' | 'hoi4') {
  pirateExecutable.value = executable
  emit('update:pirateExecutable', executable)
  emit('save')
}

// 处理调试模式切换
function handleDebugChange() {
  launchWithDebug.value = !launchWithDebug.value
  emit('update:launchWithDebug', launchWithDebug.value)
  emit('save')
}

// 监听外部变化
watch(() => props.useSteamVersion, (newValue) => {
  useSteamVersion.value = newValue
})

watch(() => props.usePirateVersion, (newValue) => {
  usePirateVersion.value = newValue
})

watch(() => props.pirateExecutable, (newValue) => {
  pirateExecutable.value = newValue
})

watch(() => props.launchWithDebug, (newValue) => {
  launchWithDebug.value = newValue
})
</script>