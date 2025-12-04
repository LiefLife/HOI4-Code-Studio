import { describe, it, expect } from 'vitest'
import { parseFocusTreeFile } from '../../utils/focusTreeParser'

describe('focusTreeParser - 注释过滤', () => {
  it('应该省略被注释掉的国策', () => {
    const content = `
focus_tree = {
    id = test_tree
    
    focus = {
        id = active_focus
        x = 0
        y = 0
        cost = 10
        icon = "gfx/interface/icons/goal_icons_generic_generic_focus.dds"
    }
    
    # 被注释掉的国策，应该被忽略
    # focus = {
    #     id = commented_focus
    #     x = 1
    #     y = 0
    #     cost = 15
    #     icon = "gfx/interface/icons/goal_icons_generic_generic_focus.dds"
    # }
    
    focus = {
        id = another_active_focus
        x = 2
        y = 0
        cost = 20
        icon = "gfx/interface/icons/goal_icons_generic_generic_focus.dds"
        
        # 前置条件中的注释应该被忽略
        prerequisite = {
            focus = active_focus
            # focus = commented_focus  # 这行被注释，不应被解析
        }
    }
}
`

    const result = parseFocusTreeFile(content)
    
    expect(result).not.toBeNull()
    expect(result!.focuses.size).toBe(2) // 只应该解析出2个活跃的国策
    
    // 验证解析出的国策ID
    expect(result!.focuses.has('active_focus')).toBe(true)
    expect(result!.focuses.has('another_active_focus')).toBe(true)
    expect(result!.focuses.has('commented_focus')).toBe(false) // 被注释的国策不应该存在
    
    // 验证前置条件只包含活跃的国策
    const anotherFocus = result!.focuses.get('another_active_focus')!
    expect(anotherFocus.prerequisite).toEqual([['active_focus']])
  })

  it('应该处理行内注释', () => {
    const content = `
focus_tree = {
    id = test_tree
    
    focus = {
        id = test_focus
        x = 0
        y = 0
        cost = 10  # 这是一个成本注释
        icon = "gfx/interface/icons/goal_icons_generic_generic_focus.dds"  # 图标路径注释
    }
    
    focus = {
        id = another_test_focus
        x = 1
        y = 0
        cost = 15  # 另一个成本注释
        icon = "gfx/interface/icons/goal_icons_generic_generic_focus.dds"
        
        prerequisite = {
            focus = test_focus  # 前置条件注释
        }
    }
}
`

    const result = parseFocusTreeFile(content)
    
    expect(result).not.toBeNull()
    expect(result!.focuses.size).toBe(2)
    
    // 验证数值解析正确（不受行内注释影响）
    const testFocus = result!.focuses.get('test_focus')!
    expect(testFocus.cost).toBe(10)
    
    const anotherTestFocus = result!.focuses.get('another_test_focus')!
    expect(anotherTestFocus.cost).toBe(15)
  })

  it('应该处理空行和只有注释的行', () => {
    const content = `
focus_tree = {
    id = test_tree
    
    # 这是一个注释行
    
    focus = {
        id = sole_focus
        x = 0
        y = 0
        cost = 5
        icon = "gfx/interface/icons/goal_icons_generic_generic_focus.dds"
    }
    
    # 另一个注释行
    
    # 以下是注释掉的国策块
    # focus = {
    #     id = should_be_ignored
    #     x = 1
    #     y = 0
    # }
}
`

    const result = parseFocusTreeFile(content)
    
    expect(result).not.toBeNull()
    expect(result!.focuses.size).toBe(1)
    expect(result!.focuses.has('sole_focus')).toBe(true)
  })
})