/**
 * Settings.vue 组件的全面单元测试
 * 测试覆盖组件渲染、用户交互、状态管理和边界情况
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Settings from '@/views/Settings.vue'
import * as tauriApi from '@/api/tauri'

// Mock 所有子组件
vi.mock('@/components/settings/SettingsSidebar.vue', () => ({
  default: {
    name: 'SettingsSidebar',
    template: '<div class="settings-sidebar-content"><slot></slot></div>',
    props: ['activeItem'],
    emits: ['item-click']
  }
}))

vi.mock('@/components/settings/SettingsCard.vue', () => ({
  default: {
    name: 'SettingsCard',
    template: '<div class="settings-card"><slot></slot></div>',
    props: ['title', 'description']
  }
}))

vi.mock('@/components/settings/GameDirectorySettings.vue', () => ({
  default: {
    name: 'GameDirectorySettings',
    template: '<div class="game-directory-settings">游戏目录设置</div>',
    props: ['modelValue'],
    emits: ['update:modelValue', 'status-message']
  }
}))

vi.mock('@/components/settings/GameLaunchSettings.vue', () => ({
  default: {
    name: 'GameLaunchSettings',
    template: '<div class="game-launch-settings">游戏启动设置</div>',
    props: ['useSteamVersion', 'usePirateVersion', 'pirateExecutable', 'launchWithDebug'],
    emits: ['update:useSteamVersion', 'update:usePirateVersion', 'update:pirateExecutable', 'update:launchWithDebug', 'save']
  }
}))

vi.mock('@/components/settings/EditorFontSettings.vue', () => ({
  default: {
    name: 'EditorFontSettings',
    template: '<div class="editor-font-settings">编辑器字体设置</div>',
    emits: ['save']
  }
}))

vi.mock('@/components/settings/EditorSaveSettings.vue', () => ({
  default: {
    name: 'EditorSaveSettings',
    template: '<div class="editor-save-settings">保存设置</div>',
    props: ['autoSave', 'disableErrorHandling', 'enableRGBColorDisplay'],
    emits: ['update:autoSave', 'update:disableErrorHandling', 'update:enableRGBColorDisplay', 'save', 'confirm-disable-error-handling']
  }
}))

vi.mock('@/components/settings/ThemeSettings.vue', () => ({
  default: {
    name: 'ThemeSettings',
    template: '<div class="theme-settings">主题设置</div>'
  }
}))

vi.mock('@/components/settings/IconSettings.vue', () => ({
  default: {
    name: 'IconSettings',
    template: '<div class="icon-settings">图标设置</div>'
  }
}))

vi.mock('@/components/settings/UpdateSettings.vue', () => ({
  default: {
    name: 'UpdateSettings',
    template: '<div class="update-settings">更新设置</div>',
    props: ['checkForUpdatesOnStartup'],
    emits: ['update:checkForUpdatesOnStartup', 'save']
  }
}))

vi.mock('@/components/settings/VersionInfoSettings.vue', () => ({
  default: {
    name: 'VersionInfoSettings',
    template: '<div class="version-info-settings">版本信息</div>',
    props: ['currentVersion', 'githubVersion', 'isCheckingUpdate'],
    emits: ['update:githubVersion', 'update:isCheckingUpdate', 'status-message', 'show-update-dialog']
  }
}))

vi.mock('@/components/settings/AISettings.vue', () => ({
  default: {
    name: 'AISettings',
    template: '<div class="ai-settings">AI设置</div>',
    props: ['openaiApiKey', 'openaiBaseUrl', 'openaiModel', 'aiRenderMarkdown', 'aiRequestReasoning', 'aiRule', 'aiAgentMode'],
    emits: ['update:openaiApiKey', 'update:openaiBaseUrl', 'update:openaiModel', 'update:aiRenderMarkdown', 'update:aiRequestReasoning', 'update:aiRule', 'update:aiAgentMode', 'save']
  }
}))

// Mock composables
vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({
    currentThemeId: { value: 'default' },
    themes: { value: [
      { id: 'default', name: '默认主题' },
      { id: 'dark', name: '暗色主题' }
    ] }
  }),
  themes: [
    { id: 'default', name: '默认主题' },
    { id: 'dark', name: '暗色主题' }
  ]
}))

vi.mock('@/composables/useFileTreeIcons', () => ({
  useFileTreeIcons: () => ({
    currentIconSetId: { value: 'default' }
  }),
  iconSets: [
    { id: 'default', name: '默认图标' },
    { id: 'colorful', name: '彩色图标' }
  ]
}))

const mockSetFontConfig = vi.fn()
vi.mock('@/composables/useEditorFont', () => ({
  useEditorFont: () => ({
    fontConfig: { value: { family: 'Consolas', size: 14, weight: '400' } },
    setFontConfig: mockSetFontConfig
  }),
  __esModule: true,
  default: () => ({
    fontConfig: { value: { family: 'Consolas', size: 14, weight: '400' } },
    setFontConfig: mockSetFontConfig
  })
}))

// Mock settings menu
vi.mock('@/data/settingsMenu', () => ({
  getDefaultMenuItem: () => 'game-directory',
  settingsMenuData: [
    {
      title: '游戏设置',
      items: [
        { id: 'game-directory', title: '游戏目录', description: '选择游戏目录' },
        { id: 'game-launch', title: '游戏启动', description: '配置启动方式' }
      ]
    }
  ]
}))

// Mock router
const mockRouterPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush
  }),
  useRoute: () => ({
    path: '/',
    params: {},
    query: {},
  }),
}))

describe('Settings.vue', () => {
  let wrapper: any
  let mockLoadSettings: any
  let mockSaveSettings: any

  beforeEach(() => {
    // 清理之前的 mock 调用
    mockSetFontConfig.mockClear()
    mockRouterPush.mockClear()

    // Mock Tauri API
    mockLoadSettings = vi.fn().mockResolvedValue({
      success: true,
      data: {
        gameDirectory: 'C:/Games/HOI4',
        checkForUpdates: true,
        useSteamVersion: true,
        usePirateVersion: false,
        pirateExecutable: 'dowser',
        launchWithDebug: false,
        autoSave: true,
        disableErrorHandling: false,
        enableRGBColorDisplay: true,
        theme: 'default',
        iconSet: 'default',
        editorFont: { family: 'Consolas', size: 14, weight: '400' },
        openaiApiKey: '',
        openaiBaseUrl: 'https://api.openai.com',
        openaiModel: 'gpt-4o-mini',
        aiRenderMarkdown: false,
        aiRequestReasoning: false,
        aiRule: '',
        aiAgentMode: 'plan'
      }
    })
    mockSaveSettings = vi.fn().mockResolvedValue({ success: true })

    vi.mocked(tauriApi.loadSettings).mockImplementation(mockLoadSettings)
    vi.mocked(tauriApi.saveSettings).mockImplementation(mockSaveSettings)
    vi.mocked(tauriApi.openUrl).mockResolvedValue(undefined)

    wrapper = mount(Settings, {
      global: {
        stubs: {
          SettingsSidebar: true,
          SettingsCard: true,
          GameDirectorySettings: true,
          GameLaunchSettings: true,
          RecentProjectsSettings: true,
          EditorFontSettings: true,
          EditorSaveSettings: true,
          ThemeSettings: true,
          IconSettings: true,
          UpdateSettings: true,
          VersionInfoSettings: true,
          AISettings: true
        }
      }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
  })

  // ==================== 组件渲染测试 ====================

  describe('组件渲染', () => {
    it('应该正确渲染设置容器', () => {
      expect(wrapper.find('.settings-container').exists()).toBe(true)
    })

    it('应该渲染左侧侧边栏', () => {
      expect(wrapper.find('.settings-sidebar').exists()).toBe(true)
    })

    it('应该渲染右侧主内容区', () => {
      expect(wrapper.find('.settings-main').exists()).toBe(true)
    })

    it('应该渲染顶部返回按钮', () => {
      const backButton = wrapper.find('.settings-header button')
      expect(backButton.exists()).toBe(true)
      expect(backButton.text()).toContain('返回')
    })

    it('应该渲染设置标题', () => {
      const title = wrapper.find('.settings-header h1')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('设置')
    })

    it('应该渲染设置内容区域', () => {
      expect(wrapper.find('.settings-content').exists()).toBe(true)
      expect(wrapper.find('.settings-content-inner').exists()).toBe(true)
    })

    it('应该根据活动菜单项显示对应的设置卡片', async () => {
      expect(wrapper.vm.activeMenuItem).toBe('game-directory')

      await wrapper.vm.handleMenuItemClick('theme')
      await nextTick()

      expect(wrapper.vm.activeMenuItem).toBe('theme')
    })

    it('应该渲染状态提示组件', async () => {
      wrapper.vm.showStatus = true
      wrapper.vm.statusMessage = '测试消息'
      await nextTick()

      const statusElement = wrapper.find('.fixed.bottom-\\[2vh\\].right-\\[2vw\\]')
      expect(statusElement.exists()).toBe(true)
      expect(statusElement.text()).toContain('测试消息')
    })

    it('应该渲染更新对话框', async () => {
      wrapper.vm.showUpdateDialog = true
      wrapper.vm.updateInfo = {
        version: 'v0.3.0',
        url: 'https://github.com/example/releases',
        releaseNotes: '更新内容'
      }
      await nextTick()

      const dialog = wrapper.find('.fixed.inset-0.bg-black.bg-opacity-50')
      expect(dialog.exists()).toBe(true)
      expect(dialog.text()).toContain('发现新版本')
    })

    it('应该渲染确认对话框', async () => {
      wrapper.vm.showConfirmDialog = true
      await nextTick()

      const dialogs = wrapper.findAll('.fixed.inset-0.bg-black.bg-opacity-50')
      expect(dialogs.length).toBeGreaterThan(0)
    })
  })

  // ==================== 用户交互测试 ====================

  describe('用户交互', () => {
    it('应该在点击菜单项时切换活动菜单', async () => {
      expect(wrapper.vm.activeMenuItem).toBe('game-directory')

      await wrapper.vm.handleMenuItemClick('theme')
      expect(wrapper.vm.activeMenuItem).toBe('theme')

      await wrapper.vm.handleMenuItemClick('icons')
      expect(wrapper.vm.activeMenuItem).toBe('icons')
    })

    it('应该在点击返回按钮时保存设置并返回', async () => {
      const backButton = wrapper.find('.settings-header button')
      await backButton.trigger('click')

      expect(mockSaveSettings).toHaveBeenCalled()
      expect(mockRouterPush).toHaveBeenCalledWith('/')
    })

    it('应该在确认对话框点击确定时禁用错误处理', async () => {
      wrapper.vm.isInitializing = false
      wrapper.vm.disableErrorHandling = false
      wrapper.vm.pendingDisableErrorHandling = false
      wrapper.vm.showConfirmDialog = false

      // 模拟用户点击启用错误处理（关闭错误处理功能）
      wrapper.vm.disableErrorHandling = true
      await nextTick()

      // 验证确认对话框已显示
      expect(wrapper.vm.showConfirmDialog).toBe(true)
      expect(wrapper.vm.pendingDisableErrorHandling).toBe(true)

      // 模拟用户点击确认
      await wrapper.vm.confirmDisableErrorHandling()
      await nextTick()

      expect(wrapper.vm.disableErrorHandling).toBe(true)
      expect(wrapper.vm.pendingDisableErrorHandling).toBe(false)
      expect(wrapper.vm.showConfirmDialog).toBe(false)
      expect(mockSaveSettings).toHaveBeenCalled()
    })

    it('应该在确认对话框点击取消时保持错误处理启用', async () => {
      wrapper.vm.disableErrorHandling = true
      wrapper.vm.showConfirmDialog = true
      wrapper.vm.pendingDisableErrorHandling = true
      await nextTick()

      await wrapper.vm.cancelDisableErrorHandling()

      expect(wrapper.vm.disableErrorHandling).toBe(false)
      expect(wrapper.vm.showConfirmDialog).toBe(false)
      expect(wrapper.vm.pendingDisableErrorHandling).toBe(false)
    })

    it('应该能关闭更新对话框', async () => {
      wrapper.vm.showUpdateDialog = true
      await nextTick()

      await wrapper.vm.closeUpdateDialog()

      expect(wrapper.vm.showUpdateDialog).toBe(false)
    })

    it('应该能打开更新页面', async () => {
      wrapper.vm.updateInfo = {
        version: 'v0.3.0',
        url: 'https://github.com/example/releases'
      }
      wrapper.vm.showUpdateDialog = true

      await wrapper.vm.openUpdatePage()

      expect(tauriApi.openUrl).toHaveBeenCalledWith('https://github.com/example/releases')
      expect(wrapper.vm.showUpdateDialog).toBe(false)
    })

    it('应该能显示状态消息', async () => {
      wrapper.vm.displayStatus('测试消息', 1000)

      expect(wrapper.vm.statusMessage).toBe('测试消息')
      expect(wrapper.vm.showStatus).toBe(true)

      await new Promise(resolve => setTimeout(resolve, 1100))

      expect(wrapper.vm.showStatus).toBe(false)
    })
  })

  // ==================== 状态管理测试 ====================

  describe('状态管理', () => {
    it('应该在组件挂载时加载用户设置', async () => {
      expect(mockLoadSettings).toHaveBeenCalled()
    })

    it('应该正确加载游戏目录设置', async () => {
      await wrapper.vm.loadUserSettings()

      expect(wrapper.vm.gameDirectory).toBe('C:/Games/HOI4')
    })

    it('应该正确加载更新检查设置', async () => {
      await wrapper.vm.loadUserSettings()

      expect(wrapper.vm.checkForUpdatesOnStartup).toBe(true)
    })

    it('应该正确加载游戏启动设置', async () => {
      await wrapper.vm.loadUserSettings()

      expect(wrapper.vm.useSteamVersion).toBe(true)
      expect(wrapper.vm.usePirateVersion).toBe(false)
      expect(wrapper.vm.pirateExecutable).toBe('dowser')
      expect(wrapper.vm.launchWithDebug).toBe(false)
    })

    it('应该正确加载编辑器保存设置', async () => {
      await wrapper.vm.loadUserSettings()

      expect(wrapper.vm.autoSave).toBe(true)
      expect(wrapper.vm.disableErrorHandling).toBe(false)
      expect(wrapper.vm.enableRGBColorDisplay).toBe(true)
    })

    it('应该正确加载AI设置', async () => {
      await wrapper.vm.loadUserSettings()

      expect(wrapper.vm.openaiApiKey).toBe('')
      expect(wrapper.vm.openaiBaseUrl).toBe('https://api.openai.com')
      expect(wrapper.vm.openaiModel).toBe('gpt-4o-mini')
      expect(wrapper.vm.aiRenderMarkdown).toBe(false)
      expect(wrapper.vm.aiRequestReasoning).toBe(false)
      expect(wrapper.vm.aiRule).toBe('')
      expect(wrapper.vm.aiAgentMode).toBe('plan')
    })

    it('应该正确保存所有设置', async () => {
      await wrapper.vm.handleSave()

      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          gameDirectory: 'C:/Games/HOI4',
          checkForUpdates: true,
          useSteamVersion: true,
          usePirateVersion: false,
          pirateExecutable: 'dowser',
          launchWithDebug: false,
          autoSave: true,
          disableErrorHandling: false,
          enableRGBColorDisplay: true,
          theme: 'default',
          iconSet: 'default',
          editorFont: { family: 'Consolas', size: 14, weight: '400' },
          openaiApiKey: '',
          openaiBaseUrl: 'https://api.openai.com',
          openaiModel: 'gpt-4o-mini',
          aiRenderMarkdown: false,
          aiRequestReasoning: false,
          aiRule: '',
          aiAgentMode: 'plan'
        })
      )
    })

    it('应该在保存失败时显示错误消息', async () => {
      mockSaveSettings.mockResolvedValue({
        success: false,
        message: '保存失败'
      })

      await wrapper.vm.handleSave()

      expect(wrapper.vm.statusMessage).toBe('保存失败: 保存失败')
      expect(wrapper.vm.showStatus).toBe(true)
    })

    it('应该在保存成功时不显示消息', async () => {
      await wrapper.vm.handleSave()

      expect(wrapper.vm.showStatus).toBe(false)
    })

    it('应该在自动保存开关变化时自动保存', async () => {
      wrapper.vm.autoSave = false
      await nextTick()

      expect(mockSaveSettings).toHaveBeenCalled()
    })

    it('应该正确处理更新信息', async () => {
      const updateInfo = {
        version: 'v0.3.0',
        url: 'https://github.com/example/releases',
        releaseNotes: '新功能：\n- 功能1\n- 功能2'
      }

      await wrapper.vm.handleShowUpdateDialog(updateInfo)

      expect(wrapper.vm.updateInfo).toEqual(updateInfo)
      expect(wrapper.vm.showUpdateDialog).toBe(true)
    })

    it('应该正确渲染更新说明的HTML', () => {
      wrapper.vm.updateInfo = {
        version: 'v0.3.0',
        url: 'https://github.com/example/releases',
        releaseNotes: '## 标题\n内容'
      }

      const html = wrapper.vm.updateNotesHtml()

      expect(html).toContain('<h2>标题</h2>')
      expect(html).toContain('<p>内容</p>')
    })

    it('应该在更新说明为空时返回空字符串', () => {
      wrapper.vm.updateInfo = {
        version: 'v0.3.0',
        url: 'https://github.com/example/releases',
        releaseNotes: ''
      }

      const html = wrapper.vm.updateNotesHtml()

      expect(html).toBe('')
    })
  })

  // ==================== 边界情况测试 ====================

  describe('边界情况', () => {
    it('应该在加载设置失败时使用默认值', async () => {
      mockLoadSettings.mockResolvedValue({ success: false })
      vi.mocked(tauriApi.loadSettings).mockImplementation(mockLoadSettings)

      await wrapper.vm.loadUserSettings()

      expect(wrapper.vm.gameDirectory).toBe('C:/Games/HOI4')
      expect(wrapper.vm.checkForUpdatesOnStartup).toBe(true)
      expect(wrapper.vm.autoSave).toBe(true)
    })

    it('应该在加载数据为空时使用默认值', async () => {
      mockLoadSettings.mockResolvedValue({
        success: true,
        data: null
      })
      vi.mocked(tauriApi.loadSettings).mockImplementation(mockLoadSettings)

      await wrapper.vm.loadUserSettings()

      expect(wrapper.vm.gameDirectory).toBe('C:/Games/HOI4')
      expect(wrapper.vm.checkForUpdatesOnStartup).toBe(true)
      expect(wrapper.vm.autoSave).toBe(true)
    })

    it('应该在设置数据缺失字段时使用默认值', async () => {
      mockLoadSettings.mockResolvedValue({
        success: true,
        data: {}
      })
      vi.mocked(tauriApi.loadSettings).mockImplementation(mockLoadSettings)

      await wrapper.vm.loadUserSettings()

      expect(wrapper.vm.gameDirectory).toBe('')
      expect(wrapper.vm.checkForUpdatesOnStartup).toBe(true)
      expect(wrapper.vm.autoSave).toBe(true)
      expect(wrapper.vm.disableErrorHandling).toBe(false)
    })

    it('应该在初始化时不触发错误处理开关的watch', async () => {
      const saveSpy = vi.spyOn(wrapper.vm, 'handleSave')

      wrapper.vm.isInitializing = true
      wrapper.vm.disableErrorHandling = true
      await nextTick()

      expect(saveSpy).not.toHaveBeenCalled()
    })

    it('应该在错误处理开关从undefined变化时不触发确认', async () => {
      wrapper.vm.isInitializing = false
      wrapper.vm.pendingDisableErrorHandling = false

      await wrapper.vm.$options.watch?.disableErrorHandling?.handler?.call(wrapper.vm, false, undefined)

      expect(wrapper.vm.showConfirmDialog).toBe(false)
    })

    it('应该在尝试启用禁用错误处理时显示确认对话框', async () => {
      wrapper.vm.isInitializing = false
      wrapper.vm.pendingDisableErrorHandling = false
      wrapper.vm.disableErrorHandling = false

      wrapper.vm.disableErrorHandling = true
      await nextTick()

      expect(wrapper.vm.showConfirmDialog).toBe(true)
      expect(wrapper.vm.pendingDisableErrorHandling).toBe(true)
    })

    it('应该在取消禁用错误处理后恢复原值', async () => {
      wrapper.vm.disableErrorHandling = true
      wrapper.vm.showConfirmDialog = true
      wrapper.vm.pendingDisableErrorHandling = true

      await wrapper.vm.cancelDisableErrorHandling()

      expect(wrapper.vm.disableErrorHandling).toBe(false)
    })

    it('应该在pendingDisableErrorHandling为true时不重复触发确认', async () => {
      wrapper.vm.isInitializing = false
      wrapper.vm.pendingDisableErrorHandling = true

      await wrapper.vm.$options.watch?.disableErrorHandling?.handler?.call(wrapper.vm, true, false)

      expect(wrapper.vm.showConfirmDialog).toBe(false)
    })

    it('应该正确处理旧格式的字体设置', async () => {
      mockLoadSettings.mockResolvedValue({
        success: true,
        data: {
          editorFontFamily: 'Courier New',
          editorFontSize: 16,
          editorFontWeight: '700'
        }
      })
      vi.mocked(tauriApi.loadSettings).mockImplementation(mockLoadSettings)

      await wrapper.vm.loadUserSettings()

      expect(mockSetFontConfig).toHaveBeenCalledWith({
        family: 'Courier New',
        size: 16,
        weight: '700'
      })
    })

    it('应该正确处理新格式的字体设置', async () => {
      mockLoadSettings.mockResolvedValue({
        success: true,
        data: {
          editorFont: {
            family: 'Monaco',
            size: 18,
            weight: '500'
          }
        }
      })
      vi.mocked(tauriApi.loadSettings).mockImplementation(mockLoadSettings)

      await wrapper.vm.loadUserSettings()

      expect(mockSetFontConfig).toHaveBeenCalledWith({
        family: 'Monaco',
        size: 18,
        weight: '500'
      })
    })

    it('应该验证主题ID是否有效', async () => {
      mockLoadSettings.mockResolvedValue({
        success: true,
        data: {
          theme: 'invalid-theme'
        }
      })
      vi.mocked(tauriApi.loadSettings).mockImplementation(mockLoadSettings)

      await wrapper.vm.loadUserSettings()

      const { useTheme } = await import('@/composables/useTheme')
      expect(useTheme().currentThemeId.value).not.toBe('invalid-theme')
    })

    it('应该验证图标集ID是否有效', async () => {
      mockLoadSettings.mockResolvedValue({
        success: true,
        data: {
          iconSet: 'invalid-iconset'
        }
      })
      vi.mocked(tauriApi.loadSettings).mockImplementation(mockLoadSettings)

      await wrapper.vm.loadUserSettings()

      const { useFileTreeIcons } = await import('@/composables/useFileTreeIcons')
      expect(useFileTreeIcons().currentIconSetId.value).not.toBe('invalid-iconset')
    })

    it('应该正确处理AI设置的旧格式', async () => {
      mockLoadSettings.mockResolvedValue({
        success: true,
        data: {
          aiSystemPrompt: '旧的系统提示词'
        }
      })
      vi.mocked(tauriApi.loadSettings).mockImplementation(mockLoadSettings)

      await wrapper.vm.loadUserSettings()

      expect(wrapper.vm.aiRule).toBe('旧的系统提示词')
    })

    it('应该在版本信息为null时不显示更新说明', () => {
      wrapper.vm.updateInfo = null

      const html = wrapper.vm.updateNotesHtml()

      expect(html).toBe('')
    })

    it('应该在更新说明只有空白字符时返回空字符串', () => {
      wrapper.vm.updateInfo = {
        version: 'v0.3.0',
        url: 'https://github.com/example/releases',
        releaseNotes: '   '
      }

      const html = wrapper.vm.updateNotesHtml()

      expect(html).toBe('')
    })

    it('应该在保存时正确处理所有AI设置', async () => {
      wrapper.vm.openaiApiKey = 'test-key'
      wrapper.vm.openaiBaseUrl = 'https://custom.api.com'
      wrapper.vm.openaiModel = 'gpt-4'
      wrapper.vm.aiRenderMarkdown = true
      wrapper.vm.aiRequestReasoning = true
      wrapper.vm.aiRule = '测试规则'
      wrapper.vm.aiAgentMode = 'code'

      await wrapper.vm.handleSave()

      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          openaiApiKey: 'test-key',
          openaiBaseUrl: 'https://custom.api.com',
          openaiModel: 'gpt-4',
          aiRenderMarkdown: true,
          aiRequestReasoning: true,
          aiRule: '测试规则',
          aiAgentMode: 'code'
        })
      )
    })

    it('应该正确处理不同的海盗版可执行文件选项', async () => {
      const executables = ['dowser', 'hoi4'] as const

      for (const executable of executables) {
        mockLoadSettings.mockResolvedValue({
          success: true,
          data: { pirateExecutable: executable }
        })
        vi.mocked(tauriApi.loadSettings).mockImplementation(mockLoadSettings)

        await wrapper.vm.loadUserSettings()

        expect(wrapper.vm.pirateExecutable).toBe(executable)
      }
    })

    it('应该正确处理不同的AI代理模式选项', async () => {
      const modes = ['plan', 'code', 'ask'] as const

      for (const mode of modes) {
        mockLoadSettings.mockResolvedValue({
          success: true,
          data: { aiAgentMode: mode }
        })
        vi.mocked(tauriApi.loadSettings).mockImplementation(mockLoadSettings)

        await wrapper.vm.loadUserSettings()

        expect(wrapper.vm.aiAgentMode).toBe(mode)
      }
    })

    it('应该在状态消息显示后自动隐藏', async () => {
      wrapper.vm.displayStatus('测试消息', 100)

      expect(wrapper.vm.showStatus).toBe(true)

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(wrapper.vm.showStatus).toBe(false)
    })

    it('应该在保存失败时保持isSaving为false', async () => {
      mockSaveSettings.mockResolvedValue({
        success: false,
        message: '保存失败'
      })

      await wrapper.vm.handleSave()

      expect(wrapper.vm.isSaving).toBe(false)
    })

    it('应该在保存成功时保持isSaving为false', async () => {
      await wrapper.vm.handleSave()

      expect(wrapper.vm.isSaving).toBe(false)
    })

    it('应该在保存过程中设置isSaving为true', async () => {
      let resolveSave: any
      mockSaveSettings.mockImplementation(() => new Promise(resolve => {
        resolveSave = resolve
      }))

      const savePromise = wrapper.vm.handleSave()

      expect(wrapper.vm.isSaving).toBe(true)

      resolveSave({ success: true })
      await savePromise

      expect(wrapper.vm.isSaving).toBe(false)
    })
  })

  // ==================== 集成测试 ====================

  describe('集成测试', () => {
    it('应该完整执行加载、修改和保存流程', async () => {
      await wrapper.vm.loadUserSettings()

      wrapper.vm.gameDirectory = 'D:/Games/HOI4'
      wrapper.vm.autoSave = false
      wrapper.vm.enableRGBColorDisplay = false

      await wrapper.vm.handleSave()

      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          gameDirectory: 'D:/Games/HOI4',
          autoSave: false,
          enableRGBColorDisplay: false
        })
      )
    })

    it('应该完整执行错误处理禁用确认流程', async () => {
      wrapper.vm.isInitializing = false
      wrapper.vm.disableErrorHandling = false

      wrapper.vm.disableErrorHandling = true
      await nextTick()

      expect(wrapper.vm.showConfirmDialog).toBe(true)

      await wrapper.vm.confirmDisableErrorHandling()

      expect(wrapper.vm.disableErrorHandling).toBe(true)
      expect(mockSaveSettings).toHaveBeenCalled()
    })

    it('应该完整执行更新发现和查看流程', async () => {
      const updateInfo = {
        version: 'v0.3.0',
        url: 'https://github.com/example/releases',
        releaseNotes: '新版本发布'
      }

      await wrapper.vm.handleShowUpdateDialog(updateInfo)

      expect(wrapper.vm.showUpdateDialog).toBe(true)

      await wrapper.vm.openUpdatePage()

      expect(tauriApi.openUrl).toHaveBeenCalledWith(updateInfo.url)
      expect(wrapper.vm.showUpdateDialog).toBe(false)
    })

    it('应该完整执行菜单切换和返回流程', async () => {
      await wrapper.vm.handleMenuItemClick('theme')
      expect(wrapper.vm.activeMenuItem).toBe('theme')

      await wrapper.vm.handleMenuItemClick('icons')
      expect(wrapper.vm.activeMenuItem).toBe('icons')

      const backButton = wrapper.find('.settings-header button')
      await backButton.trigger('click')

      expect(mockSaveSettings).toHaveBeenCalled()
      expect(mockRouterPush).toHaveBeenCalledWith('/')
    })
  })
})
