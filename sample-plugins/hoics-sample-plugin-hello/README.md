# HOI4 Code Studio 示例插件：Hello

本目录是一个**可直接安装运行**的示例插件（不需要构建工具）。

## 1. 安装方式

在 HOI4 Code Studio 中：

- 打开：设置 → 扩展 → 插件
- 点击：安装插件
- 选择：本文件夹 `sample-plugins/hoics-sample-plugin-hello`

安装后：

- 左侧栏与右侧栏会出现“插件”标签页
- 你会看到本插件贡献的两个面板：
  - `Hello (Left)`
  - `Hello (Right)`
- 顶部工具栏会出现两个按钮：
  - `Hello(L)`：打开左侧面板
  - `Hello(R)`：打开右侧面板

## 2. 文件结构（模块化）

```text
hoics-sample-plugin-hello/
  About.hoics
  index.html
  src/
    main.js
    core/
      hostBridge.js
      invoke.js
    panels/
      index.js
      left.js
      right.js
    shared/
      dom.js
```

## 3. 重点学习点

- `About.hoics`
  - `main`: 插件入口页面（这里是 index.html）
  - `contributes`: 面板/工具栏贡献点
  - `permissions.commands`: 插件允许调用的后端 command 白名单

- `src/core/invoke.js`
  - 封装 `hoics.invoke` / `hoics.invoke.result` 的 postMessage 调用协议

- `src/core/hostBridge.js`
  - 处理 query 参数
  - 等待宿主握手 `hoics.host.ready`
  - 对外暴露 `invoke()`

- `src/panels/*`
  - 把不同面板的逻辑拆开，避免一个入口文件写成“巨石代码”

## 4. 常见问题

- 安装后提示缺少 About.hoics
  - 确保你选择安装的是这个文件夹本身（根目录包含 About.hoics），不要选到上层目录。

- 调用后端命令返回 Command not allowed
  - 把命令名加入 About.hoics 的 `permissions.commands`，然后重新安装插件。

- iframe 白屏
  - 检查 About.hoics.main 指向的文件是否存在（本示例为 index.html）。
  - 检查是否有资源路径写错（本示例所有路径均为相对路径）。
