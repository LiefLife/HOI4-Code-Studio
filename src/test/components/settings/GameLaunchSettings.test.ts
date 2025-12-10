import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GameLaunchSettings from '../../../components/settings/GameLaunchSettings.vue'

describe('GameLaunchSettings.vue', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(GameLaunchSettings, {
      props: {
        useSteamVersion: true,
        usePirateVersion: false,
        pirateExecutable: 'dowser',
        launchWithDebug: false
      }
    })
  })

  it('应该正确渲染组件', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.space-y-4').exists()).toBe(true)
  })

  it('应该正确渲染Steam版本选项', () => {
    const steamOption = wrapper.findAll('.settings-option')[0]
    expect(steamOption.exists()).toBe(true)
    expect(steamOption.find('.settings-option-title').text()).toBe('使用 Steam 版本启动')
    expect(steamOption.find('.settings-option-description').text()).toBe('通过 Steam 平台启动游戏')
  })

  it('应该正确渲染学习版选项', () => {
    const pirateOption = wrapper.findAll('.settings-option')[1]
    expect(pirateOption.exists()).toBe(true)
    expect(pirateOption.find('.settings-option-title').text()).toBe('使用学习版启动')
    expect(pirateOption.find('.settings-option-description').text()).toBe('直接启动游戏可执行文件')
  })

  it('应该正确渲染调试模式选项', () => {
    const debugOption = wrapper.findAll('.settings-option')[2]
    expect(debugOption.exists()).toBe(true)
    expect(debugOption.find('.settings-option-title').text()).toBe('启动时附加调试参数 (--debug)')
    expect(debugOption.find('.settings-option-description').text()).toContain('启用后，游戏启动时将自动添加 --debug 参数')
  })

  it('初始状态下应该默认选择Steam版本', () => {
    const radioInputs = wrapper.findAll('[name="gameVersion"]')
    
    expect(radioInputs.length).toBe(2)
    expect(radioInputs[0].element.checked).toBe(true) // Steam版本
    expect(radioInputs[1].element.checked).toBe(false) // 学习版
  })

  it('切换到学习版时应该显示额外选项', async () => {
    // 初始状态下学习版选项应该隐藏
    expect(wrapper.find('.ml-8').exists()).toBe(false)
    
    // 切换到学习版
    const pirateRadio = wrapper.findAll('[name="gameVersion"]')[1]
    await pirateRadio.trigger('change')
    
    // 学习版选项应该显示
    expect(wrapper.find('.ml-8').exists()).toBe(true)
    expect(wrapper.find('.settings-form-group').exists()).toBe(true)
    expect(wrapper.find('.p-3.bg-hoi4-gray').exists()).toBe(true)
  })

  it('切换到Steam版本时应该隐藏学习版选项', async () => {
    // 先切换到学习版
    const pirateRadio = wrapper.findAll('[name="gameVersion"]')[1]
    await pirateRadio.trigger('change')
    expect(wrapper.find('.ml-8').exists()).toBe(true)
    
    // 切换回Steam版本
    const steamRadio = wrapper.findAll('[name="gameVersion"]')[0]
    await steamRadio.trigger('change')
    
    // 学习版选项应该隐藏
    expect(wrapper.find('.ml-8').exists()).toBe(false)
  })

  it('学习版选项应该默认选择dowser.exe', async () => {
    // 切换到学习版
    const pirateRadio = wrapper.findAll('[name="gameVersion"]')[1]
    await pirateRadio.trigger('change')
    
    const dowserRadio = wrapper.find('[value="dowser"]')
    const hoi4Radio = wrapper.find('[value="hoi4"]')
    
    expect(dowserRadio.element.checked).toBe(true)
    expect(hoi4Radio.element.checked).toBe(false)
  })

  it('应该能够切换学习版的启动程序', async () => {
    // 切换到学习版
    const pirateRadio = wrapper.findAll('[name="gameVersion"]')[1]
    await pirateRadio.trigger('change')
    
    // 切换到hoi4.exe
    const hoi4Radio = wrapper.find('[value="hoi4"]')
    await hoi4Radio.trigger('change')
    
    expect(hoi4Radio.element.checked).toBe(true)
    // 检查是否触发了正确的事件
    expect(wrapper.emitted('update:pirateExecutable')).toBeDefined()
    expect(wrapper.emitted('update:pirateExecutable')?.[0]).toEqual(['hoi4'])
    expect(wrapper.emitted('save')).toBeDefined()
  })

  it('应该能够切换调试模式', async () => {
    const debugCheckbox = wrapper.find('input[type="checkbox"]')
    
    // 初始状态应该是未选中
    expect(debugCheckbox.element.checked).toBe(false)
    
    // 切换调试模式
    await debugCheckbox.trigger('change')
    expect(debugCheckbox.element.checked).toBe(true)
    
    // 检查第一次切换的事件
    expect(wrapper.emitted('update:launchWithDebug')).toBeDefined()
    expect(wrapper.emitted('update:launchWithDebug')?.[0]).toEqual([true])
    expect(wrapper.emitted('save')).toBeDefined()
    
    // 再次切换，应该回到未选中状态
    await debugCheckbox.trigger('change')
    expect(debugCheckbox.element.checked).toBe(false)
    
    // 检查第二次切换的事件
    expect(wrapper.emitted('update:launchWithDebug')?.[1]).toEqual([false])
    expect(wrapper.emitted('save')?.length).toBe(2)
  })

  it('切换版本时应该触发正确的事件', async () => {
    // 切换到学习版
    const pirateRadio = wrapper.findAll('[name="gameVersion"]')[1]
    await pirateRadio.trigger('change')
    
    // 检查事件
    expect(wrapper.emitted('update:useSteamVersion')).toBeDefined()
    expect(wrapper.emitted('update:useSteamVersion')?.[0]).toEqual([false])
    expect(wrapper.emitted('update:usePirateVersion')?.[0]).toEqual([true])
    expect(wrapper.emitted('save')?.[0]).toEqual([])
    
    // 切换回Steam版
    const steamRadio = wrapper.findAll('[name="gameVersion"]')[0]
    await steamRadio.trigger('change')
    
    // 检查事件
    expect(wrapper.emitted('update:useSteamVersion')?.[1]).toEqual([true])
    expect(wrapper.emitted('update:usePirateVersion')?.[1]).toEqual([false])
    expect(wrapper.emitted('save')?.length).toBe(2)
  })

  it('提示信息应该根据选择的启动程序动态变化', async () => {
    // 切换到学习版
    const pirateRadio = wrapper.findAll('[name="gameVersion"]')[1]
    await pirateRadio.trigger('change')
    
    // 初始提示应该包含dowser.exe
    let infoText = wrapper.find('.text-hoi4-comment').text()
    expect(infoText).toContain('dowser.exe')
    
    // 切换到hoi4.exe
    const hoi4Radio = wrapper.find('[value="hoi4"]')
    await hoi4Radio.trigger('change')
    
    // 提示应该更新为包含hoi4.exe
    infoText = wrapper.find('.text-hoi4-comment').text()
    expect(infoText).toContain('hoi4.exe')
  })

  it('应该正确响应props变化', async () => {
    // 更新props
    await wrapper.setProps({
      useSteamVersion: false,
      usePirateVersion: true,
      pirateExecutable: 'hoi4',
      launchWithDebug: true
    })
    
    // 检查组件是否正确响应props变化
    const steamRadio = wrapper.findAll('[name="gameVersion"]')[0]
    const pirateRadio = wrapper.findAll('[name="gameVersion"]')[1]
    const debugCheckbox = wrapper.find('input[type="checkbox"]')
    
    expect(steamRadio.element.checked).toBe(false)
    expect(pirateRadio.element.checked).toBe(true)
    expect(debugCheckbox.element.checked).toBe(true)
    
    // 检查学习版选项是否显示
    expect(wrapper.find('.ml-8').exists()).toBe(true)
    
    // 检查启动程序选择是否正确
    const dowserRadio = wrapper.find('[value="dowser"]')
    const hoi4Radio = wrapper.find('[value="hoi4"]')
    
    expect(dowserRadio.element.checked).toBe(false)
    expect(hoi4Radio.element.checked).toBe(true)
  })

  it('所有版本和启动程序组合都应该正确工作', async () => {
    // 测试1: Steam版本 + 调试关闭
    expect(wrapper.findAll('[name="gameVersion"]')[0].element.checked).toBe(true)
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(false)
    
    // 测试2: 学习版 + dowser.exe + 调试关闭
    await wrapper.findAll('[name="gameVersion"]')[1].trigger('change')
    expect(wrapper.find('[value="dowser"]').element.checked).toBe(true)
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(false)
    
    // 测试3: 学习版 + hoi4.exe + 调试关闭
    await wrapper.find('[value="hoi4"]').trigger('change')
    expect(wrapper.find('[value="hoi4"]').element.checked).toBe(true)
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(false)
    
    // 测试4: 学习版 + hoi4.exe + 调试开启
    await wrapper.find('input[type="checkbox"]').trigger('change')
    expect(wrapper.find('[value="hoi4"]').element.checked).toBe(true)
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(true)
    
    // 测试5: Steam版本 + 调试开启
    await wrapper.findAll('[name="gameVersion"]')[0].trigger('change')
    expect(wrapper.findAll('[name="gameVersion"]')[0].element.checked).toBe(true)
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(true)
    
    // 所有测试都应该成功执行，没有错误
    expect(true).toBe(true)
  })
})