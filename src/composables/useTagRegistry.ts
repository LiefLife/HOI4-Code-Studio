import { ref, computed } from 'vue'
import type { TagLoadResponse, TagValidationResponse } from '../api/tauri'
import { validateTags } from '../api/tauri'
import {
  setTagRoots as internalSetTagRoots,
  ensureRefreshed,
  getEntries,
  getStatus,
  getRegistry,
  getRoots
} from '../utils/TagRegistry'

const loading = ref(false)
const tags = ref(getEntries())
const statusMessage = ref(getStatus())

export function setTagRoots(projectRoot?: string, gameRoot?: string) {
  internalSetTagRoots(projectRoot, gameRoot)
}

export async function ensureTagRegistry(): Promise<TagLoadResponse> {
  if (loading.value) {
    return {
      success: false,
      message: '标签加载进行中，请稍后',
      tags: tags.value
    }
  }

  loading.value = true
  statusMessage.value = '加载国家标签...'
  try {
    const resp = await ensureRefreshed()
    tags.value = getEntries()
    statusMessage.value = getStatus()
    return resp
  } finally {
    loading.value = false
  }
}

export function useTagRegistry() {
  const isLoading = computed(() => loading.value)
  const tagList = computed(() => tags.value)
  const status = computed(() => statusMessage.value)

  return {
    isLoading,
    tags: tagList,
    statusMessage: status,
    refresh: ensureTagRegistry,
    async validate(content: string): Promise<TagValidationResponse> {
      const { projectRoot, gameRoot } = getRoots()
      const resp = await validateTags(content, projectRoot, gameRoot)
      return resp
    },
    tagSet: getRegistry
  }
}
