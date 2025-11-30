import { describe, it, expect } from 'vitest'
import { getFileIcon, iconSets } from '../composables/useFileTreeIcons'

describe('文件树图标系统', () => {
  describe('getFileIcon', () => {
    it('应该为文件夹返回正确的图标', () => {
      // 测试折叠的文件夹
      const closedFolder = getFileIcon('test', true, false)
      expect(closedFolder).toEqual({ type: 'emoji', content: '📁' })
      
      // 测试展开的文件夹
      const openFolder = getFileIcon('test', true, true)
      expect(openFolder).toEqual({ type: 'emoji', content: '📂' })
    })

    it('应该为不同文件类型返回正确的图标', () => {
      // 测试各种文件类型
      expect(getFileIcon('test.json', false, false)).toEqual({ type: 'emoji', content: '📄' })
      expect(getFileIcon('test.js', false, false)).toEqual({ type: 'emoji', content: '📜' })
      expect(getFileIcon('test.ts', false, false)).toEqual({ type: 'emoji', content: '📜' })
      expect(getFileIcon('test.vue', false, false)).toEqual({ type: 'emoji', content: '💚' })
      expect(getFileIcon('test.css', false, false)).toEqual({ type: 'emoji', content: '🎨' })
      expect(getFileIcon('test.png', false, false)).toEqual({ type: 'emoji', content: '🖼️' })
      expect(getFileIcon('test.txt', false, false)).toEqual({ type: 'emoji', content: '📝' })
      expect(getFileIcon('test.md', false, false)).toEqual({ type: 'emoji', content: '📝' })
      expect(getFileIcon('test.mod', false, false)).toEqual({ type: 'emoji', content: '⚙️' })
    })

    it('应该为未知文件类型返回默认图标', () => {
      expect(getFileIcon('test.unknown', false, false)).toEqual({ type: 'emoji', content: '📄' })
      expect(getFileIcon('test', false, false)).toEqual({ type: 'emoji', content: '📄' })
    })

    it('应该正确处理文件扩展名的大小写', () => {
      expect(getFileIcon('test.JSON', false, false)).toEqual({ type: 'emoji', content: '📄' })
      expect(getFileIcon('test.JS', false, false)).toEqual({ type: 'emoji', content: '📜' })
      expect(getFileIcon('test.VUE', false, false)).toEqual({ type: 'emoji', content: '💚' })
    })
  })

  describe('图标集数据', () => {
    it('应该包含所有预定义的图标集', () => {
      expect(iconSets).toHaveLength(4)
      expect(iconSets.map(set => set.id)).toEqual(['emoji', 'material', 'vscode', 'minimal'])
    })

    it('每个图标集应该包含必要的图标类型', () => {
      iconSets.forEach(iconSet => {
        expect(iconSet.icons).toHaveProperty('folder')
        expect(iconSet.icons.folder).toHaveProperty('closed')
        expect(iconSet.icons.folder).toHaveProperty('open')
        expect(iconSet.icons).toHaveProperty('files')
        expect(iconSet.icons.files).toHaveProperty('default')
      })
    })

    it('emoji图标集应该包含预期的文件类型图标', () => {
      const emojiSet = iconSets.find(set => set.id === 'emoji')
      expect(emojiSet).toBeDefined()
      expect(emojiSet!.icons.files.json).toBe('📄')
      expect(emojiSet!.icons.files.vue).toBe('💚')
      expect(emojiSet!.icons.files.css).toBe('🎨')
    })

    it('material图标集应该包含预期的文件类型图标', () => {
      const materialSet = iconSets.find(set => set.id === 'material')
      expect(materialSet).toBeDefined()
      expect(materialSet!.icons.files.json).toBe('/icon/iconSystem/material/json.svg')
      expect(materialSet!.icons.files.vue).toBe('/icon/iconSystem/material/vue.svg')
      expect(materialSet!.icons.files.css).toBe('/icon/iconSystem/material/css.svg')
    })

    it('vscode图标集应该包含预期的文件类型图标', () => {
      const vscodeSet = iconSets.find(set => set.id === 'vscode')
      expect(vscodeSet).toBeDefined()
      expect(vscodeSet!.icons.files.json).toBe('/icon/iconSystem/vscode/json.svg')
      expect(vscodeSet!.icons.files.vue).toBe('/icon/iconSystem/vscode/vue.svg')
      expect(vscodeSet!.icons.files.css).toBe('/icon/iconSystem/vscode/css.svg')
    })

    it('minimal图标集应该包含预期的文件类型图标', () => {
      const minimalSet = iconSets.find(set => set.id === 'minimal')
      expect(minimalSet).toBeDefined()
      expect(minimalSet!.icons.files.json).toBe('◻')
      expect(minimalSet!.icons.files.vue).toBe('●')
      expect(minimalSet!.icons.files.css).toBe('▲')
    })
  })
})