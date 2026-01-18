<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { openFileDialog } from '../../api/tauri'
import { usePluginManager } from '../../composables/usePluginManager'

const {
  installedPlugins,
  isLoadingPlugins,
  lastError,
  refreshPlugins,
  installFromPath,
  uninstallById
} = usePluginManager()

const isInstalling = ref(false)

async function installFromDirectory() {
  isInstalling.value = true
  try {
    const r = await openFileDialog('directory')
    if (r.success && r.path) {
      await installFromPath(r.path)
    }
  } finally {
    isInstalling.value = false
  }
}

async function installFromZip() {
  isInstalling.value = true
  try {
    const r = await openFileDialog('file')
    if (r.success && r.path) {
      await installFromPath(r.path)
    }
  } finally {
    isInstalling.value = false
  }
}

async function uninstallPlugin(id: string) {
  await uninstallById(id)
}

onMounted(async () => {
  await refreshPlugins()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <button
        class="btn-primary px-4"
        :disabled="isInstalling"
        @click="installFromDirectory"
      >
        安装插件(文件夹)
      </button>
      <button
        class="btn-secondary px-4"
        :disabled="isInstalling"
        @click="installFromZip"
      >
        安装插件(zip)
      </button>
      <button
        class="btn-secondary px-4"
        :disabled="isLoadingPlugins"
        @click="refreshPlugins"
      >
        刷新
      </button>
    </div>

    <div v-if="lastError" class="text-sm text-red-400 whitespace-pre-wrap">{{ lastError }}</div>

    <div class="ui-surface-1 rounded-lg p-4">
      <div class="text-hoi4-text font-semibold mb-2">已安装插件</div>

      <div v-if="isLoadingPlugins" class="text-hoi4-text-dim text-sm">加载中...</div>
      <div v-else-if="installedPlugins.length === 0" class="text-hoi4-text-dim text-sm">暂无插件</div>

      <div v-else class="space-y-2">
        <div
          v-for="p in installedPlugins"
          :key="p.about.id"
          class="ui-surface-2 rounded-lg p-3 flex items-start justify-between gap-3"
        >
          <div class="min-w-0">
            <div class="text-hoi4-text font-semibold truncate">
              {{ p.about.name }}
              <span class="text-hoi4-text-dim text-xs font-normal">v{{ p.about.version }}</span>
            </div>
            <div class="text-hoi4-comment text-xs truncate">{{ p.about.id }}</div>
            <div v-if="p.about.description" class="text-hoi4-text-dim text-xs mt-1">{{ p.about.description }}</div>
            <div class="text-hoi4-comment text-[10px] mt-1 truncate">{{ p.install_path }}</div>
          </div>

          <button
            class="btn-danger px-3"
            @click="uninstallPlugin(p.about.id)"
          >
            卸载
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
