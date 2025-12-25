import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CreateProject from '../../views/CreateProject.vue'

// Mock Tauri API
vi.mock('../../api/tauri', () => ({
  createNewProject: vi.fn(),
  openFileDialog: vi.fn(),
  loadSettings: vi.fn(),
  saveSettings: vi.fn()
}))

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn()
  }
}))

import {
  createNewProject,
  openFileDialog,
  loadSettings,
  saveSettings
} from '../../api/tauri'

// Mock vue-router
const mockRouterPush = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual as any,
    useRouter: () => ({
      push: mockRouterPush,
      go: vi.fn(),
      back: vi.fn(),
    }),
    useRoute: () => ({
      path: '/',
      params: {},
      query: {},
    }),
  }
})

describe('CreateProject.vue', () => {
  let wrapper: any

  /**
   * 在每个测试前重置所有 mock 并创建新的组件实例
   */
  beforeEach(async () => {
    vi.clearAllMocks()
    mockRouterPush.mockClear()
    
    wrapper = mount(CreateProject, {
      global: {
        stubs: {
          RouterLink: true
        }
      }
    })
  })

  /**
   * 在每个测试后清理组件
   */
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  // ==================== 组件渲染测试 ====================

  describe('组件渲染', () => {
    /**
     * 测试组件是否正确渲染
     */
    it('应该正确渲染组件结构', () => {
      expect(wrapper.find('.create-page').exists()).toBe(true)
      expect(wrapper.find('.create-header').exists()).toBe(true)
      expect(wrapper.find('.create-card').exists()).toBe(true)
    })

    /**
     * 测试标题是否正确显示
     */
    it('应该显示正确的标题', () => {
      const title = wrapper.find('h1')
      expect(title.text()).toBe('创建新项目')
    })

    /**
     * 测试副标题是否正确显示
     */
    it('应该显示正确的副标题', () => {
      const subtitle = wrapper.find('.text-onedark-comment')
      expect(subtitle.text()).toBe('创建新HOICS项目')
    })

    /**
     * 测试返回按钮是否存在
     */
    it('应该显示返回按钮', () => {
      const backButton = wrapper.find('.create-header button')
      expect(backButton.exists()).toBe(true)
      expect(backButton.text()).toContain('返回')
    })

    /**
     * 测试表单字段是否正确渲染
     */
    it('应该渲染所有表单字段', () => {
      expect(wrapper.find('#project-name').exists()).toBe(true)
      expect(wrapper.find('#project-version').exists()).toBe(true)
      expect(wrapper.find('input[readonly]').exists()).toBe(true)
    })

    /**
     * 测试 Replace Path 选项是否正确渲染
     */
    it('应该渲染所有 Replace Path 选项', () => {
      const checkboxes = wrapper.findAll('.replace-item')
      expect(checkboxes.length).toBe(6)
      
      const labels = checkboxes.map((item: any) => item.find('span').text())
      expect(labels).toContain('common')
      expect(labels).toContain('history/states')
      expect(labels).toContain('history/units')
      expect(labels).toContain('history/countries')
      expect(labels).toContain('events')
      expect(labels).toContain('music')
    })

    /**
     * 测试提交按钮是否正确渲染
     */
    it('应该渲染提交和取消按钮', () => {
      const buttons = wrapper.findAll('.action-bar button')
      expect(buttons.length).toBe(2)
      expect(buttons[0].text()).toBe('取消')
      expect(buttons[1].text()).toBe('创建项目')
    })

    /**
     * 测试字段标签是否正确显示
     */
    it('应该显示正确的字段标签', () => {
      const labels = wrapper.findAll('.field-label')
      const labelTexts = labels.map((label: any) => label.text())
      
      expect(labelTexts).toContain('项目名称 *')
      expect(labelTexts).toContain('版本 *')
      expect(labelTexts).toContain('项目路径 *')
      expect(labelTexts).toContain('Replace Path 目录替换')
    })

    /**
     * 测试字段提示信息是否正确显示
     */
    it('应该显示字段提示信息', () => {
      const tips = wrapper.findAll('.field-tip')
      expect(tips.length).toBeGreaterThan(0)
    })

    /**
     * 测试浏览按钮是否正确渲染
     */
    it('应该显示浏览按钮', () => {
      const browseButton = wrapper.findAll('.field button[type="button"]')[0]
      expect(browseButton.exists()).toBe(true)
      expect(browseButton.text()).toBe('浏览')
    })
  })

  // ==================== 数据绑定测试 ====================

  describe('数据绑定', () => {
    /**
     * 测试项目名称输入是否正确绑定
     */
    it('应该正确绑定项目名称输入', async () => {
      const input = wrapper.find('#project-name')
      await input.setValue('MyTestProject')
      expect(wrapper.vm.projectName).toBe('MyTestProject')
    })

    /**
     * 测试版本输入是否正确绑定
     */
    it('应该正确绑定版本输入', async () => {
      const input = wrapper.find('#project-version')
      await input.setValue('2.0.0')
      expect(wrapper.vm.version).toBe('2.0.0')
    })

    /**
     * 测试项目路径是否正确绑定
     */
    it('应该正确绑定项目路径', async () => {
      wrapper.vm.projectPath = '/test/path'
      await nextTick()
      const input = wrapper.find('input[readonly]')
      expect(input.element.value).toBe('/test/path')
    })

    /**
     * 测试 Replace Path 选项是否正确绑定
     */
    it('应该正确绑定 Replace Path 选项', async () => {
      const checkboxes = wrapper.findAll('.replace-item input[type="checkbox"]')
      
      await checkboxes[0].setValue(true)
      await nextTick()
      expect(wrapper.vm.selectedReplacePaths).toContain('common')
      
      await checkboxes[1].setValue(true)
      await nextTick()
      expect(wrapper.vm.selectedReplacePaths).toContain('history/states')
    })

    /**
     * 测试多个 Replace Path 选项的选择
     */
    it('应该支持选择多个 Replace Path 选项', async () => {
      const checkboxes = wrapper.findAll('.replace-item input[type="checkbox"]')
      
      await checkboxes[0].setValue(true)
      await checkboxes[2].setValue(true)
      await checkboxes[4].setValue(true)
      await nextTick()
      
      expect(wrapper.vm.selectedReplacePaths.length).toBe(3)
      expect(wrapper.vm.selectedReplacePaths).toContain('common')
      expect(wrapper.vm.selectedReplacePaths).toContain('history/units')
      expect(wrapper.vm.selectedReplacePaths).toContain('events')
    })

    /**
     * 测试取消选择 Replace Path 选项
     */
    it('应该支持取消选择 Replace Path 选项', async () => {
      const checkboxes = wrapper.findAll('.replace-item input[type="checkbox"]')
      
      await checkboxes[0].setValue(true)
      await nextTick()
      expect(wrapper.vm.selectedReplacePaths).toContain('common')
      
      await checkboxes[0].setValue(false)
      await nextTick()
      expect(wrapper.vm.selectedReplacePaths).not.toContain('common')
    })
  })

  // ==================== 表单验证测试 ====================

  describe('表单验证', () => {
    /**
     * 测试空项目名称时的验证
     */
    it('应该在项目名称为空时显示错误提示', async () => {
      wrapper.vm.projectName = ''
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      
      await wrapper.vm.handleSubmit()
      await nextTick()
      
      expect(wrapper.vm.showStatus).toBe(true)
      expect(wrapper.vm.statusMessage).toBe('请填写所有必填项')
    })

    /**
     * 测试空版本时的验证
     */
    it('应该在版本为空时显示错误提示', async () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = ''
      wrapper.vm.projectPath = '/test/path'
      
      await wrapper.vm.handleSubmit()
      await nextTick()
      
      expect(wrapper.vm.showStatus).toBe(true)
      expect(wrapper.vm.statusMessage).toBe('请填写所有必填项')
    })

    /**
     * 测试空项目路径时的验证
     */
    it('应该在项目路径为空时显示错误提示', async () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = ''
      
      await wrapper.vm.handleSubmit()
      await nextTick()
      
      expect(wrapper.vm.showStatus).toBe(true)
      expect(wrapper.vm.statusMessage).toBe('请填写所有必填项')
    })

    /**
     * 测试只有空格的项目名称时的验证
     */
    it('应该在项目名称只有空格时显示错误提示', async () => {
      wrapper.vm.projectName = '   '
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      
      await wrapper.vm.handleSubmit()
      await nextTick()
      
      expect(wrapper.vm.showStatus).toBe(true)
      expect(wrapper.vm.statusMessage).toBe('请填写所有必填项')
    })

    /**
     * 测试只有空格的版本时的验证
     */
    it('应该在版本只有空格时显示错误提示', async () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = '   '
      wrapper.vm.projectPath = '/test/path'
      
      await wrapper.vm.handleSubmit()
      await nextTick()
      
      expect(wrapper.vm.showStatus).toBe(true)
      expect(wrapper.vm.statusMessage).toBe('请填写所有必填项')
    })

    /**
     * 测试有效表单数据时不显示错误
     */
    it('应该在所有必填项都填写时不显示错误提示', async () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      
      vi.mocked(createNewProject).mockResolvedValue({
        success: true,
        message: '项目创建成功',
        project_path: '/test/path/TestProject'
      })
      
      await wrapper.vm.handleSubmit()
      await nextTick()
      
      expect(wrapper.vm.statusMessage).not.toBe('请填写所有必填项')
    })
  })

  // ==================== 用户交互测试 ====================

  describe('用户交互', () => {
    /**
     * 测试点击返回按钮是否正确导航
     */
    it('点击返回按钮应该导航到主页', async () => {
      const backButton = wrapper.find('.create-header button')
      await backButton.trigger('click')
      await nextTick()
      
      expect(mockRouterPush).toHaveBeenCalledWith('/')
    })

    /**
     * 测试点击取消按钮是否正确导航
     */
    it('点击取消按钮应该导航到主页', async () => {
      const cancelButton = wrapper.findAll('.action-bar button')[0]
      await cancelButton.trigger('click')
      await nextTick()
      
      expect(mockRouterPush).toHaveBeenCalledWith('/')
    })

    /**
     * 测试点击浏览按钮是否打开文件对话框
     */
    it('点击浏览按钮应该打开文件对话框', async () => {
      vi.mocked(openFileDialog).mockResolvedValue({
        success: true,
        path: '/selected/path'
      })
      
      vi.mocked(saveSettings).mockResolvedValue({
        success: true,
        message: '设置保存成功',
        data: {}
      })
      
      const browseButton = wrapper.findAll('.field button')[0]
      await browseButton.trigger('click')
      await nextTick()
      
      expect(openFileDialog).toHaveBeenCalledWith('directory')
      expect(wrapper.vm.projectPath).toBe('/selected/path')
    })

    /**
     * 测试文件对话框取消时的行为
     */
    it('文件对话框取消时不应该更新项目路径', async () => {
      vi.mocked(openFileDialog).mockResolvedValue({
        success: false
      })
      
      const initialPath = wrapper.vm.projectPath
      const browseButton = wrapper.findAll('.field button')[0]
      await browseButton.trigger('click')
      await nextTick()
      
      expect(wrapper.vm.projectPath).toBe(initialPath)
    })

    /**
     * 测试提交表单是否调用创建项目 API
     */
    it('提交表单应该调用创建项目 API', async () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      wrapper.vm.selectedReplacePaths = ['common']
      
      vi.mocked(createNewProject).mockResolvedValue({
        success: true,
        message: '项目创建成功',
        project_path: '/test/path/TestProject'
      })
      
      vi.mocked(saveSettings).mockResolvedValue({
        success: true,
        message: '设置保存成功',
        data: {}
      })
      
      await wrapper.vm.handleSubmit()
      await nextTick()
      
      expect(createNewProject).toHaveBeenCalledWith(
        'TestProject',
        '1.0.0',
        '/test/path',
        ['common']
      )
    })

    /**
     * 测试项目创建成功后的导航
     */
    it('项目创建成功后应该导航到编辑器页面', async () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      
      vi.mocked(createNewProject).mockResolvedValue({
        success: true,
        message: '项目创建成功',
        project_path: '/test/path/TestProject'
      })
      
      vi.mocked(saveSettings).mockResolvedValue({
        success: true,
        message: '设置保存成功',
        data: {}
      })
      
      await wrapper.vm.handleSubmit()
      await nextTick()
      
      // 等待延迟导航
      await new Promise(resolve => setTimeout(resolve, 2100))
      await nextTick()
      
      expect(mockRouterPush).toHaveBeenCalledWith({
        name: 'editor',
        query: { path: '/test/path/TestProject' }
      })
    })

    /**
     * 测试创建过程中提交按钮的禁用状态
     */
    it('创建过程中提交按钮应该被禁用', async () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      
      let resolvePromise: any
      vi.mocked(createNewProject).mockImplementation(
        () => new Promise(resolve => {
          resolvePromise = resolve
        })
      )
      
      vi.mocked(saveSettings).mockResolvedValue({
        success: true,
        message: '设置保存成功',
        data: {}
      })
      
      // const submitButton = wrapper.findAll('.action-bar button')[1]
      
      // Start the submission
      const submissionPromise = wrapper.vm.handleSubmit()
      
      // Wait for DOM to update
      await nextTick()
      
      // Re-find the button after DOM update
      const updatedSubmitButton = wrapper.findAll('.action-bar button')[1]
      
      // Check that isCreating is true
      expect(wrapper.vm.isCreating).toBe(true)
      // Check if button has disabled attribute or class
      const hasDisabledAttr = updatedSubmitButton.attributes('disabled') !== undefined
      const hasDisabledClass = updatedSubmitButton.classes().includes('disabled')
      expect(hasDisabledAttr || hasDisabledClass).toBe(true)
      expect(updatedSubmitButton.text()).toBe('创建中...')
      
      // Resolve the promise
      resolvePromise({
        success: true,
        message: '项目创建成功',
        project_path: '/test/path/TestProject'
      })
      
      await submissionPromise
      await nextTick()
      
      expect(wrapper.vm.isCreating).toBe(false)
    }, 10000)

    /**
     * 测试关闭错误对话框
     */
    it('应该能够关闭错误对话框', async () => {
      wrapper.vm.displayErrorDialog('错误标题', '错误消息')
      await nextTick()
      
      expect(wrapper.vm.showErrorDialog).toBe(true)
      
      const closeButton = wrapper.findAll('.create-card button').pop()
      await closeButton.trigger('click')
      await nextTick()
      
      expect(wrapper.vm.showErrorDialog).toBe(false)
    })

    /**
     * 测试点击错误对话框背景是否关闭对话框
     */
    it('点击错误对话框背景应该关闭对话框', async () => {
      wrapper.vm.showErrorDialog = true
      await nextTick()
      
      const backdrop = wrapper.find('.fixed.inset-0')
      await backdrop.trigger('click')
      await nextTick()
      
      expect(wrapper.vm.showErrorDialog).toBe(false)
    })

    /**
     * 测试点击错误对话框内容不关闭对话框
     */
    it('点击错误对话框内容不应该关闭对话框', async () => {
      wrapper.vm.showErrorDialog = true
      await nextTick()
      
      const dialog = wrapper.find('.create-card')
      await dialog.trigger('click')
      await nextTick()
      
      expect(wrapper.vm.showErrorDialog).toBe(true)
    })
  })

  // ==================== API 调用测试 ====================

  describe('API 调用', () => {
    /**
     * 测试加载上次使用的项目路径
     */
    it('应该加载上次使用的项目路径', async () => {
      vi.mocked(loadSettings).mockResolvedValue({
        success: true,
        message: '设置加载成功',
        data: {
          lastProjectPath: '/last/used/path'
        }
      })
      
      const newWrapper = mount(CreateProject, {
        global: {
          stubs: {
            RouterLink: true
          }
        }
      })
      
      await nextTick()
      
      expect(loadSettings).toHaveBeenCalled()
      expect((newWrapper.vm as any).projectPath).toBe('/last/used/path')
      
      newWrapper.unmount()
    })

    /**
     * 测试加载设置失败时的处理
     */
    it('加载设置失败时不应该抛出错误', async () => {
      vi.mocked(loadSettings).mockRejectedValue(new Error('加载失败'))
      
      const newWrapper = mount(CreateProject, {
        global: {
          stubs: {
            RouterLink: true
          }
        }
      })
      
      await nextTick()
      
      expect((newWrapper.vm as any).projectPath).toBe('')
      
      newWrapper.unmount()
    })

    /**
     * 测试保存项目路径
     */
    it('应该保存最后使用的项目路径', async () => {
      vi.mocked(loadSettings).mockResolvedValue({
        success: true,
        message: '设置加载成功',
        data: {}
      })
      
      vi.mocked(saveSettings).mockResolvedValue({
        success: true,
        message: '设置保存成功',
        data: {}
      })
      
      await wrapper.vm.saveLastProjectPath('/new/path')
      
      expect(saveSettings).toHaveBeenCalledWith({
        lastProjectPath: '/new/path'
      })
    })

    /**
     * 测试选择项目路径后保存
     */
    it('选择项目路径后应该保存路径', async () => {
      vi.mocked(openFileDialog).mockResolvedValue({
        success: true,
        path: '/selected/path'
      })
      
      vi.mocked(loadSettings).mockResolvedValue({
        success: true,
        message: '设置加载成功',
        data: {}
      })
      
      vi.mocked(saveSettings).mockResolvedValue({
        success: true,
        message: '设置保存成功',
        data: {}
      })
      
      await wrapper.vm.selectProjectPath()
      
      expect(saveSettings).toHaveBeenCalledWith({
        lastProjectPath: '/selected/path'
      })
    })

    /**
     * 测试创建项目成功后保存路径
     */
    it('项目创建成功后应该保存路径', async () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      
      vi.mocked(createNewProject).mockResolvedValue({
        success: true,
        message: '项目创建成功',
        project_path: '/test/path/TestProject'
      })
      
      vi.mocked(loadSettings).mockResolvedValue({
        success: true,
        message: '设置加载成功',
        data: {}
      })
      
      vi.mocked(saveSettings).mockResolvedValue({
        success: true,
        message: '设置保存成功',
        data: {}
      })
      
      await wrapper.vm.handleSubmit()
      await nextTick()
      
      expect(saveSettings).toHaveBeenCalledWith({
        lastProjectPath: '/test/path'
      })
    })

    /**
     * 测试保存路径失败时的处理
     */
    it('保存路径失败时不应该影响主流程', async () => {
      // 确保 loadSettings 返回空对象
      vi.mocked(loadSettings).mockResolvedValue({
        success: true,
        message: '设置加载成功',
        data: {}
      })
      
      // 确保 saveSettings 抛出错误
      vi.mocked(saveSettings).mockRejectedValue(new Error('保存失败'))
      
      // 保存路径不应该抛出错误
      await expect(wrapper.vm.saveLastProjectPath('/test/path')).resolves.not.toThrow()
      
      // 验证 saveSettings 被调用
      expect(saveSettings).toHaveBeenCalled()
    })
  })

  // ==================== 状态管理测试 ====================

  describe('状态管理', () => {
    /**
     * 测试状态消息的显示和隐藏
     */
    it('应该正确显示和隐藏状态消息', async () => {
      wrapper.vm.displayStatus('测试消息', 100)
      await nextTick()
      
      expect(wrapper.vm.showStatus).toBe(true)
      expect(wrapper.vm.statusMessage).toBe('测试消息')
      
      await new Promise(resolve => setTimeout(resolve, 150))
      await nextTick()
      
      expect(wrapper.vm.showStatus).toBe(false)
    })

    /**
     * 测试永久状态消息
     */
    it('应该支持永久显示状态消息', async () => {
      wrapper.vm.displayStatus('永久消息', 0)
      await nextTick()
      
      expect(wrapper.vm.showStatus).toBe(true)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()
      
      expect(wrapper.vm.showStatus).toBe(true)
    })

    /**
     * 测试错误对话框的显示
     */
    it('应该正确显示错误对话框', async () => {
      wrapper.vm.displayErrorDialog('错误标题', '错误消息')
      await nextTick()
      
      expect(wrapper.vm.showErrorDialog).toBe(true)
      expect(wrapper.vm.errorTitle).toBe('错误标题')
      expect(wrapper.vm.errorMessage).toBe('错误消息')
    })

    /**
     * 测试创建状态的变化
     */
    it('创建过程中应该正确更新创建状态', async () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      
      let resolvePromise: any
      vi.mocked(createNewProject).mockImplementation(
        () => new Promise(resolve => {
          resolvePromise = resolve
        })
      )
      
      vi.mocked(saveSettings).mockResolvedValue({
        success: true,
        message: '设置保存成功',
        data: {}
      })
      
      expect(wrapper.vm.isCreating).toBe(false)
      
      const submissionPromise = wrapper.vm.handleSubmit()
      
      expect(wrapper.vm.isCreating).toBe(true)
      
      resolvePromise({
        success: true,
        message: '项目创建成功',
        project_path: '/test/path/TestProject'
      })
      
      await submissionPromise
      await nextTick()
      
      expect(wrapper.vm.isCreating).toBe(false)
    })
  })

  // ==================== 错误处理测试 ====================

  describe('错误处理', () => {
    /**
     * 测试创建项目失败时的处理
     */
    it('创建项目失败时应该显示错误对话框', async () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      
      vi.mocked(createNewProject).mockResolvedValue({
        success: false,
        message: '创建失败：路径不存在'
      })
      
      await wrapper.vm.handleSubmit()
      await nextTick()
      
      expect(wrapper.vm.showErrorDialog).toBe(true)
      expect(wrapper.vm.errorTitle).toBe('创建项目失败')
      expect(wrapper.vm.errorMessage).toBe('创建失败：路径不存在')
      expect(wrapper.vm.isCreating).toBe(false)
    })

    /**
     * 测试创建项目抛出异常时的处理
     */
    it('创建项目抛出异常时应该显示错误对话框', async () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      
      vi.mocked(createNewProject).mockRejectedValue(new Error('网络错误'))
      
      await wrapper.vm.handleSubmit()
      await nextTick()
      
      expect(wrapper.vm.showErrorDialog).toBe(true)
      expect(wrapper.vm.errorTitle).toBe('创建项目失败')
      expect(wrapper.vm.errorMessage).toBe('Error: 网络错误')
      expect(wrapper.vm.isCreating).toBe(false)
    })

    /**
     * 测试错误对话框的样式
     */
    it('错误对话框应该有正确的样式', async () => {
      wrapper.vm.displayErrorDialog('错误标题', '错误消息')
      await nextTick()
      
      // 查找错误对话框（在固定背景中的卡片）
      const errorDialogs = wrapper.findAll('.fixed.inset-0 .create-card')
      const errorDialog = errorDialogs.find((dialog: any) => 
        dialog.classes().includes('border-red-500/60')
      )
      
      expect(errorDialog).toBeDefined()
    })

    /**
     * 测试错误对话框包含错误图标
     */
    it('错误对话框应该包含错误图标', async () => {
      wrapper.vm.displayErrorDialog('错误标题', '错误消息')
      await nextTick()
      
      const icon = wrapper.find('.text-red-500')
      expect(icon.exists()).toBe(true)
    })
  })

  // ==================== 边界情况测试 ====================

  describe('边界情况', () => {
    /**
     * 测试空 Replace Path 选项数组
     */
    it('应该支持不选择任何 Replace Path 选项', async () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      wrapper.vm.selectedReplacePaths = []
      
      vi.mocked(createNewProject).mockResolvedValue({
        success: true,
        message: '项目创建成功',
        project_path: '/test/path/TestProject'
      })
      
      vi.mocked(saveSettings).mockResolvedValue({
        success: true,
        message: '设置保存成功',
        data: {}
      })
      
      await wrapper.vm.handleSubmit()
      
      expect(createNewProject).toHaveBeenCalledWith(
        'TestProject',
        '1.0.0',
        '/test/path',
        []
      )
    })

    /**
     * 测试选择所有 Replace Path 选项
     */
    it('应该支持选择所有 Replace Path 选项', async () => {
      const checkboxes = wrapper.findAll('.replace-item input[type="checkbox"]')
      
      for (const checkbox of checkboxes) {
        await checkbox.setValue(true)
      }
      await nextTick()
      
      expect(wrapper.vm.selectedReplacePaths.length).toBe(6)
    })

    /**
     * 测试非常长的项目名称
     */
    it('应该支持非常长的项目名称', async () => {
      const longName = 'A'.repeat(1000)
      wrapper.vm.projectName = longName
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      
      vi.mocked(createNewProject).mockResolvedValue({
        success: true,
        message: '项目创建成功',
        project_path: '/test/path/TestProject'
      })
      
      vi.mocked(saveSettings).mockResolvedValue({
        success: true,
        message: '设置保存成功',
        data: {}
      })
      
      await wrapper.vm.handleSubmit()
      
      expect(createNewProject).toHaveBeenCalledWith(
        longName,
        '1.0.0',
        '/test/path',
        []
      )
    })

    /**
     * 测试特殊字符的项目名称
     */
    it('应该支持特殊字符的项目名称', async () => {
      wrapper.vm.projectName = 'Test_Project-123.中文'
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      
      vi.mocked(createNewProject).mockResolvedValue({
        success: true,
        message: '项目创建成功',
        project_path: '/test/path/Test_Project-123.中文'
      })
      
      vi.mocked(saveSettings).mockResolvedValue({
        success: true,
        message: '设置保存成功',
        data: {}
      })
      
      await wrapper.vm.handleSubmit()
      
      expect(createNewProject).toHaveBeenCalledWith(
        'Test_Project-123.中文',
        '1.0.0',
        '/test/path',
        []
      )
    })

    /**
     * 测试不同格式的版本号
     */
    it('应该支持不同格式的版本号', async () => {
      const versions = ['1.0.0', '2.1.3-beta', '3.0.0-rc.1', 'v1.2.3']
      
      for (const version of versions) {
        wrapper.vm.version = version
        wrapper.vm.projectName = 'TestProject'
        wrapper.vm.projectPath = '/test/path'
        
        vi.mocked(createNewProject).mockResolvedValue({
          success: true,
          message: '项目创建成功',
          project_path: '/test/path/TestProject'
        })
        
        vi.mocked(saveSettings).mockResolvedValue({
          success: true,
          message: '设置保存成功',
          data: {}
        })
        
        await wrapper.vm.handleSubmit()
        
        expect(createNewProject).toHaveBeenCalledWith(
          'TestProject',
          version,
          '/test/path',
          []
        )
        
        vi.clearAllMocks()
      }
    })

    /**
     * 测试快速连续点击提交按钮
     */
    it('应该防止快速连续点击提交按钮', async () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      
      let resolvePromise: any
      let callCount = 0
      vi.mocked(createNewProject).mockImplementation(
        () => {
          callCount++
          return new Promise(resolve => {
            resolvePromise = resolve
          })
        }
      )
      
      vi.mocked(saveSettings).mockResolvedValue({
        success: true,
        message: '设置保存成功',
        data: {}
      })
      
      // 触发第一次点击
      const firstClickPromise = wrapper.vm.handleSubmit()
      
      // 等待一小段时间，让 isCreating 设置为 true
      await nextTick()
      
      // 验证 isCreating 为 true
      expect(wrapper.vm.isCreating).toBe(true)
      
      // 验证已经调用了一次 createNewProject
      expect(callCount).toBe(1)
      
      // 立即尝试第二次点击（由于 isCreating 为 true，handleSubmit 应该提前返回）
      wrapper.vm.handleSubmit()
      
      // 验证仍然只调用了一次 createNewProject
      expect(callCount).toBe(1)
      
      // 解析第一个 promise
      resolvePromise({
        success: true,
        message: '项目创建成功',
        project_path: '/test/path/TestProject'
      })
      
      // 等待第一个 promise 完成
      await firstClickPromise
      await nextTick()
      
      // 验证 isCreating 变为 false
      expect(wrapper.vm.isCreating).toBe(false)
    })

    /**
     * 测试多次显示状态消息
     */
    it('应该支持多次显示状态消息', async () => {
      wrapper.vm.displayStatus('消息1', 50)
      await nextTick()
      expect(wrapper.vm.statusMessage).toBe('消息1')
      
      await new Promise(resolve => setTimeout(resolve, 60))
      
      wrapper.vm.displayStatus('消息2', 50)
      await nextTick()
      expect(wrapper.vm.statusMessage).toBe('消息2')
    })

    /**
     * 测试加载设置返回空数据
     */
    it('加载设置返回空数据时不应该更新项目路径', async () => {
      vi.mocked(loadSettings).mockResolvedValue({
        success: true,
        message: '设置加载成功',
        data: {}
      })
      
      const newWrapper = mount(CreateProject, {
        global: {
          stubs: {
            RouterLink: true
          }
        }
      })
      
      await nextTick()
      
      expect((newWrapper.vm as any).projectPath).toBe('')
      
      newWrapper.unmount()
    })

    /**
     * 测试加载设置返回非对象数据
     */
    it('加载设置返回非对象数据时不应该更新项目路径', async () => {
      vi.mocked(loadSettings).mockResolvedValue({
        success: true,
        message: '设置加载成功',
        data: 'invalid'
      })
      
      const newWrapper = mount(CreateProject, {
        global: {
          stubs: {
            RouterLink: true
          }
        }
      })
      
      await nextTick()
      
      expect((newWrapper.vm as any).projectPath).toBe('')
      
      newWrapper.unmount()
    })
  })

  // ==================== 生命周期测试 ====================

  describe('生命周期', () => {
    /**
     * 测试组件挂载时加载上次使用的路径
     */
    it('组件挂载时应该加载上次使用的项目路径', async () => {
      vi.mocked(loadSettings).mockResolvedValue({
        success: true,
        message: '设置加载成功',
        data: {
          lastProjectPath: '/last/path'
        }
      })
      
      const newWrapper = mount(CreateProject, {
        global: {
          stubs: {
            RouterLink: true
          }
        }
      })
      
      await nextTick()
      
      expect(loadSettings).toHaveBeenCalled()
      expect((newWrapper.vm as any).projectPath).toBe('/last/path')
      
      newWrapper.unmount()
    })

    /**
     * 测试组件卸载时的清理
     */
    it('组件卸载时应该正确清理', () => {
      wrapper.vm.projectName = 'TestProject'
      wrapper.vm.version = '1.0.0'
      wrapper.vm.projectPath = '/test/path'
      
      wrapper.unmount()
      
      expect(wrapper.vm.projectName).toBe('TestProject')
      expect(wrapper.vm.version).toBe('1.0.0')
      expect(wrapper.vm.projectPath).toBe('/test/path')
    })
  })

  // ==================== 可访问性测试 ====================

  describe('可访问性', () => {
    /**
     * 测试必填字段的标记
     */
    it('必填字段应该有红色星号标记', () => {
      const asterisks = wrapper.findAll('.text-red-400')
      expect(asterisks.length).toBeGreaterThanOrEqual(3)
    })

    /**
     * 测试输入框的 placeholder
     */
    it('输入框应该有正确的 placeholder', () => {
      const nameInput = wrapper.find('#project-name')
      expect(nameInput.attributes('placeholder')).toBe('例如: MyAwesomeMod')
      
      const versionInput = wrapper.find('#project-version')
      expect(versionInput.attributes('placeholder')).toBe('例如: 1.0.0')
    })

    /**
     * 测试只读输入框
     */
    it('项目路径输入框应该是只读的', () => {
      const pathInput = wrapper.find('input[readonly]')
      expect(pathInput.exists()).toBe(true)
      expect(pathInput.attributes('readonly')).toBeDefined()
    })

    /**
     * 测试按钮的 title 属性
     */
    it('返回按钮应该有 title 属性', () => {
      const backButton = wrapper.find('.create-header button')
      expect(backButton.attributes('title')).toBe('返回主界面')
    })
  })

  // ==================== 响应式测试 ====================

  describe('响应式行为', () => {
    /**
     * 测试项目名称变化时的响应
     */
    it('项目名称变化应该正确更新视图', async () => {
      const input = wrapper.find('#project-name')
      await input.setValue('NewProject')
      await nextTick()
      
      expect(input.element.value).toBe('NewProject')
    })

    /**
     * 测试版本变化时的响应
     */
    it('版本变化应该正确更新视图', async () => {
      const input = wrapper.find('#project-version')
      await input.setValue('2.0.0')
      await nextTick()
      
      expect(input.element.value).toBe('2.0.0')
    })

    /**
     * 测试 Replace Path 选项变化时的响应
     */
    it('Replace Path 选项变化应该正确更新视图', async () => {
      const checkboxes = wrapper.findAll('.replace-item input[type="checkbox"]')
      
      await checkboxes[0].setValue(true)
      await nextTick()
      
      expect(checkboxes[0].element.checked).toBe(true)
      expect(wrapper.vm.selectedReplacePaths).toContain('common')
    })
  })
})
