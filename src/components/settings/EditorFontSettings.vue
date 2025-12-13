<template>
  <div class="space-y-4">
    <!-- 字体类型选择 -->
    <div class="settings-form-group">
      <label class="settings-form-label">字体类型</label>
      <select
        :value="fontConfig.family"
        class="input-field w-full"
        @change="handleFontFamilyChange"
      >
        <option
          v-for="font in availableFonts"
          :key="font.value"
          :value="font.value"
        >
          {{ font.label }}
        </option>
      </select>
    </div>
    
    <!-- 字体大小设置 -->
    <div class="settings-form-group">
      <label class="settings-form-label">字体大小: {{ fontConfig.size }}px</label>
      <div class="flex items-center space-x-3">
        <input
          :value="fontConfig.size"
          type="range"
          min="12"
          max="24"
          step="1"
          class="flex-1"
          @input="handleFontSizeChange"
        />
        <select
          :value="fontConfig.size"
          class="input-field w-24"
          @change="handleFontSizeChange"
        >
          <option
            v-for="size in fontSizes"
            :key="size.value"
            :value="size.value"
          >
            {{ size.label }}
          </option>
        </select>
      </div>
    </div>
    
    <!-- 字体粗细设置 -->
    <div class="settings-form-group">
      <label class="settings-form-label">字体粗细: {{ fontConfig.weight }}</label>
      <div class="space-y-3">
        <!-- 滑动条控制 -->
        <div class="flex items-center space-x-3">
          <input
            :value="fontConfig.weight"
            type="range"
            min="100"
            max="1000"
            step="50"
            class="flex-1"
            @input="handleFontWeightChange"
          />
          <input
            :value="fontConfig.weight"
            type="number"
            min="100"
            max="1000"
            step="50"
            class="input-field w-20 text-center"
            @input="handleFontWeightChange"
          />
        </div>
        
        <!-- 快速预设按钮 -->
        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in fontWeightPresets"
            :key="preset.value"
            type="button"
            :class="[
              'px-3 py-1 text-sm rounded border transition-colors',
              fontConfig.weight === preset.value
                ? 'bg-hoi4-accent text-white border-hoi4-accent'
                : 'bg-hoi4-bg-secondary text-hoi4-text-secondary border-hoi4-border hover:bg-hoi4-bg-hover'
            ]"
            @click="handleFontWeightPreset(preset.value)"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 行高设置 -->
    <div class="settings-form-group">
      <label class="settings-form-label">行高: {{ fontConfig.lineHeight.toFixed(1) }}</label>
      <div class="flex items-center space-x-3">
        <input
          :value="fontConfig.lineHeight"
          type="range"
          min="1.0"
          max="3.0"
          step="0.1"
          class="flex-1"
          @input="handleLineHeightChange"
        />
        <input
          :value="fontConfig.lineHeight"
          type="number"
          min="1.0"
          max="3.0"
          step="0.1"
          class="input-field w-24 text-center"
          @input="handleLineHeightChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorFont } from '../../composables/useEditorFont'

interface Emits {
  (e: 'save'): void
}

const emit = defineEmits<Emits>()

const { 
  fontConfig, 
  availableFonts, 
  fontSizes,
  fontWeightPresets, 
  setFontConfig 
} = useEditorFont()

// 处理字体族变化
function handleFontFamilyChange(event: Event) {
  const target = event.target as HTMLSelectElement
  setFontConfig({
    ...fontConfig.value,
    family: target.value
  })
  emit('save')
}

// 处理字体大小变化
function handleFontSizeChange(event: Event) {
  const target = event.target as HTMLInputElement
  const size = parseInt(target.value)
  setFontConfig({
    ...fontConfig.value,
    size
  })
  emit('save')
}

// 处理字体粗细变化
function handleFontWeightChange(event: Event) {
  const target = event.target as HTMLInputElement
  const weight = target.value
  setFontConfig({
    ...fontConfig.value,
    weight
  })
  emit('save')
}

// 处理字体粗细预设选择
function handleFontWeightPreset(weight: string) {
  setFontConfig({
    ...fontConfig.value,
    weight
  })
  emit('save')
}

// 处理行高变化
function handleLineHeightChange(event: Event) {
  const target = event.target as HTMLInputElement
  const lineHeight = parseFloat(target.value)
  setFontConfig({
    ...fontConfig.value,
    lineHeight
  })
  emit('save')
}
</script>