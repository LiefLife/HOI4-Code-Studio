# 主题系统

HOI4 Code Studio 提供了丰富的主题选择，包括通用编辑器主题、HOI4特定主题和无障碍友好主题。

## 设计规范

### 无边框岛屿设计 (Borderless Island Design)

自 v0.2.15-dev 版本起，项目引入了无边框岛屿设计语言，旨在提供更现代、更简洁的视觉体验。

- **核心原则**: 移除 UI 容器的显式边框，改用背景色差异、阴影或渐变来区分层级。
- **应用范围**: 
  - 编辑页侧边面板
  - 项目信息模块中的内置卡片
  - 错误列表项
- **具体属性**:
  - `border: none`
  - `outline: none`
  - 使用 `rounded-xl` 或 `rounded-lg` 保持圆润外观
  - 使用 `bg-hoi4-gray/70` 或更深的背景色以区分背景
  - 使用 `shadow-sm` 或 `shadow-md` 增强浮动感和层级辨识度

## 主题分类

### 通用编辑器主题

这些主题来自流行的代码编辑器和IDE，适合日常开发使用：

- **One Dark/Light** - 来自Atom编辑器的经典主题
- **VS Code Dark** - Visual Studio Code的默认暗色主题
- **GitHub Dark/Light** - GitHub的官方主题
- **Catppuccin系列** - Latte、Frappé、Macchiato、Mocha
- **Dracula** - 流行的暗色主题
- **Monokai** - 经典的编程主题
- **Solarized Dark/Light** - 科学设计的配色方案
- **Nord** - 来自北欧的冷色调主题
- **Gruvbox Dark/Light** - 复古风格的主题
- **Material Dark/Light** - Google Material Design主题
- **Tokyo Night** - 现代化的暗色主题
- **Palenight** - Material Design的变体
- **Shades of Purple** - 紫色调主题
- **Cobalt2** - 明亮的蓝色主题
- **Night Owl** - 夜间专用主题
- **Panda** - 黑白简约主题
- **Vibrant Ink** - 鲜艳的色彩主题
- **Arc** - 优雅的灰色主题
- **Mayukai** - 深色主题变体
- **Atom Dark/Light** - Atom编辑器主题
- **Tomorrow Light/Night** - 日常使用的主题
- **Base16** - 基础16色调色板
- **Cyan** - 青色调主题
- **Neon** - 霓虹灯效果主题
- **Mint** - 薄荷绿色主题
- **Rose Pine** - 玫瑰松木主题
- **Oceanic Next** - 海洋蓝色主题

### 新增流行编辑器主题

- **JetBrains Darcula** - JetBrains IDE的经典暗色主题
- **JetBrains IntelliJ Light** - JetBrains IntelliJ的亮色主题
- **Doom One** - Emacs Doom Emacs的流行主题

### HOI4国家主题

这些主题基于HOI4中主要国家的代表性颜色，为模组开发者提供沉浸式的开发环境：

#### 盟军国家
- **Hearts of Iron - United Kingdom Dark/Light** - 基于英国国旗的红蓝白配色
- **Hearts of Iron - America Dark/Light** - 基于美国国旗的红蓝白配色
- **Hearts of Iron - France Dark/Light** - 基于法国国旗的蓝白红配色

#### 轴心国
- **Hearts of Iron - Germany Dark/Light** - 基于德国国旗的黑红金配色
- **Hearts of Iron - Italy Dark/Light** - 基于意大利国旗的绿白红配色
- **Hearts of Iron - Japan Dark/Light** - 基于日本国旗的红白配色

#### 共产国际
- **Hearts of Iron - Comintern Dark/Light** - 基于共产主义运动的红色主题

#### 统一战线
- **Hearts of Iron - China Dark/Light** - 基于中国国旗的红黄配色

### 无障碍友好主题

- **High Contrast** - 高对比度主题，提供最佳的视觉可读性
- **Colorblind Friendly** - 色盲友好主题，使用色盲用户容易区分的颜色组合

## 主题结构

每个主题包含以下颜色属性：

```typescript
interface Theme {
  id: string                    // 主题唯一标识符
  name: string                  // 主题显示名称
  colors: {
    bg: string                  // 背景色
    bgSecondary: string         // 次要背景色
    fg: string                  // 前景色（文字）
    comment: string             // 注释颜色
    border: string              // 边框颜色
    selection: string           // 选择高亮色
    accent: string              // 强调色
    success: string             // 成功状态色
    warning: string             // 警告状态色
    error: string               // 错误状态色
    keyword: string             // 关键字颜色
  }
}
```

## 使用主题

### 切换主题

1. 使用快捷键 `Ctrl+Shift+T` 打开主题面板
2. 在主题面板中选择喜欢的主题
3. 主题会立即应用并自动保存到设置中

### 主题快捷键

- `Ctrl+Shift+T` - 打开/关闭主题面板
- `Esc` - 关闭主题面板

### 主题持久化

选择的主题会自动保存到应用设置中，下次启动时会自动应用上次选择的主题。

## 自定义主题

如果需要添加自定义主题，可以在 `src/composables/useTheme.ts` 文件中的 `themes` 数组中添加新的主题定义。

### 添加新主题的步骤

1. 确定主题的11个颜色值
2. 在 `themes` 数组中添加新的主题对象
3. 确保主题ID唯一且使用kebab-case格式
4. 测试主题在UI和代码编辑器中的显示效果

### 主题设计建议

- 确保文字和背景有足够的对比度（建议WCAG AA级别或更高）
- 考虑色盲用户，避免仅用颜色区分重要信息
- 保持一致的视觉层次和色彩和谐
- 测试主题在不同光线条件下的可读性

## 编辑器主题集成

主题系统与CodeMirror编辑器深度集成，确保：

- 语法高亮颜色与UI主题协调
- 编辑器背景和前景色与UI保持一致
- 选择高亮、光标等编辑器元素使用主题颜色
- 所有UI组件（按钮、面板、边框等）使用主题颜色

## 无障碍支持

HOI4 Code Studio致力于提供无障碍友好的开发环境：

- **高对比度主题**：满足WCAG AAA级别的对比度要求
- **色盲友好主题**：使用色盲用户容易区分的颜色组合
- **键盘导航**：完全支持键盘操作
- **屏幕阅读器支持**：语义化的HTML结构

## 主题故障排除

### 主题未正确应用

1. 检查浏览器开发者工具中的CSS变量是否正确设置
2. 确认主题定义中的所有颜色值都是有效的十六进制格式
3. 检查是否有JavaScript错误阻止主题应用

### 编辑器主题不匹配

1. 确认 `useEditorTheme.ts` 中的主题映射正确
2. 检查CodeMirror扩展是否正确加载
3. 验证主题颜色值是否在编辑器中正确应用

### 性能问题

如果主题切换导致性能问题：

1. 检查主题数量是否过多（建议不超过50个）
2. 确认没有内存泄漏
3. 优化主题切换的动画效果

## 贡献主题

欢迎社区贡献新的主题！请遵循以下指南：

1. 主题应该有明确的用途和目标用户
2. 颜色选择应该考虑可读性和无障碍性
3. 提供明暗两个版本（如果适用）
4. 包含完整的测试用例
5. 更新相关文档

提交主题时，请创建一个OpenSpec变更提案，详细说明主题的设计理念和使用场景。