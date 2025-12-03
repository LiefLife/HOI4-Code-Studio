<template>
  <div class="settings-card">
    <div v-if="title || description" class="settings-card-header">
      <h2 v-if="title" class="settings-card-title">{{ title }}</h2>
      <p v-if="description" class="settings-card-description">{{ description }}</p>
    </div>
    
    <div class="settings-card-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  description?: string
}

defineProps<Props>()
</script>

<style scoped>
.settings-card-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>