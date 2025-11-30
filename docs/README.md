# 文档贡献指南

欢迎查阅 HOI4 Code Studio 项目文档。

## ⚠️ 重要提示

**任何代码修改必须同步更新相关文档！**

为了保持文档的时效性和准确性，如果你修改了代码逻辑、添加了新功能或更改了 API，请务必检查并更新本目录下对应的文档文件。

## 文档结构

- **API/**: API 接口文档
  - [API 概览](./API/README.md): API 文档总览和快速导航
  - [API 快速参考](./API/QUICK_REFERENCE.md): 常用 API 快速查找和代码示例
  - **Frontend API**: 前端接口文档
    - [Tauri API](./API/Frontend/TauriAPI.md): Tauri 桥接接口
    - [组件 API](./API/Frontend/Components.md): Vue 组件接口
    - [组合式函数 API](./API/Frontend/Composables.md): Vue Composables 接口
  - **Backend API**: 后端接口文档
    - [核心模块](./API/Backend/CoreModules.md): Rust 核心模块接口
    - [命令接口](./API/Backend/Commands.md): Tauri 命令接口
    - [数据类型](./API/Backend/DataTypes.md): 数据结构定义
  - **Integration API**: 集成接口文档
    - [集成指南](./API/Integration/README.md): 前后端通信协议和集成方式
- **Frontend/**: 前端相关文档
  - **Editor/**: 编辑器核心功能
    - [错误提示](./Frontend/Editor/ErrorTip.md)
    - [代码高亮](./Frontend/Editor/SyntaxHighlight.md)
    - [依赖项](./Frontend/Editor/Dependencies.md)
    - [自动补全](./Frontend/Editor/AutoComplete.md)
    - [自动保存](./Frontend/Editor/AutoSave.md)
    - [游戏目录](./Frontend/Editor/GameDirectory.md)
    - [搜索功能](./Frontend/Editor/Search.md)
    - [一键打包](./Frontend/Editor/Build.md)
    - [一键启动](./Frontend/Editor/Launch.md)
    - [右键面板](./Frontend/Editor/ContextMenu.md)
  - [设置页面](./Frontend/Settings.md)
  - [最近项目](./Frontend/RecentProjects.md)
  - [打开项目](./Frontend/OpenProject.md)
  - [创建项目](./Frontend/CreateProject.md)
- **Backend/**: 后端相关文档
  - [手写 JSON 解析](./Backend/CustomJSONParser.md)
  - [其他 Libs](./Backend/Libs.md)
