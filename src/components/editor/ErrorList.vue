<script setup lang="ts">
defineProps<{
  errors: Array<{line: number, msg: string, type: string}>
}>()

const emit = defineEmits<{
  jumpToError: [error: {line: number, msg: string, type: string}]
}>()
</script>

<template>
  <div class="h-full flex flex-col">
    <div v-if="errors.length === 0" class="text-hoi4-text-dim text-sm p-2">
      无错误
    </div>
    <div v-else class="flex-1 overflow-y-auto p-2">
      <div class="text-hoi4-text text-xs mb-2 font-semibold">
        找到 {{ errors.length }} 个错误
      </div>
      <div class="space-y-1">
        <div
          v-for="(error, index) in errors"
          :key="index"
          @click="emit('jumpToError', error)"
          class="bg-hoi4-accent p-2 rounded cursor-pointer hover:bg-hoi4-border transition-colors"
        >
          <div class="text-hoi4-text text-xs font-semibold mb-1">
            第 {{ error.line }} 行: {{ error.msg }}
          </div>
          <div class="text-hoi4-text-dim text-xs">
            类型: {{ error.type }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
