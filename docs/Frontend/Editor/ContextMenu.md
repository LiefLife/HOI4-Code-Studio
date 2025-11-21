# 右键菜单 (Context Menu)

## 概述
自定义的右键上下文菜单系统，用于替代浏览器默认菜单，提供应用特定功能。

## 菜单类型
组件 `src/components/editor/ContextMenu.vue` 支持三种模式 (`menuType`)：

1. **File (文件标签)**
   - 关闭全部 (`closeAll`)
   - 关闭其他 (`closeOthers`)

2. **Tree (文件树)**
   - 新建文件 (`createFile`)
   - 新建文件夹 (`createFolder`)

3. **Pane (编辑器窗格)**
   - 向右分割 (`splitRight`)
   - 关闭全部/其他

## 实现细节
- **定位**: 使用 `fixed` 定位，根据鼠标点击坐标 (`x`, `y`) 动态渲染。
- **交互**: 点击菜单外区域自动关闭 (`@click.stop` 和全屏透明遮罩)。
- **样式**: 采用磨砂玻璃效果 (`backdrop-blur`) 和深色主题。

