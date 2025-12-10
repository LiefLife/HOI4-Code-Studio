/**
 * useGrammarCompletion 组合式测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { IdeaEntry, TagEntry } from '../../../src/api/tauri'
import { useGrammarCompletion } from '../../../src/composables/useGrammarCompletion'

const ideaStore = ref<IdeaEntry[]>([])
const tagStore = ref<TagEntry[]>([])

vi.mock('../../../src/composables/useIdeaRegistry', () => ({
  useIdeaRegistry: () => ({
    ideas: computed(() => ideaStore.value)
  })
}))

vi.mock('../../../src/composables/useTagRegistry', () => ({
  useTagRegistry: () => ({
    tags: computed(() => tagStore.value)
  })
}))

describe('useGrammarCompletion', () => {
  beforeEach(() => {
    ideaStore.value = []
    tagStore.value = []
  })

  it('应该提供静态关键字补全', () => {
    const { staticItems } = useGrammarCompletion()
    expect(staticItems.value.length).toBeGreaterThan(0)
    expect(
      staticItems.value.find((item) => item.label === 'if' && item.source === 'keyword')
    ).toBeTruthy()
  })

  it('应该根据 idea 数据生成补全项', () => {
    ideaStore.value = [
      { id: 'test_idea', source: 'project' },
      { id: 'builtin_idea', source: 'game' }
    ]

    const { ideaItems } = useGrammarCompletion()
    expect(ideaItems.value).toHaveLength(2)
    expect(ideaItems.value[0]).toMatchObject({
      label: 'test_idea',
      source: 'idea'
    })
  })

  it('应该根据 tag 数据生成补全项', () => {
    tagStore.value = [
      { code: 'AAA', source: 'project' },
      { code: 'BBB', source: 'game' }
    ]

    const { tagItems } = useGrammarCompletion()
    expect(tagItems.value).toHaveLength(2)
    expect(tagItems.value[1]).toMatchObject({
      label: 'BBB',
      source: 'tag'
    })
  })

  it('应该合并所有补全项并处理去重及优先级', () => {
    ideaStore.value = [
      { id: 'IF', source: 'project' },
      { id: 'shared_entry', source: 'dependency' }
    ]
    tagStore.value = [
      { code: 'shared_entry', source: 'game' },
      { code: 'TAG_ONLY', source: 'project' }
    ]

    const { allItems } = useGrammarCompletion()

    const keywordEntry = allItems.value.filter((item) => item.label === 'if')
    expect(keywordEntry).toHaveLength(1)
    expect(keywordEntry[0].source).toBe('keyword')

    const sharedEntry = allItems.value.filter((item) => item.label === 'shared_entry')
    expect(sharedEntry).toHaveLength(1)
    expect(sharedEntry[0].source).toBe('tag')
  })
})
