import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import GameDirectorySettings from '../../../components/settings/GameDirectorySettings.vue'

// Mock Tauri API functions that are not already mocked in setup.ts
vi.mock('../../../api/tauri', async (importOriginal) => {
  const original = (await importOriginal()) as any
  return {
    ...original,
    openFileDialog: vi.fn(),
    validateGameDirectory: vi.fn(),
  }
})

import { openFileDialog, validateGameDirectory } from '../../../api/tauri'

describe('GameDirectorySettings.vue', () => {
  const mockOpenFileDialog = openFileDialog as import('vitest').MockedFunction<typeof openFileDialog>
  const mockValidateGameDirectory = validateGameDirectory as import('vitest').MockedFunction<typeof validateGameDirectory>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display the provided modelValue', () => {
    const initialPath = 'C:/Program Files (x86)/Steam/steamapps/common/Hearts of Iron IV'
    const wrapper = mount(GameDirectorySettings, {
      props: {
        modelValue: initialPath
      }
    })

    const input = wrapper.find('input')
    expect(input.element.value).toBe(initialPath)
  })

  it('should update internally when modelValue prop changes', async () => {
    const wrapper = mount(GameDirectorySettings, {
      props: {
        modelValue: ''
      }
    })

    const newPath = 'C:/Games/Hearts of Iron IV'
    await wrapper.setProps({ modelValue: newPath })
    
    const input = wrapper.find('input')
    expect(input.element.value).toBe(newPath)
  })

  it('should call openFileDialog when browse button is clicked', async () => {
    const wrapper = mount(GameDirectorySettings, {
      props: {
        modelValue: ''
      }
    })

    mockOpenFileDialog.mockResolvedValue({ success: false })
    
    const browseButton = wrapper.find('button.btn-primary')
    await browseButton.trigger('click')
    
    expect(mockOpenFileDialog).toHaveBeenCalledWith('directory')
  })

  it('should update modelValue and emit events when valid directory is selected', async () => {
    const selectedPath = 'C:/Valid/HOI4/Path'
    mockOpenFileDialog.mockResolvedValue({ success: true, path: selectedPath })
    mockValidateGameDirectory.mockResolvedValue({ valid: true, message: 'Valid game directory' })
    
    const wrapper = mount(GameDirectorySettings, {
      props: {
        modelValue: ''
      }
    })

    const browseButton = wrapper.find('button.btn-primary')
    await browseButton.trigger('click')
    
    // Check that validateGameDirectory was called
    expect(mockValidateGameDirectory).toHaveBeenCalledWith(selectedPath)
    
    // Check that modelValue was updated
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([selectedPath])
    
    // Check that events were emitted
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([selectedPath])
    
    expect(wrapper.emitted('status-message')).toHaveLength(1)
    expect(wrapper.emitted('status-message')?.[0]).toEqual(['游戏目录验证成功'])
  })

  it('should emit error message when invalid directory is selected', async () => {
    const selectedPath = 'C:/Invalid/Path'
    const errorMessage = '未找到游戏文件'
    
    mockOpenFileDialog.mockResolvedValue({ success: true, path: selectedPath })
    mockValidateGameDirectory.mockResolvedValue({ valid: false, message: errorMessage })
    
    const wrapper = mount(GameDirectorySettings, {
      props: {
        modelValue: ''
      }
    })

    const browseButton = wrapper.find('button.btn-primary')
    await browseButton.trigger('click')
    
    // Check that validateGameDirectory was called
    expect(mockValidateGameDirectory).toHaveBeenCalledWith(selectedPath)
    
    // Check that status-message event was emitted with error
    expect(wrapper.emitted('status-message')).toHaveLength(1)
    expect(wrapper.emitted('status-message')?.[0]).toEqual([`无效的游戏目录: ${errorMessage}`])
    
    // Check that update:modelValue event was not emitted
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('should show clear button when directory is set', () => {
    const wrapper = mount(GameDirectorySettings, {
      props: {
        modelValue: 'C:/Some/Path'
      }
    })

    const clearButton = wrapper.find('button[title="清除游戏目录"]')
    expect(clearButton.exists()).toBe(true)
  })

  it('should hide clear button when directory is not set', () => {
    const wrapper = mount(GameDirectorySettings, {
      props: {
        modelValue: ''
      }
    })

    const clearButton = wrapper.find('button[title="清除游戏目录"]')
    expect(clearButton.exists()).toBe(false)
  })

  it('should clear directory when clear button is clicked', async () => {
    const initialPath = 'C:/Some/Path'
    const wrapper = mount(GameDirectorySettings, {
      props: {
        modelValue: initialPath
      }
    })

    const clearButton = wrapper.find('button[title="清除游戏目录"]')
    await clearButton.trigger('click')
    
    // Check that modelValue was updated to empty string
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])
    
    // Check that events were emitted
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([''])
    
    expect(wrapper.emitted('status-message')).toHaveLength(1)
    expect(wrapper.emitted('status-message')?.[0]).toEqual(['游戏目录已清除'])
  })

  it('should not update when file dialog is cancelled', async () => {
    mockOpenFileDialog.mockResolvedValue({ success: false })
    
    const wrapper = mount(GameDirectorySettings, {
      props: {
        modelValue: ''
      }
    })

    const browseButton = wrapper.find('button.btn-primary')
    await browseButton.trigger('click')
    
    // Check that validateGameDirectory was not called
    expect(mockValidateGameDirectory).not.toHaveBeenCalled()
    
    // Check that no events were emitted
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('status-message')).toBeUndefined()
  })
})
