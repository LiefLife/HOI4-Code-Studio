import { ref, computed } from 'vue'
import type { IdeaEntry, IdeaLoadResponse } from '../api/tauri'
import { loadIdeas, resetIdeaCache } from '../api/tauri'

interface IdeaRegistryState {
  loading: boolean
  ideas: IdeaEntry[]
  status: string
}

const state = ref<IdeaRegistryState>({
  loading: false,
  ideas: [],
  status: ''
})

const projectRootRef = ref<string | undefined>(undefined)
const gameRootRef = ref<string | undefined>(undefined)

export function setIdeaRoots(projectRoot?: string, gameRoot?: string) {
  projectRootRef.value = projectRoot
  gameRootRef.value = gameRoot
}

export async function ensureIdeaRegistry(): Promise<IdeaLoadResponse> {
  if (state.value.loading) {
    return {
      success: false,
      message: 'idea加载进行中，请稍后',
      ideas: state.value.ideas
    }
  }

  state.value.loading = true
  state.value.status = '加载idea中...'
  try {
    const resp = await loadIdeas(projectRootRef.value, gameRootRef.value)
    if (resp.success && resp.ideas) {
      state.value.ideas = resp.ideas
      state.value.status = `已加载 ${resp.ideas.length} 个idea`
    } else {
      state.value.status = resp.message
      state.value.ideas = resp.ideas ?? []
    }
    return resp
  } catch (error) {
    const message = `idea加载失败: ${error}`
    state.value.status = message
    state.value.ideas = []
    return {
      success: false,
      message,
      ideas: []
    }
  } finally {
    state.value.loading = false
  }
}

export async function clearIdeaCache() {
  await resetIdeaCache()
  state.value.ideas = []
  state.value.status = '缓存已清空'
}

export function useIdeaRegistry() {
  const isLoading = computed(() => state.value.loading)
  const ideas = computed(() => state.value.ideas)
  const statusMessage = computed(() => state.value.status)

  return {
    isLoading,
    ideas,
    statusMessage,
    refresh: ensureIdeaRegistry,
    clear: clearIdeaCache
  }
}
