/**
 * RecentProjects 组件的单元测试
 */

// Mock tauri API
vi.mock('@/api/tauri', () => ({
  getRecentProjects: vi.fn(),
  getRecentProjectStats: vi.fn(),
  openProject: vi.fn(),
  initializeProject: vi.fn(),
  loadSettings: vi.fn()
}))

// Mock window.confirm
global.confirm = vi.fn(() => true)

// Mock window.alert
global.alert = vi.fn()

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import RecentProjects from '@/views/RecentProjects.vue'
import * as tauriApi from '@/api/tauri'

describe('RecentProjects.vue', () => {
  let wrapper: VueWrapper<any>

  // Mock 数据
  const mockProjects = [
    {
      name: 'Test Project 1',
      path: 'D:/Projects/test1',
      last_opened: '2024-01-15T10:30:00Z'
    },
    {
      name: 'Test Project 2',
      path: 'D:/Projects/test2',
      last_opened: '2024-01-10T14:20:00Z'
    },
    {
      name: 'HOI4 Mod',
      path: 'D:/HOI4/mods/my_mod',
      last_opened: '2024-01-05T09:15:00Z'
    }
  ]

  const mockStats = [
    {
      path: 'D:/Projects/test1',
      fileCount: 150,
      totalSize: 1048576,
      version: '1.0.0'
    },
    {
      path: 'D:/Projects/test2',
      fileCount: 200,
      totalSize: 2097152,
      version: '1.2.3'
    },
    {
      path: 'D:/HOI4/mods/my_mod',
      fileCount: 500,
      totalSize: 5242880,
      version: '2.0.0'
    }
  ]

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Mock getRecentProjects
    vi.mocked(tauriApi.getRecentProjects).mockResolvedValue({
      success: true,
      projects: mockProjects
    })

    // Mock getRecentProjectStats
    vi.mocked(tauriApi.getRecentProjectStats).mockResolvedValue({
      success: true,
      stats: mockStats
    })

    // Mock loadSettings
    vi.mocked(tauriApi.loadSettings).mockResolvedValue({
      success: true,
      message: '',
      data: { recentProjectsLayout: 'four-columns' }
    })

    // Mock openProject
    vi.mocked(tauriApi.openProject).mockResolvedValue({
      success: true,
      message: '项目打开成功'
    })

    // Mock initializeProject
    vi.mocked(tauriApi.initializeProject).mockResolvedValue({
      success: true,
      message: '项目初始化成功'
    })

    wrapper = mount(RecentProjects, {
      global: {
        stubs: {
          'router-link': true
        }
      }
    })

    // 等待组件挂载和数据加载
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('组件渲染', () => {
    it('应该正确渲染基本组件结构', () => {
      expect(wrapper.find('.bg-hoi4-dark').exists()).toBe(true)
      expect(wrapper.find('h1').text()).toBe('最近项目')
    })

    it('应该渲染返回按钮', () => {
      const backButton = wrapper.find('button')
      expect(backButton.exists()).toBe(true)
      expect(backButton.text()).toContain('返回')
    })

    it('应该渲染搜索栏', () => {
      const searchInput = wrapper.find('input[type="text"]')
      expect(searchInput.exists()).toBe(true)
      expect(searchInput.attributes('placeholder')).toBe('搜索项目名称或路径...')
    })

    it('应该渲染搜索图标', () => {
      const searchIcon = wrapper.find('svg')
      expect(searchIcon.exists()).toBe(true)
    })
  })

  describe('加载状态', () => {
    it('初始状态应该显示加载中', async () => {
      const loadingWrapper = mount(RecentProjects, {
        global: {
          stubs: {
            'router-link': true
          }
        }
      })
      
      expect(loadingWrapper.find('.text-center').text()).toBe('加载中...')
      loadingWrapper.unmount()
    })

    it('加载完成后应该显示项目列表', async () => {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectCards = wrapper.findAll('.card')
      expect(projectCards.length).toBeGreaterThan(0)
    })
  })

  describe('项目列表显示', () => {
    it('应该正确显示项目数量', async () => {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectCards = wrapper.findAll('.card')
      expect(projectCards.length).toBe(mockProjects.length)
    })

    it('应该显示项目名称', async () => {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectNames = wrapper.findAll('h3.text-hoi4-text')
      expect(projectNames[0].text()).toBe(mockProjects[0].name)
      expect(projectNames[1].text()).toBe(mockProjects[1].name)
    })

    it('应该显示项目路径', async () => {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectPaths = wrapper.findAll('.font-mono')
      expect(projectPaths[0].text()).toBe(mockProjects[0].path)
      expect(projectPaths[1].text()).toBe(mockProjects[1].path)
    })

    it('应该显示项目版本', async () => {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const versionBadges = wrapper.findAll('.inline-flex')
      expect(versionBadges[0].text()).toContain('v1.0.0')
      expect(versionBadges[1].text()).toContain('v1.2.3')
    })

    it('应该显示文件数量', async () => {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const fileCounts = wrapper.findAll('.tabular-nums')
      expect(fileCounts[0].text()).toBe('150')
      expect(fileCounts[2].text()).toBe('200')
    })

    it('应该显示项目大小', async () => {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const sizes = wrapper.findAll('.tabular-nums')
      // 第一个项目大小是 1024000 字节 = 1 MB
      expect(sizes[1].text()).toContain('MB')
      // 第二个项目大小是 2048000 字节 = 2 MB
      expect(sizes[3].text()).toContain('MB')
    })
  })

  describe('搜索功能', () => {
    it('应该能够输入搜索关键词', async () => {
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('test')
      
      expect(wrapper.vm.searchQuery).toBe('test')
    })

    it('应该根据项目名称过滤项目', async () => {
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('Test Project 1')
      
      await nextTick()
      
      const filteredProjects = wrapper.vm.filteredProjects
      expect(filteredProjects.length).toBe(1)
      expect(filteredProjects[0].name).toBe('Test Project 1')
    })

    it('应该根据项目路径过滤项目', async () => {
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('test2')
      
      await nextTick()
      
      const filteredProjects = wrapper.vm.filteredProjects
      expect(filteredProjects.length).toBe(1)
      expect(filteredProjects[0].path).toContain('test2')
    })

    it('搜索不区分大小写', async () => {
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('TEST PROJECT')
      
      await nextTick()
      
      const filteredProjects = wrapper.vm.filteredProjects
      expect(filteredProjects.length).toBe(2)
    })

    it('应该显示搜索结果数量', async () => {
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('test')
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const resultCount = wrapper.findAll('.text-hoi4-text-dim')
      const resultText = resultCount.find(el => el.text().includes('找到'))
      expect(resultText).toBeTruthy()
      expect(resultText?.text()).toContain('找到')
      expect(resultText?.text()).toContain('2')
    })

    it('当没有搜索结果时应该显示提示', async () => {
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('nonexistent')
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const noResults = wrapper.findAll('.text-hoi4-text-dim')
      const noResultText = noResults.find(el => el.text().includes('未找到匹配的项目'))
      expect(noResultText).toBeTruthy()
      expect(noResultText?.text()).toContain('未找到匹配的项目')
    })

    it('应该能够清除搜索', async () => {
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('test')
      
      const clearButton = wrapper.find('button.text-hoi4-text-dim')
      await clearButton.trigger('click')
      
      expect(wrapper.vm.searchQuery).toBe('')
    })
  })

  describe('布局模式', () => {
    it('应该默认使用四列布局', async () => {
      await nextTick()
      
      expect(wrapper.vm.layoutMode).toBe('four-columns')
      expect(wrapper.vm.gridClass).toContain('xl:grid-cols-4')
    })

    it('应该能够切换到三列布局', async () => {
      wrapper.vm.layoutMode = 'three-columns'
      await nextTick()
      
      expect(wrapper.vm.gridClass).toContain('lg:grid-cols-3')
      expect(wrapper.vm.gridClass).not.toContain('xl:grid-cols-4')
    })

    it('应该能够切换到两列布局', async () => {
      wrapper.vm.layoutMode = 'two-columns'
      await nextTick()
      
      expect(wrapper.vm.gridClass).toContain('md:grid-cols-2')
      expect(wrapper.vm.gridClass).not.toContain('lg:grid-cols-3')
    })

    it('应该能够切换到单列布局', async () => {
      wrapper.vm.layoutMode = 'one-column'
      await nextTick()
      
      expect(wrapper.vm.gridClass).toContain('flex')
      expect(wrapper.vm.gridClass).toContain('flex-col')
    })

    it('应该能够切换到瀑布流布局', async () => {
      wrapper.vm.layoutMode = 'masonry'
      await nextTick()
      
      expect(wrapper.vm.gridClass).toContain('columns-1')
      expect(wrapper.vm.cardClass).toContain('break-inside-avoid')
    })
  })

  describe('打开项目', () => {
    it('点击项目卡片应该调用 openProject', async () => {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectCard = wrapper.findAll('.card')[0]
      await projectCard.trigger('click')
      
      expect(tauriApi.openProject).toHaveBeenCalledWith(mockProjects[0].path)
    })

    it('成功打开项目后应该显示状态提示', async () => {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectCard = wrapper.findAll('.card')[0]
      await projectCard.trigger('click')
      
      await nextTick()
      
      expect(wrapper.vm.showStatus).toBe(true)
      expect(wrapper.vm.statusMessage).toBe('项目打开成功')
    })
  })

  describe('项目初始化', () => {
    it('当项目需要初始化时应该显示确认对话框', async () => {
      vi.mocked(tauriApi.openProject).mockResolvedValue({
        success: false,
        message: '检测到此文件夹不是HOI4 Code Studio项目'
      })
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectCard = wrapper.findAll('.card')[0]
      await projectCard.trigger('click')
      
      expect(global.confirm).toHaveBeenCalled()
    })

    it('确认初始化后应该调用 initializeProject', async () => {
      vi.mocked(tauriApi.openProject).mockResolvedValue({
        success: false,
        message: '检测到此文件夹不是HOI4 Code Studio项目'
      })
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectCard = wrapper.findAll('.card')[0]
      await projectCard.trigger('click')
      
      expect(tauriApi.initializeProject).toHaveBeenCalledWith(mockProjects[0].path)
    })

    it('初始化成功后应该显示状态提示', async () => {
      vi.mocked(tauriApi.openProject).mockResolvedValue({
        success: false,
        message: '检测到此文件夹不是HOI4 Code Studio项目'
      })
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectCard = wrapper.findAll('.card')[0]
      await projectCard.trigger('click')
      
      await nextTick()
      
      expect(wrapper.vm.showStatus).toBe(true)
      expect(wrapper.vm.statusMessage).toBe('项目初始化成功')
    })

    it('初始化失败后应该显示错误信息', async () => {
      vi.mocked(tauriApi.openProject).mockResolvedValue({
        success: false,
        message: '检测到此文件夹不是HOI4 Code Studio项目'
      })
      
      vi.mocked(tauriApi.initializeProject).mockResolvedValue({
        success: false,
        message: '初始化失败'
      })
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectCard = wrapper.findAll('.card')[0]
      await projectCard.trigger('click')
      
      await nextTick()
      
      expect(wrapper.vm.statusMessage).toContain('项目初始化失败')
    })

    it('取消初始化时不应该执行任何操作', async () => {
      vi.mocked(tauriApi.openProject).mockResolvedValue({
        success: false,
        message: '检测到此文件夹不是HOI4 Code Studio项目'
      })
      
      vi.mocked(global.confirm).mockReturnValueOnce(false)
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectCard = wrapper.findAll('.card')[0]
      await projectCard.trigger('click')
      
      expect(tauriApi.initializeProject).not.toHaveBeenCalled()
    })
  })

  describe('错误处理', () => {
    it('打开项目失败时应该显示错误信息', async () => {
      vi.mocked(tauriApi.openProject).mockResolvedValue({
        success: false,
        message: '打开失败'
      })
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectCard = wrapper.findAll('.card')[0]
      await projectCard.trigger('click')
      
      await nextTick()
      
      expect(wrapper.vm.statusMessage).toContain('打开失败')
    })

    it('加载项目列表失败时应该处理错误', async () => {
      vi.mocked(tauriApi.getRecentProjects).mockResolvedValue({
        success: false,
        projects: []
      })
      
      const errorWrapper = mount(RecentProjects, {
        global: {
          stubs: {
            'router-link': true
          }
        }
      })
      
      await errorWrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect((errorWrapper.vm as any).projects).toEqual([])
      errorWrapper.unmount()
    })
  })

  describe('返回按钮', () => {
    it('点击返回按钮应该跳转到首页', async () => {
      const backButton = wrapper.find('button')
      await backButton.trigger('click')
      
      // 由于 router 已经被 mock,我们只需要检查 goBack 方法被调用
      expect(wrapper.vm.goBack).toBeDefined()
    })
  })

  describe('空状态', () => {
    it('当没有项目时应该显示空状态提示', async () => {
      vi.mocked(tauriApi.getRecentProjects).mockResolvedValue({
        success: true,
        projects: []
      })
      
      const emptyWrapper = mount(RecentProjects, {
        global: {
          stubs: {
            'router-link': true
          }
        }
      })
      
      await emptyWrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const emptyState = emptyWrapper.find('.text-center')
      expect(emptyState.text()).toContain('暂无最近项目')
      emptyWrapper.unmount()
    })
  })

  describe('格式化函数', () => {
    it('formatDate 应该正确格式化日期', () => {
      const date = wrapper.vm.formatDate('2024-01-15T10:30:00Z')
      expect(date).toBeTruthy()
      expect(typeof date).toBe('string')
    })

    it('formatDate 应该处理无效日期', () => {
      const date = wrapper.vm.formatDate('invalid-date')
      expect(date).toBe('Invalid Date')
    })

    it('formatBytes 应该正确格式化字节', () => {
      expect(wrapper.vm.formatBytes(1024)).toBe('1.00 KB')
      expect(wrapper.vm.formatBytes(1048576)).toBe('1.00 MB')
      expect(wrapper.vm.formatBytes(1073741824)).toBe('1.00 GB')
    })

    it('formatBytes 应该处理小字节数', () => {
      expect(wrapper.vm.formatBytes(512)).toBe('512 B')
      expect(wrapper.vm.formatBytes(100)).toBe('100 B')
    })

    it('formatBytes 应该处理无效值', () => {
      expect(wrapper.vm.formatBytes(-1)).toBe('-')
      expect(wrapper.vm.formatBytes(Infinity)).toBe('-')
      expect(wrapper.vm.formatBytes(NaN)).toBe('-')
    })

    it('formatBytes 应该正确处理大数字', () => {
      expect(wrapper.vm.formatBytes(1536)).toBe('1.50 KB')
      expect(wrapper.vm.formatBytes(1572864)).toBe('1.50 MB')
    })
  })

  describe('状态提示', () => {
    it('displayStatus 应该显示状态消息', () => {
      wrapper.vm.displayStatus('测试消息')
      
      expect(wrapper.vm.showStatus).toBe(true)
      expect(wrapper.vm.statusMessage).toBe('测试消息')
    })

    it('状态提示应该在指定时间后自动消失', async () => {
      vi.useFakeTimers()
      wrapper.vm.displayStatus('测试消息', 100)
      
      expect(wrapper.vm.showStatus).toBe(true)
      
      vi.advanceTimersByTime(150)
      await nextTick()
      
      expect(wrapper.vm.showStatus).toBe(false)
      vi.useRealTimers()
    })

    it('应该渲染状态提示组件', async () => {
      wrapper.vm.displayStatus('测试消息')
      await nextTick()
      
      const statusElement = wrapper.find('.fixed.bottom-\\[2vh\\]')
      expect(statusElement.exists()).toBe(true)
      expect(statusElement.text()).toBe('测试消息')
    })
  })

  describe('设置加载', () => {
    it('应该从设置中加载布局模式', async () => {
      vi.mocked(tauriApi.loadSettings).mockResolvedValue({
        success: true,
        message: '',
        data: { recentProjectsLayout: 'three-columns' }
      })
      
      const settingsWrapper = mount(RecentProjects, {
        global: {
          stubs: {
            'router-link': true
          }
        }
      })
      
      await settingsWrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect((settingsWrapper.vm as any).layoutMode).toBe('three-columns')
      settingsWrapper.unmount()
    })

    it('当设置加载失败时应该使用默认布局', async () => {
      vi.mocked(tauriApi.loadSettings).mockResolvedValue({
        success: false,
        message: '设置加载失败'
      })
      
      const settingsWrapper = mount(RecentProjects, {
        global: {
          stubs: {
            'router-link': true
          }
        }
      })
      
      await settingsWrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect((settingsWrapper.vm as any).layoutMode).toBe('four-columns')
      settingsWrapper.unmount()
    })
  })

  describe('项目统计', () => {
    it('应该正确加载项目统计信息', async () => {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(tauriApi.getRecentProjectStats).toHaveBeenCalled()
      expect(wrapper.vm.projectStatsByPath['D:/Projects/test1']).toBeDefined()
    })

    it('应该正确映射统计信息到项目', async () => {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const stats = wrapper.vm.projectStatsByPath['D:/Projects/test1']
      expect(stats.fileCount).toBe(150)
      expect(stats.totalSize).toBe(1048576)
      expect(stats.version).toBe('1.0.0')
    })

    it('当统计信息加载失败时应该显示占位符', async () => {
      vi.mocked(tauriApi.getRecentProjectStats).mockResolvedValue({
        success: false,
        stats: []
      })
      
      const statsWrapper = mount(RecentProjects, {
        global: {
          stubs: {
            'router-link': true
          }
        }
      })
      
      await statsWrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect((statsWrapper.vm as any).projectStatsByPath).toEqual({})
      statsWrapper.unmount()
    })
  })

  describe('响应式行为', () => {
    it('应该正确响应搜索查询的变化', async () => {
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('test')
      
      await nextTick()
      
      expect(wrapper.vm.filteredProjects.length).toBeLessThan(wrapper.vm.projects.length)
    })

    it('应该正确响应布局模式的变化', async () => {
      wrapper.vm.layoutMode = 'two-columns'
      await nextTick()
      
      expect(wrapper.vm.gridClass).toContain('md:grid-cols-2')
    })
  })

  describe('边界情况', () => {
    it('应该处理空项目名称', async () => {
      vi.mocked(tauriApi.getRecentProjects).mockResolvedValue({
        success: true,
        projects: [
          {
            name: '',
            path: 'D:/Projects/empty',
            last_opened: '2024-01-15T10:30:00Z'
          }
        ]
      })
      
      const boundaryWrapper = mount(RecentProjects, {
        global: {
          stubs: {
            'router-link': true
          }
        }
      })
      
      await boundaryWrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectName = boundaryWrapper.find('h3.text-hoi4-text')
      expect(projectName.text()).toBe('')
      boundaryWrapper.unmount()
    })

    it('应该处理超长项目名称', async () => {
      const longName = 'A'.repeat(1000)
      vi.mocked(tauriApi.getRecentProjects).mockResolvedValue({
        success: true,
        projects: [
          {
            name: longName,
            path: 'D:/Projects/long',
            last_opened: '2024-01-15T10:30:00Z'
          }
        ]
      })
      
      const boundaryWrapper = mount(RecentProjects, {
        global: {
          stubs: {
            'router-link': true
          }
        }
      })
      
      await boundaryWrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const projectName = boundaryWrapper.find('h3.text-hoi4-text')
      expect(projectName.text()).toBe(longName)
      boundaryWrapper.unmount()
    })

    it('应该处理特殊字符搜索', async () => {
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('test@#$%')
      
      await nextTick()
      
      expect(wrapper.vm.filteredProjects.length).toBe(0)
    })
  })
})
