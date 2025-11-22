# 右键菜单 (Context Menu)

## 概述
自定义的右键上下文菜单系统，用于替代浏览器默认菜单，提供应用特定功能。

## 菜单类型
组件 `src/components/editor/ContextMenu.vue` 支持四种模式 (`menuType`)：

1. **File (文件标签)**
   - 关闭全部 (`closeAll`)
   - 关闭其他 (`closeOthers`)

2. **Tree (文件树)**
   - 新建文件 (`createFile`)
   - 新建文件夹 (`createFolder`)
   - 重命名 (`rename`)
   - 复制路径 (`copyPath`)
   - 在资源管理器中显示 (`showInExplorer`)

3. **Pane (编辑器窗格)**
   - 向右分割 (`splitRight`)
   - 关闭全部 (`closeAll`)
   - 关闭其他 (`closeOthers`)

4. **Editor (编辑器内容)** ⭐ 新增
   - 📋 复制 (`copy`) - 复制选中文本到剪贴板
   - ✂️ 剪切 (`cut`) - 剪切选中文本到剪贴板
   - 📄 粘贴 (`paste`) - 从剪贴板粘贴内容
   - 📝 插入模板 (二级菜单)
     - 💡 插入 Idea 模板 (`insertIdeaTemplate`)

## Editor 菜单详细说明

### 基础编辑功能

#### 复制 (Copy)
- **功能**: 将选中的文本复制到系统剪贴板
- **实现**: 使用 `navigator.clipboard.writeText()` API
- **触发**: 右键菜单选择"复制"或快捷键 Ctrl+C
- **代码位置**: `src/views/Editor.vue` - `handleEditorContextMenuAction()`

#### 剪切 (Cut)
- **功能**: 将选中的文本剪切到系统剪贴板并从编辑器中删除
- **实现**: 调用 CodeMirror 的 `cutSelection()` 方法
- **触发**: 右键菜单选择"剪切"或快捷键 Ctrl+X

#### 粘贴 (Paste)
- **功能**: 从系统剪贴板读取内容并插入到光标位置
- **实现**: 使用 `navigator.clipboard.readText()` 读取，然后调用 `insertText()` 插入
- **触发**: 右键菜单选择"粘贴"或快捷键 Ctrl+V

### 插入模板功能

#### 插入 Idea 模板
- **功能**: 在光标位置插入预定义的 HOI4 Idea 模板代码
- **路径验证**: 
  - ✅ **仅在** `common/ideas/` 目录下的文件中可用
  - ❌ 其他路径会显示错误提示："错误：只能在 common/ideas/ 目录下的文件中插入 Idea 模板"
- **模板内容**:
  ```hoi4
  ideas = {
      country = {
          idea_name = {
              picture = your_image
              allowed = {
                  always = yes
              }
              allowed_civil_war = {
                  always = yes
              }
              modifier = {
              }
          }
      }
  }
  ```
- **实现位置**: `src/views/Editor.vue` - `handleInsertIdeaTemplate()`

## 二级菜单实现

### 展开机制
- **触发方式**: 鼠标悬停 (`@mouseenter`) 在"插入模板"选项上
- **关闭方式**: 鼠标离开 (`@mouseleave`) 该选项
- **状态管理**: 使用 `templateMenuVisible` ref 控制显示/隐藏

### 智能定位
二级菜单会根据主菜单位置自动调整显示位置：

```typescript
const showSubmenuOnLeft = computed(() => {
  const submenuWidth = 180
  const padding = 20
  return props.x + 200 + submenuWidth > window.innerWidth - padding
})
```

- **右侧空间充足**: 二级菜单显示在右侧 (`left-full ml-1`)
- **右侧空间不足**: 二级菜单显示在左侧 (`right-full mr-1`)
- **目的**: 确保菜单始终完全可见，不会溢出屏幕

## 边界检测机制

### 主菜单边界检测
在 `EditorPane.vue` 的 `handleEditorContextMenu()` 中实现：

```typescript
function handleEditorContextMenu(event: MouseEvent) {
  const menuWidth = 200
  const menuHeight = 250
  
  let x = event.clientX
  let y = event.clientY
  
  // 检查右侧边界
  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 10
  }
  
  // 检查底部边界
  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - 10
  }
  
  // 确保不会超出左侧和顶部
  x = Math.max(10, x)
  y = Math.max(10, y)
  
  editorContextMenuX.value = x
  editorContextMenuY.value = y
  editorContextMenuVisible.value = true
}
```

**检测项目**:
- ✅ 右侧边界检测
- ✅ 底部边界检测
- ✅ 左侧边界保护
- ✅ 顶部边界保护
- ✅ 10px 安全边距

## 技术架构

### 事件传递链
```
CodeMirrorEditor (@contextmenu)
    ↓
EditorPane (handleEditorContextMenu)
    ↓
ContextMenu (显示菜单)
    ↓
EditorPane (handleEditorContextMenuAction)
    ↓
EditorGroup (转发事件)
    ↓
Editor.vue (处理操作)
```

### CodeMirror 编辑器操作

在 `CodeMirrorEditor.vue` 中暴露的方法：

```typescript
defineExpose({
  getEditorView: () => editorView,
  getSelectedText: () => string,      // 获取选中文本
  insertText: (text: string) => void, // 插入文本
  getCursorPosition: () => object,     // 获取光标位置
  cutSelection: () => string,          // 剪切选中内容
  copySelection: () => string          // 复制选中内容
})
```

### 剪贴板 API

使用现代浏览器的 Clipboard API：

```typescript
// 写入剪贴板
await navigator.clipboard.writeText(text)

// 读取剪贴板
const text = await navigator.clipboard.readText()
```

**注意事项**:
- 需要用户权限
- HTTPS 环境下可用
- 包含异步错误处理

## 实现细节
- **定位**: 使用 `fixed` 定位，根据鼠标点击坐标 (`x`, `y`) 动态渲染。
- **交互**: 
  - 点击菜单外区域自动关闭 (`@click.stop` 和全屏透明遮罩)
  - 使用 `Teleport` 将遮罩层渲染到 body
- **样式**: 采用磨砂玻璃效果 (`backdrop-blur`) 和深色主题。
- **边界安全**: 自动检测屏幕边界，调整菜单位置防止溢出。
- **响应式**: 适应不同屏幕尺寸和分辨率。

## 使用示例

### 在编辑器中使用右键菜单

1. **复制/剪切/粘贴**：
   - 选中文本
   - 右键点击
   - 选择相应操作

2. **插入 Idea 模板**：
   - 打开 `common/ideas/` 目录下的文件
   - 将光标移动到想要插入的位置
   - 右键点击
   - 选择"插入模板" → "插入 Idea 模板"
   - 模板将插入到光标位置

### 错误处理

- **路径错误**: 在非 `common/ideas/` 目录文件中尝试插入模板会显示警告
- **剪贴板权限**: 剪贴板操作失败时会在控制台输出错误信息
- **编辑器未就绪**: 如果编辑器实例不可用，操作会被忽略

## 相关文件

- `src/components/editor/ContextMenu.vue` - 菜单组件
- `src/components/editor/CodeMirrorEditor.vue` - 编辑器组件
- `src/components/editor/EditorPane.vue` - 编辑器窗格
- `src/components/editor/EditorGroup.vue` - 编辑器组管理
- `src/views/Editor.vue` - 主编辑器视图

